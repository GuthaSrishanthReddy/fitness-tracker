import { Role } from "./auth.types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
}
