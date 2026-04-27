import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { embeddingStoreService } from "./embeddingStore.service";
import { model } from "./model.service";
import { getMealRecipes, getMeals } from "./recipe.service";
import { RecipeResult } from "../types/recipe.types";
import { mealsTemplate } from "../utils/constants";
import { retrieveContextBySources } from "./rag.retrieve";

type MealQueryArgs = {
  meal: string;
  maxFat: number;
  minProtein: number;
  maxProtein: number;
};

type DietItem = {
  meal: string;
  items: string;
  notes: string;
};

type MealRecipePopupDetail = {
  meal: string;
  items: string;
  notes: string;
  recipes: RecipeResult[];
};

const MAX_MEAL_QUERIES = 6;

const DEFAULT_MEAL_QUERIES: MealQueryArgs[] = mealsTemplate.map((template) => ({
  meal: template.mealName,
  maxFat: template.maxFat,
  minProtein: template.minProtein,
  maxProtein: template.maxProtein,
}));

const normalize = (text: string) =>
  text
    .replace(/[â€œâ€]/g, "\"")
    .replace(/[â€˜â€™]/g, "'")
    .replace(/^\s*json\s*/i, "")
    .trim();

const extractJson = (text: string) => {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const unfenced = fenceMatch ? fenceMatch[1] : text;
  const cleaned = normalize(
    unfenced.replace(/^```(?:json)?/i, "").replace(/```$/i, "")
  );
  const firstArray = cleaned.indexOf("[");
  const firstObj = cleaned.indexOf("{");
  const start =
    firstArray === -1
      ? firstObj
      : firstObj === -1
      ? firstArray
      : Math.min(firstArray, firstObj);
  if (start === -1) return cleaned;

  const lastArray = cleaned.lastIndexOf("]");
  const lastObj = cleaned.lastIndexOf("}");
  const end =
    lastArray === -1
      ? lastObj
      : lastObj === -1
      ? lastArray
      : Math.max(lastArray, lastObj);
  return end >= start
    ? cleaned.slice(start, end + 1).trim()
    : cleaned.slice(start).trim();
};

const toFiniteNumber = (value: unknown, fallback: number) => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toMealQuery = (value: unknown): MealQueryArgs | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;

  const meal = String(
    candidate.meal ?? candidate.mealName ?? candidate.query ?? ""
  ).trim();
  if (!meal) return null;

  const maxFat = Math.max(0, toFiniteNumber(candidate.maxFat, 25));
  const minProtein = Math.max(0, toFiniteNumber(candidate.minProtein, 15));
  const maxProtein = Math.max(
    minProtein,
    toFiniteNumber(candidate.maxProtein, minProtein + 10)
  );

  return { meal, maxFat, minProtein, maxProtein };
};

const parseMealQueries = (raw: string): MealQueryArgs[] => {
  const jsonText = extractJson(raw);
  const parsedCandidates = (() => {
    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  })();

  const normalized = parsedCandidates
    .map(toMealQuery)
    .filter((item): item is MealQueryArgs => Boolean(item));

  if (normalized.length === 0) return [];

  const seen = new Set<string>();
  const deduped: MealQueryArgs[] = [];
  for (const item of normalized) {
    const key = item.meal.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, MAX_MEAL_QUERIES);
};

const ensureAllMealSlots = (queries: MealQueryArgs[]): MealQueryArgs[] => {
  const byMeal = new Map<string, MealQueryArgs>();
  for (const query of queries) {
    byMeal.set(query.meal.trim().toLowerCase(), query);
  }

  // Always return all template meals in template order so UI consistently shows all slots.
  return DEFAULT_MEAL_QUERIES.map((fallback) => {
    const existing = byMeal.get(fallback.meal.trim().toLowerCase());
    if (!existing) return fallback;

    const minProtein = Math.max(0, existing.minProtein);
    const maxProtein = Math.max(minProtein, existing.maxProtein);
    const maxFat = Math.max(0, existing.maxFat);

    return {
      meal: fallback.meal,
      minProtein,
      maxProtein,
      maxFat,
    };
  });
};

