import { prisma } from "../config/db";
import { model } from "./model.service";

export const insightService = {
  async analyzeProgress(userId: string) {

    // Fetch latest progress entries

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
      You are a fitness AI analyzing user progress data.

      Analyze the LAST 5 progress entries and return ONLY valid JSON
      in the exact format below. Do not include explanations or markdown.

      {
        "overview": "short summary",
        "bodyComposition": {
          "weightTrend": "up | down | stable",
          "muscleMassStatus": "improving | stable | declining",
          "bodyFatStatus": "improving | stable | worsening",
          "waistCircumferenceTrend": "decreasing | stable | increasing"
        },
        "vitals": {
          "restingHeartRateStatus": "good | needs-attention",
          "sleepQuality": "good | adequate | poor"
        },
        "lifestyle": {
          "trainingConsistency": "good | average | poor",
          "proteinIntakeStatus": "sufficient | needs-increase",
          "cardioLevel": "good | adequate | low",
          "stressLevel": "low | moderate | high"
        },
        "strengths": ["..."],
        "concerns": ["..."],
        "recommendations": ["..."]
      }

      Rules:
      - Focus on progress and consistency
      - Base conclusions ONLY on provided data
      - Keep text concise and actionable

      Progress data:
      ${JSON.stringify(aiInput)}
      `;


    const result = await model.generateContent(prompt);
    const aiText = result.response.text();


    let insights;
    try {
      insights = JSON.parse(aiText);
    } catch (error) {
      console.error("AI JSON parse failed:", aiText);
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
