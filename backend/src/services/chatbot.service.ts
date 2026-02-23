import crypto from "crypto";
import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";
import { staticKnowledgeService } from "./staticKnowledge.service";

const TOP_K = 5;
const MAX_CONTEXT_CHARS = 2000;

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

    await staticKnowledgeService.ensureSeeded();

    const source = buildSource(sessionId);
    const userEmbedding = await createEmbeddingSafe(normalized);
    const contextRows = await prisma.$queryRaw<
      { content: string }[]
    >`
      SELECT content
      FROM "DocumentEmbedding"
      WHERE "userId" = ${userId} OR "userId" = 'system'
      ORDER BY embedding <-> ${userEmbedding}::vector
      LIMIT ${TOP_K}
    `;
    const retrievedContext = contextRows.map((row) => row.content).join("\n");
    const limitedContext = retrievedContext.slice(0, MAX_CONTEXT_CHARS);

    const userContent = `User: ${normalized}`;

    await prisma.$executeRaw`
      INSERT INTO "DocumentEmbedding"
        (id, "userId", source, content, embedding)
      VALUES
        (${crypto.randomUUID()}, ${userId}, ${source}, ${userContent}, ${userEmbedding}::vector)
    `;

    const prompt = `
You are a helpful fitness and nutrition assistant.
Use only the retrieved context when relevant.
If context is insufficient, say so briefly and give a safe general answer.

Retrieved context:
${limitedContext || "none"}

User message:
${normalized}

Respond clearly and concisely.
`;

    const result = await generateContentSafe(prompt);
    const answer = result.response.text();

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