const parseDietItems = (raw: string): DietItem[] => {
  const jsonText = extractJson(raw);

  try {
    const parsed = JSON.parse(jsonText);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const candidate = item as Record<string, unknown>;
        return {
          meal: String(candidate.meal ?? "").trim(),
          items: String(candidate.items ?? "").trim(),
          notes: String(candidate.notes ?? "").trim(),
        };
      })
      .filter((item) => item.meal.length > 0);
  } catch {
    return [];
  }
};

const formatMacroNote = (query: MealQueryArgs) =>
  `Target: min protein ${query.minProtein}g, max protein ${query.maxProtein}g, max fat ${query.maxFat}g`;

const normalizeMealKey = (meal: string) => meal.trim().toLowerCase();

const fetchRecipesWithFallback = async (query: MealQueryArgs) => {
  const strictRecipes = await getMeals({
    meal: query.meal,
    maxFat: query.maxFat,
    minProtein: query.minProtein,
    maxProtein: query.maxProtein,
  });
  if (strictRecipes.length > 0) {
    return {
      recipes: strictRecipes,
      usedFallback: false,
    };
  }

  const relaxedRecipes = await getMealRecipes(query.meal, {
    requestMode: "background",
  });
  return {
    recipes: relaxedRecipes,
    usedFallback: relaxedRecipes.length > 0,
  };
};

