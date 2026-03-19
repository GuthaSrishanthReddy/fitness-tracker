export interface ProgressInput {
  // Mandatory fields
  weight: number;
  waistCircumference: number;
  restingHeartRate: number;
  sleepHours: number;
  proteinIntake: number;
  cardioMinutes: number;
  stressLevel: number;
  // Optional fields
  bodyFat?: number;
  muscleMass?: number;
  workoutFrequency?: number;
  workoutDuration?: number;
  notes?: string;
}

export interface ProgressRecord extends ProgressInput {
  id: string;
  userId: string;
  createdAt: string;
}
