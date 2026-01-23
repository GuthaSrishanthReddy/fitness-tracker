import { env } from "../config/env";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const responseCache = new Map<string, string>();

export const ragService = {
  async chat(userId: string,message: string) {
    const cacheKey = message.trim().toLowerCase();

    // ✅ 1. Check cache
    if (responseCache.has(cacheKey)) {
      console.log("⚡ Cache hit");
      return responseCache.get(cacheKey);
    }

    console.log("🐢 Cache miss — calling model");

    const model = new ChatGoogleGenerativeAI({
      model: "models/gemini-2.5-flash",
      temperature: 0.7,
      maxOutputTokens: 300,
      apiKey: env.GOOGLE_API_KEY,
    });

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



