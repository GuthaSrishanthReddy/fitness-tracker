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

export interface InsightResponse {
  status: "success" | "no-data" | "error";
  message?: string;
  insights?: {
    overview: string;
    bodyComposition: {
      weightTrend: "up" | "down" | "stable";
      muscleMassStatus: "improving" | "stable" | "declining";
      bodyFatStatus: "improving" | "stable" | "worsening";
      waistCircumferenceTrend: "decreasing" | "stable" | "increasing";
    };
    vitals: {
      restingHeartRateStatus: "good" | "needs-attention";
      sleepQuality: "good" | "adequate" | "poor";
    };
    lifestyle: {
      trainingConsistency: "good" | "average" | "poor";
      proteinIntakeStatus: "sufficient" | "needs-increase";
      cardioLevel: "good" | "adequate" | "low";
      stressLevel: "low" | "moderate" | "high";
    };
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  };
}
