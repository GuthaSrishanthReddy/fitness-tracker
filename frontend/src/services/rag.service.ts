import { api } from "./api";
import type { RagResponse } from "../types/rag.types";

export const askRag = (query: string) =>
  api<RagResponse>("/rag", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
