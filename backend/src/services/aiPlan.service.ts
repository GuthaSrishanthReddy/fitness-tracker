import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";
import { embeddingStoreService } from "./embeddingStore.service";
import { planTemplate } from "../utils/constants";
import crypto from "crypto";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type WeekDay = (typeof WEEK_DAYS)[number];
type PlanWorkout = {
  workoutName: string;
  setsReps: string;
  notes: string;
};

type PlanItem = {
  day: WeekDay;
  workouts: PlanWorkout[];
};
export type PlanGenerationResult = {
  plan: PlanItem[];
  usedFallback: boolean;
  banner?: string;
};

const normalizeDay = (value: unknown, index: number): WeekDay => {
  const fallback = WEEK_DAYS[index % WEEK_DAYS.length];
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().toLowerCase();
  const matched = WEEK_DAYS.find((d) => d.toLowerCase() === cleaned);
  return matched ?? fallback;
};

const generatePlanContent = async (prompt: string) => {
  return model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  } as any);
};

const groupPlanByDay = (
  flatItems: Array<{
    day: WeekDay;
    workoutName: string;
    setsReps: string;
    notes: string;
  }>
): PlanItem[] => {
  const grouped = new Map<WeekDay, PlanWorkout[]>();

  for (const item of flatItems) {
    if (!grouped.has(item.day)) {
      grouped.set(item.day, []);
    }
    grouped.get(item.day)!.push({
      workoutName: item.workoutName,
      setsReps: item.setsReps,
      notes: item.notes,
    });
  }

  return WEEK_DAYS.filter((day) => grouped.has(day)).map((day) => ({
    day,
    workouts: grouped.get(day)!,
  }));
};

