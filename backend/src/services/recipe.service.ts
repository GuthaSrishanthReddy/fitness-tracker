import axios, { AxiosResponse } from "axios";
import { env } from "../config/env";
import {
  RecipeResult,
  SpoonacularComplexSearchResponse,
  SpoonacularRecipe,
} from "../types/recipe.types";

const SPOONACULAR_URL = "https://api.spoonacular.com/recipes/complexSearch";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 350;

type ServiceError = Error & { statusCode?: number; retryAfter?: number };
type MealSearchArgs = {
  meal: string;
  maxFat: number;
  minProtein: number;
  maxProtein: number;
};

const createServiceError = (
  message: string,
  statusCode: number,
  retryAfter?: number
): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  if (retryAfter !== undefined) {
    error.retryAfter = retryAfter;
  }
  return error;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryAfterSeconds = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.ceil(value);
  }

  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return Math.ceil(asNumber);
    }

    const asDate = Date.parse(value);
    if (!Number.isNaN(asDate)) {
      const deltaMs = asDate - Date.now();
      if (deltaMs > 0) {
        return Math.ceil(deltaMs / 1000);
      }
    }
  }

  return undefined;
};

const isRetryableSpoonacularError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (status !== undefined && [429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  return error.code === "ECONNABORTED" || !error.response;
};

const normalizeSpoonacularError = (error: unknown): ServiceError => {
  if (!axios.isAxiosError(error)) {
    return createServiceError("Unable to fetch recipes right now.", 500);
  }

  const status = error.response?.status;
  const retryAfter = parseRetryAfterSeconds(
    error.response?.headers?.["retry-after"]
  );

  if (status === 429) {
    return createServiceError(
      retryAfter
        ? `Recipe service rate-limited. Please retry in ${retryAfter}s.`
        : "Recipe service rate-limited. Please retry shortly.",
      429,
      retryAfter
    );
  }

  if (status === 401 || status === 403) {
    return createServiceError(
      "Recipe provider authentication failed.",
      502
    );
  }

  if (status === 402) {
    return createServiceError(
      "Recipe provider quota exceeded. Please retry later.",
      503
    );
  }

  if (status !== undefined && status >= 500) {
    return createServiceError(
      "Recipe provider is temporarily unavailable. Please retry shortly.",
      503
    );
  }

  if (error.code === "ECONNABORTED") {
    return createServiceError(
      "Recipe request timed out. Please retry shortly.",
      504
    );
  }

  if (!error.response) {
    return createServiceError(
      "Unable to reach recipe provider. Please retry shortly.",
      503
    );
  }

  return createServiceError("Unable to fetch recipes right now.", 502);
};

const validateInputs = (
  meal: string,
  maxFat: number,
  minProtein: number,
  maxProtein: number
) => {
  const trimmedMeal = meal.trim();
  if (!trimmedMeal) {
    throw createServiceError("Meal query is required.", 400);
  }

  if (trimmedMeal.length > 100) {
    throw createServiceError("Meal query must be 100 characters or fewer.", 400);
  }

  const numericFields: Array<[string, number]> = [
    ["maxFat", maxFat],
    ["minProtein", minProtein],
    ["maxProtein", maxProtein],
  ];

  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value) || value < 0) {
      throw createServiceError(`${field} must be a non-negative number.`, 400);
    }
  }

  if (minProtein > maxProtein) {
    throw createServiceError("minProtein cannot be greater than maxProtein.", 400);
  }
};

const mapRecipe = (recipe: SpoonacularRecipe): RecipeResult => ({
  id: recipe.id,
  image: recipe.image,
  imageType: recipe.imageType,
  title: recipe.title,
  readyInMinutes: recipe.readyInMinutes,
  servings: recipe.servings,
  sourceUrl: recipe.sourceUrl,
  spoonacularSourceUrl: recipe.spoonacularSourceUrl,
  aggregateLikes: recipe.aggregateLikes,
  healthScore: recipe.healthScore,
  spoonacularScore: recipe.spoonacularScore,
  pricePerServing: recipe.pricePerServing,
  weightWatcherSmartPoints: recipe.weightWatcherSmartPoints,
  cheap: recipe.cheap,
  veryHealthy: recipe.veryHealthy,
  veryPopular: recipe.veryPopular,
  sustainable: recipe.sustainable,
  vegetarian: recipe.vegetarian,
  vegan: recipe.vegan,
  glutenFree: recipe.glutenFree,
  dairyFree: recipe.dairyFree,
  lowFodmap: recipe.lowFodmap,
  cuisines: recipe.cuisines ?? [],
  dishTypes: recipe.dishTypes ?? [],
  diets: recipe.diets ?? [],
  occasions: recipe.occasions ?? [],
  summary: recipe.summary ?? "",
  instructions: recipe.instructions ?? "",
  analyzedInstructions: recipe.analyzedInstructions ?? [],
  extendedIngredients: recipe.extendedIngredients ?? [],
  nutrition: recipe.nutrition ?? null,
  winePairing: recipe.winePairing ?? null,
});

