import crypto from "crypto";
import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";

const buildSource = (sessionId: string) => `chat_session:${sessionId}`;

export const chatbotService = {
  async chat(userId: string, sessionId: string, message: string) {
    const normalized = message.trim();

    if (!sessionId) {
      throw new Error("Missing sessionId");
    }

    if (!normalized) {
      return "Please enter a message.";
    }

    const source = buildSource(sessionId);
    const userContent = `User: ${normalized}`;

    const userEmbedding = await createEmbedding(userContent);

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

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    const aiContent = `AI: ${answer}`;
    const aiEmbedding = await createEmbedding(aiContent);

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
      throw new Error("Missing sessionId");
    }

    const source = buildSource(sessionId);
    await prisma.documentEmbedding.deleteMany({
      where: { userId, source },
    });
  },
};
