import { prisma } from "../config/db";
import { ActivityType, FitnessGoal, FitnessLevel } from "@prisma/client";
import { createEmbedding } from "./embedding.service";
import { embeddingStoreService } from "./embeddingStore.service";
import crypto from "crypto";

export const userService = {
  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
  },

  async updateMe(userId: string, data: any) {
    const allowed: Record<string, unknown> = {};

    if (typeof data?.name === "string" && data.name.trim().length > 0) {
      allowed.name = data.name.trim();
    }

    if (data?.fitnessGoal && Object.values(FitnessGoal).includes(data.fitnessGoal)) {
      allowed.fitnessGoal = data.fitnessGoal;
    }

    if (data?.fitnessLevel && Object.values(FitnessLevel).includes(data.fitnessLevel)) {
      allowed.fitnessLevel = data.fitnessLevel;
    }

    if (data?.activityType && Object.values(ActivityType).includes(data.activityType)) {
      allowed.activityType = data.activityType;
    }

    if (Object.keys(allowed).length === 0) {
      const err = new Error("No valid fields provided") as Error & {
        statusCode?: number;
      };
      err.statusCode = 400;
      throw err;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: allowed
    });
    const { password: _password, ...safeUser } = user;
    return safeUser;
  },

  async setup(userId: string, data: any) {
    const { fitnessGoal, fitnessLevel, activityType, progress } = data;

    // Validate fitness details
    if (!fitnessGoal || !Object.values(FitnessGoal).includes(fitnessGoal)) {
      const err = new Error("Invalid fitness goal") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    if (!fitnessLevel || !Object.values(FitnessLevel).includes(fitnessLevel)) {
      const err = new Error("Invalid fitness level") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    if (!activityType || !Object.values(ActivityType).includes(activityType)) {
      const err = new Error("Invalid activity type") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // Validate progress data
    if (!progress || typeof progress !== "object") {
      const err = new Error("Invalid progress data") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const {
      weight,
      waistCircumference,
      systolicBP,
      diastolicBP,
      restingHeartRate,
      sleepHours,
      proteinIntake,
      cardioMinutes,
      stressLevel,
      bodyFat,
      muscleMass,
      workoutFrequency,
      workoutDuration
    } = progress;

    // Validate mandatory fields
    if (weight === undefined || weight === null || waistCircumference === undefined || waistCircumference === null ||
        restingHeartRate === undefined || restingHeartRate === null || sleepHours === undefined || sleepHours === null ||
        proteinIntake === undefined || proteinIntake === null || cardioMinutes === undefined || cardioMinutes === null ||
        stressLevel === undefined || stressLevel === null) {
      const err = new Error("Missing mandatory progress fields") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    // Update user with fitness details
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fitnessGoal,
        fitnessLevel,
        activityType
      }
    });

    // Create initial progress record
    const progressRecord = await prisma.progress.create({
      data: {
        userId,
        weight: Number(weight),
        waistCircumference: Number(waistCircumference),
        systolicBP: systolicBP !== undefined && systolicBP !== null ? Number(systolicBP) : null,
        diastolicBP: diastolicBP !== undefined && diastolicBP !== null ? Number(diastolicBP) : null,
        restingHeartRate: Number(restingHeartRate),
        sleepHours: Number(sleepHours),
        proteinIntake: Number(proteinIntake),
        cardioMinutes: Number(cardioMinutes),
        stressLevel: Number(stressLevel),
        bodyFat: bodyFat !== undefined && bodyFat !== null ? Number(bodyFat) : null,
        muscleMass: muscleMass !== undefined && muscleMass !== null ? Number(muscleMass) : null,
        workoutFrequency: workoutFrequency !== undefined && workoutFrequency !== null ? Number(workoutFrequency) : null,
        workoutDuration: workoutDuration !== undefined && workoutDuration !== null ? Number(workoutDuration) : null
      }
    });

    // Create embedding for progress
    const text = `
Date: ${progressRecord.createdAt}
Weight: ${progressRecord.weight} kg
Waist Circumference: ${progressRecord.waistCircumference} cm
Blood Pressure: ${progressRecord.systolicBP ?? "N/A"}/${progressRecord.diastolicBP ?? "N/A"} mmHg
Body Fat: ${progressRecord.bodyFat ?? "N/A"} %
Muscle Mass: ${progressRecord.muscleMass ?? "N/A"} kg
Resting Heart Rate: ${progressRecord.restingHeartRate} bpm
Sleep Hours: ${progressRecord.sleepHours} hours
Protein Intake: ${progressRecord.proteinIntake} g
Cardio Minutes: ${progressRecord.cardioMinutes} minutes
Stress Level: ${progressRecord.stressLevel} / 5
Workout Frequency: ${progressRecord.workoutFrequency ?? "N/A"} times/week
Workout Duration: ${progressRecord.workoutDuration ?? "N/A"} minutes
`;

    const embedding = await createEmbedding(text);
    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding"
        (id, "userId", source, content, embedding)
      VALUES
        (${crypto.randomUUID()}, ${userId}, 'progress', ${text}, ${embedding}::vector)
    `;

    const { password: _password, ...safeUser } = user;
    return { user: safeUser, progress: progressRecord };
  }
};
