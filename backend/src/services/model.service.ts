import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genai = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
const defaultGenerationConfig = {
    maxOutputTokens: 500,
    temperature: 0.3,
    topP: 0.9,
} as const;

export const createGenerativeModel = (modelName: string) =>
    genai.getGenerativeModel({
        model: modelName,
        generationConfig: defaultGenerationConfig,
    });

export const model = genai.getGenerativeModel({
    model: "models/gemini-2.5-flash",
    generationConfig: defaultGenerationConfig,
});

export const embeddingModel = genai.getGenerativeModel({
    model: "models/gemini-embedding-001",
});



