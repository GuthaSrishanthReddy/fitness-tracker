import { api } from "./api";
import type { TrainerProfile } from "../types/trainer.types";

export const fetchTrainerProfile = () =>
  api<TrainerProfile>("/trainer/profile");
