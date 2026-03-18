import { api } from "./api";
import type { RagApiResponse } from "../types/rag.types";

export const askRag = (message: string, sessionId: string) =>
  api<RagApiResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, sessionId }),
  }).then((data) => (typeof data === "string" ? data : data.answer));

export const endRagSession = (sessionId: string) =>
  api("/ai/chatbot/end", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
