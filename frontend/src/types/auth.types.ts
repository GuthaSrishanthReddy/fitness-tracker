export type Role = "USER" | "TRAINER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
