import { prisma } from "../config/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genai = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
const insightModel = genai.getGenerativeModel({ model: "models/gemini-2.0-flash" });

export const insightService = {
  async analyzeProgress(userId: string) {

    const progressEntries = await prisma.progress.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (progressEntries.length === 0) {
      return {
        status: "no-data",
        message: "No progress data available",
      };
    }

    const aiInput = progressEntries.map((entry) => ({
      date: entry.createdAt,
      weight: entry.weight,
      bodyFat: entry.bodyFat,
      muscleMass: entry.muscleMass,
      waistCircumference: entry.waistCircumference,
      restingHeartRate: entry.restingHeartRate,
      sleepHours: entry.sleepHours,
      proteinIntake: entry.proteinIntake,
      cardioMinutes: entry.cardioMinutes,
      stressLevel: entry.stressLevel,
      workoutFrequency: entry.workoutFrequency,
      workoutDuration: entry.workoutDuration,
    }));

    const prompt = `
You are a fitness AI. Analyze the user progress data below and return a single JSON object.

STRICT RULES:
- Return ONLY the JSON object, nothing else
- No markdown, no code blocks, no explanation
- All string fields must use EXACTLY one of the allowed values listed

JSON format:
{
  "overview": "<1-2 sentence plain text summary>",
  "bodyComposition": {
    "weightTrend": "<exactly one of: up, down, stable>",
    "muscleMassStatus": "<exactly one of: improving, stable, declining>",
    "bodyFatStatus": "<exactly one of: improving, stable, worsening>",
    "waistCircumferenceTrend": "<exactly one of: decreasing, stable, increasing>"
  },
  "vitals": {
    "restingHeartRateStatus": "<exactly one of: good, needs-attention>",
    "sleepQuality": "<exactly one of: good, adequate, poor>"
  },
  "lifestyle": {
    "trainingConsistency": "<exactly one of: good, average, poor>",
    "proteinIntakeStatus": "<exactly one of: sufficient, needs-increase>",
    "cardioLevel": "<exactly one of: good, adequate, low>",
    "stressLevel": "<exactly one of: low, moderate, high>"
  },
  "strengths": ["<string>", "<string>"],
  "concerns": ["<string>", "<string>"],
  "recommendations": ["<string>", "<string>", "<string>"]
}

Progress data (most recent first):
${JSON.stringify(aiInput, null, 2)}
`;

    const result = await insightModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
        maxOutputTokens: 1500,
        thinkingConfig: { thinkingBudget: 0 },
      },
    } as any);

    const candidate = result.response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const raw = result.response.text().trim();
    console.log("FINISH_REASON:", finishReason);
    console.log("RAW_INSIGHT_RESPONSE:", raw);

    const aiText = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let insights;
    try {
      insights = JSON.parse(aiText);
      console.log("PARSED_INSIGHTS:", JSON.stringify(insights, null, 2));
    } catch (error) {
      console.error("AI JSON parse failed — raw output was:\n", aiText);
      return {
        status: "error",
        message: "AI returned invalid JSON",
      };
    }

    return {
      status: "success",
      insights,
      rawData: progressEntries,
    };
  },
};
