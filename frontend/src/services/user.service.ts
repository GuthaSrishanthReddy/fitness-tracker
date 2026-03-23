import { api } from "./api";
import type { UserProfile } from "../types/user.types";
import type { AssignedTrainer } from "../types/trainer.types";

export const fetchUserProfile = () =>
  api<UserProfile>("/users/me");

export const fetchMyTrainer = () =>
  api<AssignedTrainer | null>("/users/my-trainer");
