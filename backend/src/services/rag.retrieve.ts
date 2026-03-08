import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { Prisma } from "@prisma/client";

const TOP_K = 3;
const DEFAULT_MAX_CHARS = 2000;
const MIN_COSINE_SIMILARITY = 0.72;
const DEFAULT_RAG_SOURCES = [
  "progress",
  "routine",
  "diet",
  "plan",
  "supplement",
];

type RetrievedRow = {
  content: string;
  similarity: number;
};

async function retrieveByCosineSimilarity(
  userId: string,
  queryEmbedding: number[],
  sources: string[] | null,
  topK: number,
  minSimilarity = MIN_COSINE_SIMILARITY
): Promise<RetrievedRow[]> {
  const queryDimensions = queryEmbedding.length;
  const sourceFilter =
    sources && sources.length > 0
      ? Prisma.sql`AND source IN (${Prisma.join(sources)})`
      : Prisma.empty;

  const thresholdResults = await prisma.$queryRaw<RetrievedRow[]>`
    WITH dim_filtered AS (
      SELECT content, embedding
      FROM "DocumentEmbedding"
      WHERE "userId" = ${userId}
        ${sourceFilter}
        AND vector_dims(embedding) = ${queryDimensions}
    )
    SELECT
      content,
      1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM dim_filtered
    WHERE (1 - (embedding <=> ${queryEmbedding}::vector)) >= ${minSimilarity}
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;

  if (thresholdResults.length > 0) return thresholdResults;

  const nearestByDimension = await prisma.$queryRaw<RetrievedRow[]>`
    WITH dim_filtered AS (
      SELECT content, embedding
      FROM "DocumentEmbedding"
      WHERE "userId" = ${userId}
        ${sourceFilter}
        AND vector_dims(embedding) = ${queryDimensions}
    )
    SELECT
      content,
      1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM dim_filtered
    ORDER BY similarity DESC
    LIMIT ${topK}
  `;

  if (nearestByDimension.length > 0) return nearestByDimension;

  // Final fallback: return latest records even if dimensions don't match.
  return prisma.$queryRaw<RetrievedRow[]>`
    SELECT
      content,
      0::double precision AS similarity
    FROM "DocumentEmbedding"
    WHERE "userId" = ${userId}
      ${sourceFilter}
    ORDER BY "createdAt" DESC
    LIMIT ${topK}
  `;
}

export async function retrieveContext(
  userId: string,
  query: string
): Promise<string> {

  const queryEmbedding = await createEmbedding(query);
  const results = await retrieveByCosineSimilarity(
    userId,
    queryEmbedding,
    DEFAULT_RAG_SOURCES,
    TOP_K
  );

  if (results.length === 0) return "";
  return results.map((r) => r.content).join("\n");
}

export async function retrieveContextBySources(
  userId: string,
  query: string,
  sources: string[],
  topK = TOP_K,
  maxChars = DEFAULT_MAX_CHARS
): Promise<string> {
  if (sources.length === 0) return "";

  const queryEmbedding = await createEmbedding(query);
  const results = await retrieveByCosineSimilarity(
    userId,
    queryEmbedding,
    sources,
    topK
  );

  if (results.length === 0) return "";
  return results.map((r) => r.content).join("\n").slice(0, maxChars);
}
