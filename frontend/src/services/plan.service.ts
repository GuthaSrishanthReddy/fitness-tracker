import { api } from "./api";
import type { Plan } from "../types/plan.types";

export const fetchPlan = () =>
  api<Plan>("/plan");
