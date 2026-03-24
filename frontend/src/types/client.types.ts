export interface ExploreClientItem {
  id: string;
  name: string;
  email: string;
  fitnessGoal?: string | null;
  fitnessLevel?: string | null;
  activityType?: string | null;
}

export interface ClientListItem {
  id: string;          // ClientTrainer.id
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
}

export interface ClientProgressDetails {
  assignment: {
    id: string;
    userId: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      fitnessGoal: string;
      fitnessLevel: string;
      activityType: string;
    };
  };
  progressHistory: Array<{
    id: string;
    userId: string;
    createdAt: string;
    weight: number;
    waistCircumference: number;
    restingHeartRate: number;
    sleepHours: number;
    proteinIntake: number;
    cardioMinutes: number;
    stressLevel: number;
    bodyFat?: number | null;
    muscleMass?: number | null;
    workoutFrequency?: number | null;
    workoutDuration?: number | null;
    notes?: string | null;
  }>;
}
