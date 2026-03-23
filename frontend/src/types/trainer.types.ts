export interface TrainerProfile {
  id: string;
  userId: string;
  qualifications: string[];
  expertise: string[];
  experienceYears: number;
  rating?: number | null;
}

export interface TrainerListItem {
  id: string;
  expertise: string[];
  user: {
    name: string;
    email: string;
  };
}
