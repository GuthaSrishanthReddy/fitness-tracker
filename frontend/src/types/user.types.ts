export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: "USER" | "TRAINER";
  fitnessGoal?: string;
  fitnessLevel?: string;
  activityType?: string;
  complianceScore?: number;
  createdAt?: string;
}
