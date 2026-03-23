export interface TrainerProfile {
  id: string;
  userId: string;
  qualifications: string[];
  expertise: string[];
  experienceYears: number;
  rating?: number | null;
}

export interface TrainerDetail extends TrainerProfile {
  user: {
    id: string;
    name: string;
    email: string;
  };
  requestStatus: TrainerRequestStatus | null;
  canRequest: boolean;
}

export interface TrainerListItem {
  id: string;
  qualifications: string[];
  expertise: string[];
  experienceYears: number;
  rating?: number | null;
  user: {
    id?: string;
    name: string;
    email: string;
  };
}

export type TrainerRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface TrainerRequestItem {
  id: string;
  trainerId: string;
  userId: string;
  status: TrainerRequestStatus;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    fitnessGoal: string;
    fitnessLevel: string;
    activityType: string;
  };
}