const generateMealQueriesFromAi = async (context: string): Promise<MealQueryArgs[]> => {
  const prompt = `
You are a nutrition assistant.
Return ONLY valid JSON array, no markdown, no explanation.

Generate meal queries to pass into a recipe service.
Each object must match this exact shape:
{ "meal": "string", "maxFat": number, "minProtein": number, "maxProtein": number }

Rules:
- Provide 4 to 6 meals for one day.
- Keep values realistic for one meal.
- maxFat must be >= 0.
- minProtein must be >= 0.
- maxProtein must be >= minProtein.

Use this template as reference:
${JSON.stringify(DEFAULT_MEAL_QUERIES)}

User context:
${context || "none"}
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  console.log("RAW_DIET_MEAL_QUERY_RESPONSE:", raw);

  let mealQueries = parseMealQueries(raw);
  if (mealQueries.length > 0) return mealQueries;

  const retryPrompt = `
Return ONLY valid JSON array in this exact shape:
[
  { "meal": "Breakfast", "maxFat": 20, "minProtein": 15, "maxProtein": 25 }
]
No prose. No markdown.`;
  const retry = await model.generateContent(retryPrompt);
  const retryRaw = retry.response.text().trim();
  console.log("RAW_DIET_MEAL_QUERY_RETRY:", retryRaw);

  mealQueries = parseMealQueries(retryRaw);
  return mealQueries.length > 0 ? mealQueries : DEFAULT_MEAL_QUERIES;
};

const buildDietItemsFromQueries = async (
  queries: MealQueryArgs[]
): Promise<{ dietItems: DietItem[]; popupDetails: MealRecipePopupDetail[] }> => {
  const dietItems: DietItem[] = [];
  const popupDetails: MealRecipePopupDetail[] = [];

  for (const query of queries) {
    const baseNote = formatMacroNote(query);
    try {
      const { recipes, usedFallback } = await fetchRecipesWithFallback(query);

      if (recipes.length === 0) {
        const items = "No matching recipes found";
        dietItems.push({
          meal: query.meal,
          items,
          notes: baseNote,
        });
        popupDetails.push({
          meal: query.meal,
          items,
          notes: baseNote,
          recipes: [],
        });
        continue;
      }

      const titles = recipes.slice(0, 3).map((recipe) => recipe.title).filter(Boolean);
      const notes = usedFallback
        ? `${baseNote} (showing closest available matches)`
        : baseNote;
      const items = titles.join(", ");

      dietItems.push({
        meal: query.meal,
        items,
        notes,
      });
      popupDetails.push({
        meal: query.meal,
        items,
        notes,
        recipes,
      });
    } catch (error) {
      console.error(`Diet recipe fetch failed for meal "${query.meal}"`, error);
      const items = "Unable to fetch recipes right now";
      dietItems.push({
        meal: query.meal,
        items,
        notes: baseNote,
      });
    }
  }

  return { dietItems, popupDetails };
};

const persistDietItems = async (userId: string, items: DietItem[]) => {
  const dietText = JSON.stringify(items);
  const hasDietEmbedding = await embeddingStoreService.hasExactContent(
    userId,
    "diet",
    dietText
  );
  if (hasDietEmbedding) return;

  const embedding = await createEmbedding(dietText);
  await prisma.$executeRaw`
    INSERT INTO "DocumentEmbedding"
      (id, "userId", source, content, embedding)
    VALUES
      (${crypto.randomUUID()}, ${userId}, 'diet', ${dietText}, ${embedding}::vector)
  `;
};

const replaceDietRecipeDetails = async (
  userId: string,
  details: MealRecipePopupDetail[]
) => {
  await prisma.$transaction(async (tx) => {
    await tx.dietRecipeDetail.deleteMany({
      where: { userId },
    });

    if (details.length === 0) {
      return;
    }

    await tx.dietRecipeDetail.createMany({
      data: details.map((detail) => ({
        userId,
        meal: detail.meal,
        mealKey: normalizeMealKey(detail.meal),
        items: detail.items,
        notes: detail.notes,
        recipes: JSON.parse(JSON.stringify(detail.recipes)) as Prisma.InputJsonValue,
      })),
    });
  });
};

const upsertMealRecipeDetails = async (
  userId: string,
  meal: string,
  recipes: RecipeResult[]
) => {
  const mealKey = normalizeMealKey(meal);
  if (!mealKey) return;

  await prisma.dietRecipeDetail.upsert({
    where: {
      userId_mealKey: {
        userId,
        mealKey,
      },
    },
    update: {
      meal,
      recipes: JSON.parse(JSON.stringify(recipes)) as Prisma.InputJsonValue,
    },
    create: {
      userId,
      meal,
      mealKey,
      items: "",
      notes: "",
      recipes: JSON.parse(JSON.stringify(recipes)) as Prisma.InputJsonValue,
    },
  });
};

export const aiDietService = {
  parseDietItems,

  async generateDiet(userId: string): Promise<DietItem[]> {
    const retrievedContext = await retrieveContextBySources(
      userId,
      "Generate meal targets for recipe search based on latest progress and fitness goal.",
      ["progress", "plan"],
      8,
      3000
    );

    const aiMealQueries = await generateMealQueriesFromAi(retrievedContext);
    const mealQueries = ensureAllMealSlots(aiMealQueries);
    const { dietItems, popupDetails } = await buildDietItemsFromQueries(mealQueries);

    await replaceDietRecipeDetails(userId, popupDetails);

    if (dietItems.length > 0) {
      await persistDietItems(userId, dietItems);
    }

    return dietItems;
  },

  async getLatestDiet(userId: string): Promise<DietItem[]> {
    const latest = await embeddingStoreService.getLatestBySource(userId, "diet");
    if (!latest) return [];
    return parseDietItems(latest.content);
  },

  async getStoredMealRecipes(userId: string, meal: string): Promise<RecipeResult[] | null> {
    const mealKey = normalizeMealKey(meal);
    if (!mealKey) return null;

    const record = await prisma.dietRecipeDetail.findUnique({
      where: {
        userId_mealKey: {
          userId,
          mealKey,
        },
      },
      select: {
        recipes: true,
      },
    });

    if (!record) return null;
    return Array.isArray(record.recipes) ? (record.recipes as RecipeResult[]) : [];
  },

  async cacheMealRecipes(userId: string, meal: string, recipes: RecipeResult[]): Promise<void> {
    await upsertMealRecipeDetails(userId, meal, recipes);
  },
};
