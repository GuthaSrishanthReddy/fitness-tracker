import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../config/env";


export const model = new ChatGoogleGenerativeAI({
    model: "models/gemini-2.5-flash",
    temperature: 0.7,
    maxOutputTokens: 300,
    apiKey: env.GOOGLE_API_KEY,
    maxRetries: 2,
});