import { z } from "zod";

export const progressSchema = z.object({
  // Mandatory fields
  weight: z.number().min(20).max(300, "Weight must be between 20-300 kg"),
  waistCircumference: z.number().min(40).max(200, "Waist circumference must be between 40-200 cm"),
  systolicBP: z.number().int().min(70).max(250, "Systolic BP must be between 70-250").optional(),
  diastolicBP: z.number().int().min(40).max(150, "Diastolic BP must be between 40-150").optional(),
  restingHeartRate: z.number().min(30).max(200, "Resting heart rate must be between 30-200 bpm"),
  sleepHours: z.number().min(0).max(24, "Sleep hours must be between 0-24"),
  proteinIntake: z.number().min(0).max(400, "Protein intake must be between 0-400g"),
  cardioMinutes: z.number().min(0).max(1000, "Cardio minutes must be between 0-1000"),
  stressLevel: z.number().min(1).max(5, "Stress level must be between 1-5"),

  // Optional fields
  bodyFat: z.number().min(2).max(70).optional(),
  muscleMass: z.number().min(5).max(80).optional(),
  workoutFrequency: z.number().min(0).max(14).optional(),
  workoutDuration: z.number().min(0).max(300).optional(),

  // Notes
  notes: z.string().max(1000).optional()
});
