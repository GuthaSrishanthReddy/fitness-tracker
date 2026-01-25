import { model } from "./model.service";
import { retrieveContext } from "./rag.retrieve";

const responseCache = new Map<string, string>();

export const ragService = {
  async chat(userId: string, message: string) {
    const cacheKey = `${userId}:${message.trim().toLowerCase()}:${Math.floor(Date.now() / 300000)}`;

    // 1️⃣ Cache check
    if (responseCache.has(cacheKey)) {
      console.log("⚡ Cache hit");
      return responseCache.get(cacheKey)!;
    }

    console.log("🧠 Cache miss — running RAG");

    // 2️⃣ Retrieve context (IMPORTANT: await)
    const context = await retrieveContext(userId, message) || "No History available";

    // 3️⃣ Build Gemini prompt (plain text)
    const prompt = `
You are a helpful fitness and nutrition assistant.
Answer ONLY using the context below.
If the context is insufficient, say "Not enough data".

Context:
${context}

Question:
${message}
`;

    // 4️⃣ Call Gemini
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // 5️⃣ Cache result
    responseCache.set(cacheKey, answer);

    return answer;
  },
};
