import { model } from "./model.service";

const responseCache = new Map<string, string>();

export const chatbotService = {
  async chat(userId: string, message: string) {
    const normalized = message.trim();
    const cacheKey = `${userId}:${normalized.toLowerCase()}`;

    if (!normalized) {
      return "Please enter a message.";
    }

    if (responseCache.has(cacheKey)) {
      return responseCache.get(cacheKey)!;
    }

    const prompt = `
You are a helpful fitness and nutrition assistant.
Answer the user's question clearly and concisely.

Question:
${normalized}
`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    responseCache.set(cacheKey, answer);

    return answer;
  },
};
