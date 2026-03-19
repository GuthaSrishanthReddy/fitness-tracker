export interface ProgressInput {
  // Mandatory fields
  weight?: number;
  waistCircumference?: number;
  systolicBP?: number;
  diastolicBP?: number;
  restingHeartRate?: number;
  sleepHours?: number;
  proteinIntake?: number;
  cardioMinutes?: number;
  stressLevel?: number;
  
  // Optional fields
  bodyFat?: number;
  muscleMass?: number;
  workoutFrequency?: number;
  workoutDuration?: number;
  
  // Notes
  notes?: string;
}
