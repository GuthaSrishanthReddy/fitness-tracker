import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";

const TOP_K = 3;

export async function retrieveContext(
  userId: string,
  query: string
): Promise<string> {

  const queryEmbedding = await createEmbedding(query);

  const results = await prisma.$queryRaw<
    { content: string }[]
  >`
    SELECT content
    FROM "DocumentEmbedding"
    WHERE "userId" = ${userId}
    ORDER BY embedding <-> ${queryEmbedding}::vector
    LIMIT ${TOP_K}
  `;

  if (results.length === 0) return "";
  else return results.map(r => r.content).join("\n");
}
