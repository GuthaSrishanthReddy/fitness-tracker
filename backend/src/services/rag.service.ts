import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model } from "./model.service";


const responseCache = new Map<string, string>();

export const ragService = {
  async chat(userId: string, message: string) {
    const cacheKey = message.trim().toLowerCase();

    // ✅ 1. Check cache
    if (responseCache.has(cacheKey)) {
      console.log("⚡ Cache hit");
      return responseCache.get(cacheKey);
    }

    console.log("🐢 Cache miss — calling model");

    const response = await model.invoke([
      new SystemMessage(
        "You are a helpful assistant that can answer questions about fitness and nutrition."
      ),
      new HumanMessage(message),
    ]);

    // ✅ 2. Save to cache
    responseCache.set(cacheKey, response.content as string);
    return response.content;
  },
};



