import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";
import crypto from "crypto";

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
    let planItems: Array<{ workout: string; setsReps: string; notes: string }> =
      [];
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
        const items: Array<{ workout: string; setsReps: string; notes: string }> =
          [];
        const itemRegex =
          /"workout"\s*:\s*"([^"]+)"[\s\S]*?"(?:setsReps|sets x reps|sets_reps|sets)"\s*:\s*"([^"]*)"[\s\S]*?"notes"\s*:\s*"([^"]*)"/gi;
        let match: RegExpExecArray | null;
        while ((match = itemRegex.exec(cleaned)) !== null) {
          items.push({
            workout: match[1],
            setsReps: match[2],
            notes: match[3],
          });
        }
        planItems = items;
      }
    }
    return planItems;
  },

  async getLatestPlan(userId: string) {
    const latest = await prisma.documentEmbedding.findFirst({
      where: {
        userId,
        source: "plan",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latest) return [];
    return aiPlanService.parsePlanItems(latest.content);
  },

  async generatePlan(userId: string) {
    const progressHistory = await prisma.documentEmbedding.findMany({
      where: {
        userId,
        source: "progress",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    const routineHistory = await prisma.documentEmbedding.findMany({
      where: {
        userId,
        source: "routine",
      },
      orderBy: {
        createdAt: "desc",
      },
    });



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
[
  { "workout": "Squats", "setsReps": "2 x 12", "notes": "Light weight, focus on form" }
]

Progress history:
${limitedHistory}

Routine history:
${limitedRoutine}
Generate a workout plan based on the above information.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    console.log("RAW_PLAN_RESPONSE:", raw);

    let planItems = aiPlanService.parsePlanItems(raw);
    if (planItems.length === 0) {
      const retryPrompt = `
Return ONLY valid JSON (no code fences, no extra text) in this exact shape:
[
  { "workout": "Squats", "setsReps": "2 x 12", "notes": "Light weight, focus on form" }
]

If you cannot use the history, return a generic beginner full-body plan with 5 items.
`;
      const retry = await model.generateContent(retryPrompt);
      const retryRaw = retry.response.text().trim();
      console.log("RAW_PLAN_RESPONSE_RETRY:", retryRaw);
      planItems = aiPlanService.parsePlanItems(retryRaw);
    }
    console.log("Generated plan items:", planItems);
    const planText = JSON.stringify(planItems);
    const planEmbedding = await createEmbedding(planText);

    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding"
        (id, "userId", source, content, embedding)
      VALUES
        (${crypto.randomUUID()}, ${userId}, 'plan', ${planText}, ${planEmbedding}::vector)
    `;

    return planItems;
  },
};
