import { api } from "./api";
import type { RagApiResponse } from "../types/rag.types";

export const askRag = (message: string) =>
  api<RagApiResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  }).then((data) => (typeof data === "string" ? data : data.answer));
