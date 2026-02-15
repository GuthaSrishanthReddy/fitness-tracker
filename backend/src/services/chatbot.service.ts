import crypto from "crypto";
import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";

const normalizeAiError = (error: any) => {
  const status = error?.status ?? error?.statusCode;
  const statusText = String(error?.statusText ?? "");

  const retryAfter = (() => {
    const details = Array.isArray(error?.errorDetails) ? error.errorDetails : [];
    const retryInfo = details.find((d: any) =>
      String(d?.["@type"] ?? "").includes("RetryInfo")
    );
    const delay = String(retryInfo?.retryDelay ?? "");
    const match = delay.match(/(\d+)/);
    return match ? Number(match[1]) : undefined;
  })();

  if (status === 429 || statusText.toLowerCase().includes("too many requests")) {
    const err = new Error(
      retryAfter
        ? `AI service rate-limited. Please retry in ${retryAfter}s.`
        : "AI service rate-limited. Please retry shortly."
    ) as any;
    err.statusCode = 429;
    if (retryAfter) {
      err.retryAfter = retryAfter;
    }
    return err;
  }

  return error;
};

const createEmbeddingSafe = async (text: string) => {
  try {
    return await createEmbedding(text);
  } catch (error) {
    throw normalizeAiError(error);
  }
};

const generateContentSafe = async (prompt: string) => {
  try {
    return await model.generateContent(prompt);
  } catch (error) {
    throw normalizeAiError(error);
  }
};

const buildSource = (sessionId: string) => `chat_session:${sessionId}`;

export const chatbotService = {
  async chat(userId: string, sessionId: string, message: string) {
    const normalized = message.trim();

    if (!sessionId) {
      const err = new Error("Missing sessionId") as Error & {
        statusCode?: number;
      };
      err.statusCode = 400;
      throw err;
    }

    if (!normalized) {
      return "Please enter a message.";
    }

    const source = buildSource(sessionId);
    const userContent = `User: ${normalized}`;

    const userEmbedding = await createEmbeddingSafe(userContent);

    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding"
        (id, "userId", source, content, embedding)
      VALUES
        (${crypto.randomUUID()}, ${userId}, ${source}, ${userContent}, ${userEmbedding}::vector)
    `;

    const historyRows = await prisma.$queryRaw<{ content: string }[]>`
      SELECT content
      FROM "DocumentEmbedding"
      WHERE "userId" = ${userId} AND source = ${source}
      ORDER BY "createdAt" ASC
    `;

    const history = historyRows.map((row) => row.content).join("\n");

    const prompt = `
You are a helpful fitness and nutrition assistant.
Use the chat history to answer the latest user message.

Chat history (oldest first):
${history}

Respond to the last user message clearly and concisely.
`;

    const result = await generateContentSafe(prompt);
    const answer = result.response.text();

    const aiContent = `AI: ${answer}`;
    const aiEmbedding = await createEmbeddingSafe(aiContent);

    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding"
        (id, "userId", source, content, embedding)
      VALUES
        (${crypto.randomUUID()}, ${userId}, ${source}, ${aiContent}, ${aiEmbedding}::vector)
    `;
    
    
    return answer;
  },

  async endSession(userId: string, sessionId: string) {
    if (!sessionId) {
      const err = new Error("Missing sessionId") as Error & {
        statusCode?: number;
      };
      err.statusCode = 400;
      throw err;
    }

    const source = buildSource(sessionId);
    await prisma.documentEmbedding.deleteMany({
      where: { userId, source },
    });
  },
};