export const aiPlanService = {
  parsePlanItems(raw: string) {
    const normalize = (text: string) =>
      text
        .replace(/[“”]/g, "\"")
        .replace(/[‘’]/g, "'")
        .replace(/^\s*json\s*/i, "")
        .trim();

    const extractJson = (text: string) => {
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const unfenced = fenceMatch ? fenceMatch[1] : text;
      const cleaned = normalize(
        unfenced.replace(/^```(?:json)?/i, "").replace(/```$/i, "")
      );
      const firstArray = cleaned.indexOf("[");
      const firstObj = cleaned.indexOf("{");
      const start =
        firstArray === -1
          ? firstObj
          : firstObj === -1
          ? firstArray
          : Math.min(firstArray, firstObj);
      if (start === -1) return cleaned;
      const lastArray = cleaned.lastIndexOf("]");
      const lastObj = cleaned.lastIndexOf("}");
      const end =
        lastArray === -1
          ? lastObj
          : lastObj === -1
          ? lastArray
          : Math.max(lastArray, lastObj);
      return end >= start
        ? cleaned.slice(start, end + 1).trim()
        : cleaned.slice(start).trim();
    };

    const jsonText = extractJson(raw);
    let planItems: Array<{
      day?: string;
      workouts?: Array<{
        workoutName?: string;
        workout?: string;
        setsReps?: string;
        sets?: string;
        notes?: string;
      }>;
      workoutName?: string;
      workout?: string;
      setsReps?: string;
      sets?: string;
      notes?: string;
    }> = [];
    try {
      const parsed = JSON.parse(jsonText);
      planItems = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Attempt simple repair: close missing brackets/braces
      let repaired = jsonText;
      if (repaired.startsWith("[") && !repaired.endsWith("]")) repaired += "]";
      if (repaired.startsWith("{") && !repaired.endsWith("}")) repaired += "}";

      try {
        const parsed = JSON.parse(repaired);
        planItems = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Last-resort regex extraction
        const cleaned = normalize(raw);
        const items: Array<{
          day?: string;
          workoutName: string;
          setsReps: string;
          notes: string;
        }> = [];
        const itemRegex =
          /(?:"day"\s*:\s*"([^"]*)")?[\s\S]*?"(?:workoutName|workout)"\s*:\s*"([^"]+)"[\s\S]*?"(?:setsReps|sets x reps|sets_reps|sets)"\s*:\s*"([^"]*)"[\s\S]*?"notes"\s*:\s*"([^"]*)"/gi;
        let match: RegExpExecArray | null;
        while ((match = itemRegex.exec(cleaned)) !== null) {
          items.push({
            day: match[1],
            workoutName: match[2],
            setsReps: match[3],
            notes: match[4],
          });
        }
        planItems = items;
      }
    }

    const normalizedFlat = planItems.flatMap((item, idx) => {
      const day = normalizeDay(item.day, idx);

      if (Array.isArray(item.workouts)) {
        return item.workouts.map((workout) => ({
          day,
          workoutName: String(workout.workoutName ?? workout.workout ?? "").trim(),
          setsReps: String(workout.setsReps ?? workout.sets ?? "").trim(),
          notes: String(workout.notes ?? "").trim(),
        }));
      }

      return [
        {
          day,
          workoutName: String(item.workoutName ?? item.workout ?? "").trim(),
          setsReps: String(item.setsReps ?? item.sets ?? "").trim(),
          notes: String(item.notes ?? "").trim(),
        },
      ];
    });

    return groupPlanByDay(
      normalizedFlat.filter((item) => item.workoutName.length > 0)
    );
  },

  async getLatestPlan(userId: string) {
    const latest = await embeddingStoreService.getLatestBySource(userId, "plan");

    if (!latest) return [];
    return aiPlanService.parsePlanItems(latest.content);
  },

  async generatePlan(userId: string): Promise<PlanGenerationResult> {
    const progressHistory = await embeddingStoreService.getBySource(
      userId,
      "progress",
      "desc"
    );

    const routineHistory = await embeddingStoreService.getBySource(
      userId,
      "routine",
      "desc"
    );

    const historyText = progressHistory.map((row) => row.content).join("\n");
    const routineText = routineHistory.map((row) => row.content).join("\n");
    const truncate = (text: string, max: number) =>
      text.length > max ? `${text.slice(0, max)}\n...` : text;

    const limitedHistory = truncate(historyText, 3500);
    const limitedRoutine = truncate(routineText, 1500);


    const prompt = `
You are a helpful fitness assistant.
Use the user's progress history and routine history to generate a concise workout plan.

Return ONLY valid JSON in this exact shape:
${planTemplate}

add the workouts based on the user's progress and routine history, but if the history is not usable, generate a balanced beginner full-body workout plan with 5 items per day. Focus on compound movements and include clear sets/reps and notes for each exercise.
only use the variations that are optimal, famous.
Generate the plan based on the workout frequency per week

Progress history:
${limitedHistory}

Routine history:
${limitedRoutine}
Generate a workout plan based on the above information.`;

    let planItems: PlanItem[] = [];
    let latestRaw = "";
    let modelFailure: unknown;
    try {
      const result = await generatePlanContent(prompt);
      const raw = result.response.text().trim();
      latestRaw = raw;
      console.log("RAW_PLAN_RESPONSE:", raw);
      planItems = aiPlanService.parsePlanItems(raw);
    } catch (error) {
      modelFailure = error;
      console.error("Plan generation model call failed", error);
    }

    if (planItems.length === 0) {
      const retryPrompt = `
Return ONLY valid JSON (no code fences, no extra text) in this exact shape:
[
  {
    "day": "Monday",
    "workouts": [
      { "workoutName": "Squats", "setsReps": "2 x 12", "notes": "Light weight, focus on form" }
    ]
  }
]

If you cannot use the history, return a generic beginner full-body plan with 5 items and include day for each item. use all the details you can use .
`;
      try {
        const retry = await generatePlanContent(retryPrompt);
        const retryRaw = retry.response.text().trim();
        latestRaw = retryRaw;
        console.log("RAW_PLAN_RESPONSE_RETRY:", retryRaw);
        planItems = aiPlanService.parsePlanItems(retryRaw);
      } catch (error) {
        modelFailure = error;
        console.error("Plan generation retry failed", error);
      }
    }

    if (planItems.length === 0 && latestRaw) {
      const repairPrompt = `
Convert this workout-plan response into strict valid JSON only.

Required output schema:
[
  {
    "day": "Monday",
    "workouts": [
      { "workoutName": "Squats", "setsReps": "2 x 12", "notes": "Light weight, focus on form" }
    ]
  }
]

Rules:
- Output only JSON array.
- Use one item per workout day.
- Keep original meaning, do not invent medical claims.
- Ensure each workout's "workoutName" is never empty.

Input to convert:
${latestRaw}
`;
      try {
        const repaired = await generatePlanContent(repairPrompt);
        const repairedRaw = repaired.response.text().trim();
        console.log("RAW_PLAN_RESPONSE_REPAIRED:", repairedRaw);
        planItems = aiPlanService.parsePlanItems(repairedRaw);
      } catch (error) {
        modelFailure = error;
        console.error("Plan generation repair failed", error);
      }
    }

    if (planItems.length === 0) {
      // Fallback: if generation failed, return previous available plan without storing anything new.
      const previousPlan = await prisma.plan.findUnique({
        where: { userId },
        select: { workoutPlan: true },
      });

      const previousFromPlanTable = previousPlan?.workoutPlan
        ? aiPlanService.parsePlanItems(previousPlan.workoutPlan)
        : [];

      if (previousFromPlanTable.length > 0) {
        return {
          plan: previousFromPlanTable,
          usedFallback: true,
          banner: "could not generate a new plan :(",
        };
      }

      const latestEmbedding = await embeddingStoreService.getLatestBySource(userId, "plan");
      const previousFromEmbedding = latestEmbedding
        ? aiPlanService.parsePlanItems(latestEmbedding.content)
        : [];

      if (previousFromEmbedding.length > 0) {
        return {
          plan: previousFromEmbedding,
          usedFallback: true,
          banner: "AI generation failed. Showing your last available plan.",
        };
      }

      const details =
        modelFailure && typeof modelFailure === "object" && "message" in (modelFailure as any)
          ? String((modelFailure as any).message)
          : "";
      const err = new Error(
        details
          ? `Failed to generate a valid AI workout plan: ${details}`
          : "Failed to generate a valid AI workout plan"
      ) as Error & {
        statusCode?: number;
      };
      err.statusCode = 502;
      throw err;
    }

    console.log("Generated plan items:", planItems);
    const planText = JSON.stringify(planItems);
    const planEmbedding = await createEmbedding(planText);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fitnessGoal: true,
        activityType: true,
        fitnessLevel: true,
      },
    });

    if (!user) {
      const err = new Error("User not found") as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const existingPlan = await prisma.plan.findUnique({
      where: { userId },
      select: {
        calories: true,
        protein: true,
        carbs: true,
        fats: true,
      },
    });

    const defaultMacrosByGoal = {
      FAT_LOSS: { calories: 1800, protein: 140, carbs: 170, fats: 60 },
      WEIGHT_GAIN: { calories: 2600, protein: 160, carbs: 320, fats: 75 },
      MUSCLE_GAIN: { calories: 2400, protein: 165, carbs: 280, fats: 70 },
      MAINTENANCE: { calories: 2100, protein: 140, carbs: 220, fats: 70 },
      STRENGTH_INCREASE: { calories: 2400, protein: 160, carbs: 260, fats: 70 },
      ENDURANCE_INCREASE: { calories: 2300, protein: 140, carbs: 290, fats: 65 },
      FLEXIBILITY: { calories: 2000, protein: 125, carbs: 220, fats: 65 },
      MOBILITY: { calories: 2000, protein: 125, carbs: 220, fats: 65 },
      BALANCE: { calories: 2000, protein: 125, carbs: 220, fats: 65 },
      ATHLETIC_PERFORMANCE: { calories: 2600, protein: 170, carbs: 320, fats: 75 },
      PHYSICAL_REHABILITATION: { calories: 2100, protein: 145, carbs: 220, fats: 70 },
    } as const;

    const fallbackMacros = defaultMacrosByGoal[user.fitnessGoal];
    const calories = existingPlan?.calories ?? fallbackMacros.calories;
    const protein = existingPlan?.protein ?? fallbackMacros.protein;
    const carbs = existingPlan?.carbs ?? fallbackMacros.carbs;
    const fats = existingPlan?.fats ?? fallbackMacros.fats;

    await prisma.plan.upsert({
      where: { userId },
      update: {
        goal: user.fitnessGoal,
        activity: user.activityType,
        level: user.fitnessLevel,
        workoutPlan: planText,
      },
      create: {
        userId,
        goal: user.fitnessGoal,
        activity: user.activityType,
        level: user.fitnessLevel,
        calories,
        protein,
        carbs,
        fats,
        workoutPlan: planText,
      },
    });

    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding"
        (id, "userId", source, content, embedding)
      VALUES
        (${crypto.randomUUID()}, ${userId}, 'plan', ${planText}, ${planEmbedding}::vector)
    `;

    return {
      plan: planItems,
      usedFallback: false,
    };
  },
};
