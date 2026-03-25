import { api } from "./api";
import type { ProgressInput, ProgressRecord, InsightResponse } from "../types/progress.types";

export const fetchProgress = () =>
  api<ProgressRecord[]>("/progress");

export const submitProgress = (data: ProgressInput) =>
  api<void>("/progress", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const fetchProgressInsights = () =>
  api<InsightResponse>("/ai/analyze-progress", { method: "POST" });
