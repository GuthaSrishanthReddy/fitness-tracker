import { api } from "./api";

export const askChatbot = (message: string) =>
  api<string>("/ai/chatbot", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
