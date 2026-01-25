import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import crypto from "crypto";

export const progressService = {
  async getProgressHistory(userId: string) {
    return prisma.progress.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async createOrUpdateProgress(userId: string, data: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.progress.findFirst({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
    });

    if (existing) {
      throw new Error("Progress already updated today");
    }

    // 1️⃣ Save progress
    const progress = await prisma.progress.create({
      data: {
        userId,
        ...data,
      },
    });

    // 2️⃣ Convert progress → text
    const text = `
Date: ${progress.createdAt}
Weight: ${progress.weight} kg
Body Fat: ${progress.bodyFat} %
Muscle Mass: ${progress.muscleMass ?? "N/A"}
Waist: ${progress.waistCircumference ?? "N/A"} cm
Blood Pressure: ${progress.systolicBP}/${progress.diastolicBP}
Heart Rate: ${progress.restingHeartRate}
Fasting Sugar: ${progress.fastingSugar ?? "N/A"}
Post Prandial Sugar: ${progress.postPrandialSugar ?? "N/A"}
HbA1c: ${progress.hba1c ?? "N/A"}
Cholesterol: LDL ${progress.ldl ?? "N/A"}, HDL ${progress.hdl ?? "N/A"}
Triglycerides: ${progress.triglycerides ?? "N/A"}
Workout Frequency: ${progress.workoutFrequency} times/week
Workout Duration: ${progress.workoutDuration} minutes
Cardio Minutes: ${progress.cardioMinutes}
Sleep: ${progress.sleepHours} hours
Stress Level: ${progress.stressLevel}
Notes: ${progress.notes ?? "None"}
`;

    // 3️⃣ Create embedding
    const embedding = await createEmbedding(text);

    // 4️⃣ Insert embedding safely (NO string building)
    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding"
        (id, "userId", source, content, embedding)
      VALUES
        (${crypto.randomUUID()}, ${userId}, 'progress', ${text}, ${embedding}::vector)
    `;

    return progress;
  },
};
