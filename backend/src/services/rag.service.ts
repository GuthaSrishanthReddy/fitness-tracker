import { prisma } from "../config/db";
import { model } from "./model.service";
import { retrieveContext } from "./rag.retrieve";

const responseCache = new Map<string, string>();

const formatRecentProgress = async (userId: string): Promise<string> => {
  const rows = await prisma.progress.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      createdAt: true,
      weight: true,
      bodyFat: true,
      waistCircumference: true,
    },
  });

  if (rows.length === 0) return "";

  const lines = rows.map((row) => {
    const date = row.createdAt.toISOString().slice(0, 10);
    return `Date: ${date}, Weight: ${row.weight} kg, Body Fat: ${row.bodyFat}%, Waist: ${row.waistCircumference ?? "N/A"} cm`;
  });

  return `Recent progress history (latest first):\n${lines.join("\n")}`;
};

export const ragService = {
  async chat(userId: string, message: string) {
    const latestProgress = await prisma.progress.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const progressVersion = latestProgress?.createdAt.toISOString() ?? "none";
    const cacheKey = `${userId}:${message.trim().toLowerCase()}:${progressVersion}`;

    if (responseCache.has(cacheKey)) {
      return responseCache.get(cacheKey)!;
    }

    const retrievedContext = await retrieveContext(userId, message);
    const recentProgress = await formatRecentProgress(userId);

    const context =
      [retrievedContext, recentProgress]
        .filter((part) => part && part.trim().length > 0)
        .join("\n\n") || "No history available";

    const prompt = `
You are a helpful fitness and nutrition assistant.
Use the context below as primary evidence.
If the question asks about trend/progress, compare multiple dated entries instead of only the latest value.
If data is still missing, state that clearly and then provide a safe general recommendation.

Context:
${context}

Question:
${message}
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.3,
        topP: 0.9,
      },
    } as any);
    const answer = result.response.text();

    responseCache.set(cacheKey, answer);

    return answer;
  },
};
