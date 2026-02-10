import { log } from "console";
import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";
import crypto from "crypto";

export const aiPlanService = {
  parsePlanItems(raw: string) {
    const extractJson = (text: string) => {
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const unfenced = fenceMatch ? fenceMatch[1] : text;
      const cleaned = unfenced
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();
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
      return end >= start ? cleaned.slice(start, end + 1).trim() : cleaned.slice(start).trim();
    };

    const jsonText = extractJson(raw);
    let planItems: Array<{ workout: string; setsReps: string; notes: string }> = [];
    try {
      const parsed = JSON.parse(jsonText);
      planItems = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      planItems = [
      ];
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

    const prompt = `
You are a helpful fitness assistant.
Use the user's progress history and routine history to generate a concise workout plan.

Return ONLY valid JSON in this exact shape:
[
  { "workout": "Squats", "setsReps": "2 x 12", "notes": "Light weight, focus on form" }
]

Progress history:
${historyText}

Routine history:
${routineText}
Generate a workout plan based on the above information.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    console.log("RAW_PLAN_RESPONSE:", raw);


    const planItems = aiPlanService.parsePlanItems(raw);
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
