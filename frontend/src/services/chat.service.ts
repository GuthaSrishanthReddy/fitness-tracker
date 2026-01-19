import { api } from "./api";
import type { ChatMessage } from "../types/chat.types";

export const fetchMessages = () =>
  api<ChatMessage[]>("/chat");

export const sendMessage = (text: string) =>
  api<void>("/chat", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
