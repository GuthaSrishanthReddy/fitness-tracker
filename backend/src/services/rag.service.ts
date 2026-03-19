import { prisma } from "../config/db";
import { model } from "./model.service";
import { createEmbedding } from "./embedding.service";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

const buildSource = (sessionId: string) => `rag_session:${sessionId}`;

type RetrievedResult = {
  content: string;
  similarity: number;
  source: string;
};

async function retrieveSimilarEmbeddings(
  userId: string,
  queryEmbedding: number[],
  topK: number = 8
): Promise<RetrievedResult[]> {
  const queryDimensions = queryEmbedding.length;

  const results = await prisma.$queryRaw<RetrievedResult[]>`
    SELECT
      content,
      1 - (embedding <=> ${queryEmbedding}::vector) AS similarity,
      source
    FROM "DocumentEmbedding"
    WHERE "userId" = ${userId}
      AND vector_dims(embedding) = ${queryDimensions}
      AND source NOT LIKE 'rag_session:%'
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;

  return results;
}

async function retrieveSessionHistory(
  userId: string,
  sessionId: string,
  limit: number = 5
): Promise<string> {
  const source = buildSource(sessionId);
  const rows = await prisma.$queryRaw<{ content: string }[]>`
    SELECT content
    FROM "DocumentEmbedding"
    WHERE "userId" = ${userId}
      AND source = ${source}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `;

  return rows
    .map((row) => row.content)
    .reverse()
    .join("\n");
}

export const ragService = {
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

    try {
      // Embed user message
      const userEmbedding = await createEmbedding(normalized);
      const userContent = `User: ${normalized}`;
      
      // Store user message in session
      await prisma.$executeRaw`
        INSERT INTO "DocumentEmbedding"
          (id, "userId", source, content, embedding)
        VALUES
          (${crypto.randomUUID()}, ${userId}, ${source}, ${userContent}, ${userEmbedding}::vector)
      `;

      // Retrieve relevant embeddings using RAG similarity search
      const ragResults = await retrieveSimilarEmbeddings(userId, userEmbedding, 8);
      
      // Filter results with reasonable similarity threshold
      const relevantResults = ragResults.filter((r) => r.similarity >= 0.50);

      // Get session history for conversational context
      const sessionHistory = await retrieveSessionHistory(userId, sessionId, 5);

      // Build context from RAG results
      const ragContext = relevantResults.length > 0
        ? relevantResults
            .map((r) => r.content)
            .join("\n")
        : "No relevant historical data found.";

      const prompt = `
You are a helpful professional fitness coach. Answer the user's query using the provided context using rag similarity search and session history. Use the retrieved data to provide a helpful and specific answer. If the retrieved data is insufficient, acknowledge it and provide safe general guidance.

Use readable formatting with bullets, line breaks, and indents as needed to make the information clear and easy to read. Be friendly and informational like a best friend.

Retrieved Data (from user's fitness history):
${ragContext}

Conversation History:
${sessionHistory || "(First message in this conversation)"}

User Question:
${normalized}
`;

      // Call GenAI with RAG context
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.3,
          topP: 0.9,
        },
      } as any);

      const answer = result.response.text();

      // Store assistant response in session
      const assistantContent = `Assistant: ${answer}`;
      const assistantEmbedding = await createEmbedding(answer);
      await prisma.$executeRaw`
        INSERT INTO "DocumentEmbedding"
          (id, "userId", source, content, embedding)
        VALUES
          (${crypto.randomUUID()}, ${userId}, ${source}, ${assistantContent}, ${assistantEmbedding}::vector)
      `;

      return answer;
    } catch (error) {
      console.error("RAG chat error:", error);
      throw error;
    }
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
