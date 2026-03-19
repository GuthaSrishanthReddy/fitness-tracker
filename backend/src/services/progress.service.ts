import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { embeddingStoreService } from "./embeddingStore.service";
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingToday = await prisma.progress.findFirst({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const lastProgress = await prisma.progress.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const mergedData = { ...data };
    const baseProgress = existingToday ?? lastProgress;

    if (baseProgress) {
      for (const key of Object.keys(baseProgress)) {
        if (key !== "id" && key !== "userId" && key !== "createdAt" && key !== "updatedAt") {
          if (mergedData[key] === undefined || mergedData[key] === null) {
            mergedData[key] = (baseProgress as any)[key];
          }
        }
      }
    } else {
      mergedData.restingHeartRate = mergedData.restingHeartRate ?? 70;
      mergedData.workoutFrequency = mergedData.workoutFrequency ?? 3;
      mergedData.workoutDuration = mergedData.workoutDuration ?? 45;
    }

    // Save progress: update today's entry if it exists, otherwise create a new one.
    const progress = existingToday
      ? await prisma.progress.update({
          where: { id: existingToday.id },
          data: mergedData,
        })
      : await prisma.progress.create({
          data: {
            userId,
            ...mergedData,
          },
        });

    const text = `
Date: ${progress.createdAt}
Weight: ${progress.weight} kg
Waist Circumference: ${progress.waistCircumference} cm
Blood Pressure: ${progress.systolicBP ?? "N/A"}/${progress.diastolicBP ?? "N/A"} mmHg
Body Fat: ${progress.bodyFat ?? "N/A"} %
Muscle Mass: ${progress.muscleMass ?? "N/A"} kg
Resting Heart Rate: ${progress.restingHeartRate} bpm
Sleep Hours: ${progress.sleepHours} hours
Protein Intake: ${progress.proteinIntake} g
Cardio Minutes: ${progress.cardioMinutes} minutes
Stress Level: ${progress.stressLevel} / 5
Workout Frequency: ${progress.workoutFrequency ?? "N/A"} times/week
Workout Duration: ${progress.workoutDuration ?? "N/A"} minutes
Notes: ${progress.notes ?? "None"}
`;

    const hasProgressEmbedding = await embeddingStoreService.hasExactContent(
      userId,
      "progress",
      text
    );
    if (!hasProgressEmbedding) {
      const embedding = await createEmbedding(text);
      await prisma.$executeRaw`
        INSERT INTO "DocumentEmbedding"
          (id, "userId", source, content, embedding)
        VALUES
          (${crypto.randomUUID()}, ${userId}, 'progress', ${text}, ${embedding}::vector)
      `;
    }

    return progress;
  },
};
