import { api } from "./api";
import type { ProgressEntry } from "../types/progress.types";

export const fetchProgress = () =>
  api<ProgressEntry[]>("/progress");

export const submitProgress = (data: ProgressEntry) =>
  api<void>("/progress", {
    method: "POST",
    body: JSON.stringify(data),
  });
