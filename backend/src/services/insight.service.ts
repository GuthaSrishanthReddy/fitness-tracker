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

      systolicBP: entry.systolicBP,
      diastolicBP: entry.diastolicBP,
      restingHeartRate: entry.restingHeartRate,

      fastingSugar: entry.fastingSugar,
      postPrandialSugar: entry.postPrandialSugar,
      hba1c: entry.hba1c,

      creatinine: entry.creatinine,
      urea: entry.urea,
      uricAcid: entry.uricAcid,

      totalCholesterol: entry.totalCholesterol,
      ldl: entry.ldl,
      hdl: entry.hdl,
      triglycerides: entry.triglycerides,

      proteinIntake: entry.proteinIntake,
      creatineIntake: entry.creatineIntake,

      workoutFrequency: entry.workoutFrequency,
      workoutDuration: entry.workoutDuration,
      cardioMinutes: entry.cardioMinutes,
      sleepHours: entry.sleepHours,
      stressLevel: entry.stressLevel,
    }));


    const prompt = `
      You are a fitness and health AI analyzing user progress data.

      Analyze the LAST 5 progress entries and return ONLY valid JSON
      in the exact format below. Do not include explanations or markdown.

      {
        "overview": "short summary",
        "bodyComposition": {
          "weightTrend": "up | down | stable",
          "muscleMassStatus": "improving | stable | declining",
          "bodyFatStatus": "improving | stable | worsening"
        },
        "healthMarkers": {
          "bloodPressure": "normal | elevated | high",
          "heartRate": "good | needs-attention",
          "sugarStatus": "normal | prediabetic | diabetic",
          "cholesterolStatus": "good | borderline | high",
          "kidneyHealth": "normal | needs-attention"
        },
        "lifestyle": {
          "trainingConsistency": "good | average | poor",
          "recoveryQuality": "good | poor",
          "stressLevel": "low | moderate | high"
        },
        "strengths": ["..."],
        "concerns": ["..."],
        "recommendations": ["..."]
      }

      Rules:
      - Focus on bulking while maintaining health
      - Base conclusions ONLY on provided data
      - Keep text concise and actionable
      - Use medical judgment implicitly, do not explain ranges

      Progress data:
      ${JSON.stringify(aiInput)}
      `;


    const result = await model.invoke(prompt);
    const aiText = result.content as string;


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
      rawData: progressEntries, // useful for charts
    };
  },
};
