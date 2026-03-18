import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";
import { embeddingStoreService } from "./embeddingStore.service";
import { planTemplate } from "../utils/constants";
import crypto from "crypto";
import { retrieveContextBySources } from "./rag.retrieve";

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
  focus: string;
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

const isTokenLimitError = (error: unknown): boolean => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).toLowerCase()
      : "";

  return (
    message.includes("token") &&
    (message.includes("limit") ||
      message.includes("exceed") ||
      message.includes("too many") ||
      message.includes("context"))
  );
};

const isRateLimitError = (error: unknown): boolean => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).toLowerCase()
      : "";

  return (
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("too many requests") ||
    message.includes("429")
  );
};

const isTimeoutError = (error: unknown): boolean => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).toLowerCase()
      : "";
  return message.includes("timed out") || message.includes("timeout");
};

const summarizeError = (error: unknown): string => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).trim()
      : "";
  if (!message) return "";
  return message.length > 120 ? `${message.slice(0, 117)}...` : message;
};

const generatePlanContent = async (prompt: string) => {
  const timeoutMs = 25000;
  const response = model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 900,
    },
  } as any);

  return Promise.race([
    response,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Plan generation timed out")), timeoutMs)
    ),
  ]);
};

const groupPlanByDay = (
  flatItems: Array<{
    day: WeekDay;
    focus: string;
    workoutName: string;
    setsReps: string;
    notes: string;
  }>
): PlanItem[] => {
  const grouped = new Map<WeekDay, { focus: string; workouts: PlanWorkout[] }>();

  for (const item of flatItems) {
    if (!grouped.has(item.day)) {
      grouped.set(item.day, { focus: item.focus, workouts: [] });
    }
    const existing = grouped.get(item.day)!;
    if (!existing.focus && item.focus) {
      existing.focus = item.focus;
    }
    existing.workouts.push({
      workoutName: item.workoutName,
      setsReps: item.setsReps,
      notes: item.notes,
    });
  }

  return WEEK_DAYS.filter((day) => grouped.has(day)).map((day) => ({
    day,
    focus: grouped.get(day)!.focus || "General",
    workouts: grouped.get(day)!.workouts,
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
      focus?: string;
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
          focus?: string;
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
      const focus = String(item.focus ?? "").trim();

      if (Array.isArray(item.workouts)) {
        return item.workouts.map((workout) => ({
          day,
          focus,
          workoutName: String(workout.workoutName ?? workout.workout ?? "").trim(),
          setsReps: String(workout.setsReps ?? workout.sets ?? "").trim(),
          notes: String(workout.notes ?? "").trim(),
        }));
      }

      return [
        {
          day,
          focus,
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
    const retrievedContext = await retrieveContextBySources(
      userId,
      "Generate an optimal weekly workout plan from latest progress and previous plan data.",
      ["progress", "plan"],
      4,
      1800
    );


    const prompt = `
Return ONLY valid JSON in this exact schema:
${planTemplate}

Rules:
- Use key "focus" (lowercase).
- Read "workoutFrequency" and "workoutDuration" from user context.
- Training days in the week must equal workoutFrequency (cap to 1-7).
- Remaining days must be { "focus": "Rest", "workouts": [] }.
- Match session size to workoutDuration: <=45 min: 4 workouts, 46-70 min: 5 workouts, >70 min: 6 workouts.
- Keep exercise choice aligned with user goal and level from context.
- If context is missing, return a safe beginner 3-day full-body plan + rest days.

User context:
${retrievedContext || "none"}
`;

    let planItems: PlanItem[] = [];
    let modelFailure: unknown;
    let tokenLimitExceeded = false;
    let rateLimitExceeded = false;
    let timeoutExceeded = false;
    try {
      const result = await generatePlanContent(prompt);
      const raw = result.response.text().trim();
      console.log("RAW_PLAN_RESPONSE:", raw);
      planItems = aiPlanService.parsePlanItems(raw);
    } catch (error) {
      modelFailure = error;
      tokenLimitExceeded = isTokenLimitError(error);
      rateLimitExceeded = isRateLimitError(error);
      timeoutExceeded = isTimeoutError(error);
      console.error("Plan generation model call failed", error);
    }

    if (planItems.length === 0) {
      const retryPrompt = `
Return ONLY valid JSON, no markdown, no extra text.
Schema:
${planTemplate}

Strict rules:
- Use "focus" (lowercase).
- Use workoutFrequency and workoutDuration from context if available.
- Fill non-training days as Rest with empty workouts.
- If context is missing, return a beginner 3-day full-body plan + rest days.
`;
      try {
        const retry = await generatePlanContent(retryPrompt);
        const retryRaw = retry.response.text().trim();
        console.log("RAW_PLAN_RESPONSE_RETRY:", retryRaw);
        planItems = aiPlanService.parsePlanItems(retryRaw);
      } catch (error) {
        modelFailure = error;
        tokenLimitExceeded = tokenLimitExceeded || isTokenLimitError(error);
        rateLimitExceeded = rateLimitExceeded || isRateLimitError(error);
        timeoutExceeded = timeoutExceeded || isTimeoutError(error);
        console.error("Plan generation retry failed", error);
      }
    }
    if (planItems.length === 0) {
      const failureBanner = rateLimitExceeded
        ? "Rate limit exceeded while generating your plan. Please wait and try again."
        : tokenLimitExceeded
        ? "Token limit exceeded while generating your plan. Please try again shortly."
        : timeoutExceeded
        ? "Plan generation timed out. Please try again."
        : summarizeError(modelFailure)
        ? `Plan generation failed: ${summarizeError(modelFailure)}`
        : "Plan generation failed due to an AI service error. Showing your previous plan.";

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
          banner: failureBanner,
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
          banner: failureBanner,
        };
      }

      const details =
        modelFailure && typeof modelFailure === "object" && "message" in (modelFailure as any)
          ? String((modelFailure as any).message)
          : "";
      const err = new Error(
        rateLimitExceeded
          ? "Rate limit exceeded. Please wait and try again."
          : tokenLimitExceeded
          ? "Token limit exceeded. Please reduce context size and try again."
          : timeoutExceeded
          ? "Plan generation timed out. Please try again."
          : details
          ? `Failed to generate a valid AI workout plan: ${details}`
          : "Failed to generate a valid AI workout plan"
      ) as Error & {
        statusCode?: number;
      };
      err.statusCode = rateLimitExceeded ? 429 : tokenLimitExceeded ? 413 : 502;
      throw err;
    }

    console.log("Generated plan items:", planItems);
    const planText = JSON.stringify(planItems);

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

    // Keep response latency low by storing embeddings in the background.
    void (async () => {
      try {
        const hasPlanEmbedding = await embeddingStoreService.hasExactContent(
          userId,
          "plan",
          planText
        );
        if (hasPlanEmbedding) return;

        const planEmbedding = await createEmbedding(planText);
        await prisma.$executeRaw`
          INSERT INTO "DocumentEmbedding"
            (id, "userId", source, content, embedding)
          VALUES
            (${crypto.randomUUID()}, ${userId}, 'plan', ${planText}, ${planEmbedding}::vector)
        `;
      } catch (error) {
        console.error("Plan embedding background write failed", error);
      }
    })();

    return {
      plan: planItems,
      usedFallback: false,
    };
  },
};
