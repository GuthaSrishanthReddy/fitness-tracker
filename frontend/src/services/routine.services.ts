import { api } from "./api";

export type PlanItem = {
  workout: string;
  setsReps: string;
  notes: string;
};

export const generateAiPlan = () =>
  api<PlanItem[]>("/plans/ai", {
    method: "POST",
  });

export const fetchLatestAiPlan = () =>
  api<PlanItem[]>("/plans/ai/latest");