const normalizeMealLabel = (meal: string) =>
  meal.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const getRecipeSearchQueries = (meal: string): string[] => {
  const normalized = normalizeMealLabel(meal);
  if (!normalized) return [meal];

  const aliases: Array<[RegExp, string[]]> = [
    [/^breakfast$/, ["high protein breakfast", "healthy breakfast"]],
    [
      /^mid morning snack$|^snack$/,
      ["healthy high protein snack", "healthy snack"],
    ],
    [
      /^pre workout$/,
      ["pre workout snack", "energy snack", "light healthy snack"],
    ],
    [
      /^post workout$/,
      [
        "post workout high protein meal",
        "high protein recovery meal",
        "high protein snack",
      ],
    ],
    [/^lunch$/, ["high protein lunch", "healthy lunch"]],
    [/^dinner$/, ["high protein dinner", "healthy dinner"]],
  ];

  for (const [pattern, aliasList] of aliases) {
    if (pattern.test(normalized)) {
      return [...new Set([...aliasList, meal])];
    }
  }

  return [meal];
};

export const getMeals = async ({
  meal,
  maxFat,
  minProtein,
  maxProtein,
}: MealSearchArgs): Promise<RecipeResult[]> => {
  validateInputs(meal, maxFat, minProtein, maxProtein);
  const trimmedMeal = meal.trim();
  const searchQueries = getRecipeSearchQueries(trimmedMeal);

  const headers = {
    "x-api-key": env.SPOONACULAR_API_KEY,
  };

  const fetchForQuery = async (
    query: string
  ): Promise<SpoonacularComplexSearchResponse | null> => {
    const params = {
      query,
      maxFat,
      minProtein,
      maxProtein,
      addRecipeInformation: true,
      number: 5,
    };

    let response: AxiosResponse<SpoonacularComplexSearchResponse> | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        response = await axios.get<SpoonacularComplexSearchResponse>(
          SPOONACULAR_URL,
          {
            headers,
            params,
            timeout: REQUEST_TIMEOUT_MS,
          }
        );
        break;
      } catch (error) {
        const canRetry = isRetryableSpoonacularError(error) && attempt < MAX_RETRIES;
        if (!canRetry) {
          throw normalizeSpoonacularError(error);
        }
        const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;
        await wait(delay);
      }
    }

    return response?.data ?? null;
  };

  for (const searchQuery of searchQueries) {
    const payload = await fetchForQuery(searchQuery);
    if (!payload) {
      throw createServiceError("Unable to fetch recipes right now.", 503);
    }

    const rawResults = Array.isArray(payload.results) ? payload.results : [];
    if (rawResults.length === 0) {
      continue;
    }

    const recipes = rawResults.map(mapRecipe);
    if (env.NODE_ENV !== "production") {
      console.log("Spoonacular recipes fetched:", {
        inputMeal: trimmedMeal,
        query: searchQuery,
        count: recipes.length,
      });
    }

    return recipes;
  }

  if (env.NODE_ENV !== "production") {
    console.log("Spoonacular recipes fetched none:", {
      inputMeal: trimmedMeal,
      attemptedQueries: searchQueries,
    });
  }

  return [];
};

export const getMealRecipes = async (meal: string): Promise<RecipeResult[]> => {
  const DEFAULT_MAX_FAT = 120;
  const DEFAULT_MIN_PROTEIN = 0;
  const DEFAULT_MAX_PROTEIN = 250;

  return getMeals({
    meal,
    maxFat: DEFAULT_MAX_FAT,
    minProtein: DEFAULT_MIN_PROTEIN,
    maxProtein: DEFAULT_MAX_PROTEIN,
  });
};
