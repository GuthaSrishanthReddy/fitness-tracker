import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { createGenerativeModel } from "./model.service";
import { embeddingStoreService } from "./embeddingStore.service";
import { planTemplate } from "../utils/constants";
import crypto from "crypto";
import { retrieveContextBySources } from "./rag.retrieve";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
const PLAN_CONTEXT_TOP_K = 2;
const PLAN_CONTEXT_MAX_CHARS = 900;
const PLAN_MODEL_CANDIDATES = [
  "models/gemini-2.5-flash",
  "models/gemini-2.0-flash",
] as const;
const FLAT_PLAN_TEMPLATE = `[
  { "day": "Monday", "focus": "Push", "name": "Bench Press", "sets": "3", "reps": "8-10" },
  { "day": "Monday", "focus": "Push", "name": "Overhead Press", "sets": "3", "reps": "8-10" },
  { "day": "Tuesday", "focus": "Rest", "name": "", "sets": "", "reps": "" }
]`;

type WeekDay = (typeof WEEK_DAYS)[number];
type PlanWorkout = {
  workoutName: string;
  setsReps: string;
  notes: string;
};

type PlanItem = {
  day: WeekDay;
  focus: string;
  workouts: PlanWorkout[];
};

type ParsedWorkout = {
  workoutName?: string;
  workout?: string;
  name?: string;
  exercise?: string;
  title?: string;
  setsReps?: string;
  sets?: string | number;
  reps?: string | number;
  notes?: string;
};

type ParsedPlanItem = {
  day?: string;
  dayName?: string;
  focus?: string;
  workouts?: Array<ParsedWorkout | string>;
  exercises?: Array<ParsedWorkout | string>;
  items?: Array<ParsedWorkout | string>;
  workoutName?: string;
  workout?: string;
  name?: string;
  exercise?: string;
  title?: string;
  setsReps?: string;
  sets?: string | number;
  reps?: string | number;
  notes?: string;
};

type PlanParseDiagnostics = {
  source: "json" | "repaired_json" | "nested_regex" | "flat_regex" | "line_format" | "empty";
  validJson: boolean;
  repairedJson: boolean;
  truncated: boolean;
  itemCount: number;
  workoutCount: number;
  outputLength: number;
};

export type PlanGenerationResult = {
  plan: PlanItem[];
  usedFallback: boolean;
  banner?: string;
};

const normalizeDay = (value: unknown, index: number): WeekDay => {
  const fallback = WEEK_DAYS[index % WEEK_DAYS.length];
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().toLowerCase();
  const matched = WEEK_DAYS.find((d) => d.toLowerCase() === cleaned);
  return matched ?? fallback;
};

const isTokenLimitError = (error: unknown): boolean => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).toLowerCase()
      : "";

  return (
    message.includes("token") &&
    (message.includes("limit") ||
      message.includes("exceed") ||
      message.includes("too many") ||
      message.includes("context"))
  );
};

const isRateLimitError = (error: unknown): boolean => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).toLowerCase()
      : "";

  return (
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("too many requests") ||
    message.includes("429")
  );
};

const isTimeoutError = (error: unknown): boolean => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).toLowerCase()
      : "";
  return message.includes("timed out") || message.includes("timeout");
};

const isServiceUnavailableError = (error: unknown): boolean => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).toLowerCase()
      : "";

  return (
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("currently experiencing high demand") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  );
};

const summarizeError = (error: unknown): string => {
  const message =
    error && typeof error === "object" && "message" in (error as any)
      ? String((error as any).message).trim()
      : "";
  if (!message) return "";
  return message.length > 120 ? `${message.slice(0, 117)}...` : message;
};

const compactPlanContext = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/Date:\s*/gi, "Date: ")
    .trim()
    .slice(0, PLAN_CONTEXT_MAX_CHARS);

const normalizePlanText = (text: string) =>
  text
    .replace(/[â€œâ€]/g, "\"")
    .replace(/[â€˜â€™]/g, "'")
    .replace(/^\s*json\s*/i, "")
    .trim();

const extractPlanJson = (text: string) => {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const unfenced = fenceMatch ? fenceMatch[1] : text;
  const cleaned = normalizePlanText(
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

const closeUnbalancedJson = (text: string) => {
  let repaired = text.trim();
  const openCurly = (repaired.match(/\{/g) || []).length;
  const closeCurly = (repaired.match(/\}/g) || []).length;
  const openSquare = (repaired.match(/\[/g) || []).length;
  const closeSquare = (repaired.match(/\]/g) || []).length;

  if (closeCurly < openCurly) {
    repaired += "}".repeat(openCurly - closeCurly);
  }
  if (closeSquare < openSquare) {
    repaired += "]".repeat(openSquare - closeSquare);
  }

  return repaired;
};

const toPlanWorkout = (input: ParsedWorkout): PlanWorkout | null => {
  const workoutName = String(
    input.workoutName ??
      input.workout ??
      input.name ??
      input.exercise ??
      input.title ??
      ""
  ).trim();
  if (!workoutName) return null;

  const setsReps = String(
    input.setsReps ??
      (input.sets && input.reps
        ? `${input.sets} x ${input.reps}`
        : input.sets ?? input.reps ?? "")
  ).trim();

  return {
    workoutName,
    setsReps,
    notes: String(input.notes ?? "").trim(),
  };
};

const toParsedWorkout = (input: ParsedWorkout | string): ParsedWorkout | null => {
  if (typeof input === "string") {
    const text = input.trim();
    if (!text) return null;

    const matched = text.match(
      /^(.*?)\s*(?:-|:|,)\s*(\d+(?:-\d+)?)\s*(?:x|sets?)\s*(\d+(?:-\d+)?(?:\s*each leg)?)?$/i
    );

    if (matched) {
      return {
        name: matched[1].trim(),
        sets: matched[2].trim(),
        reps: matched[3]?.trim() ?? "",
      };
    }

    return { name: text };
  }

  return input;
};

const unwrapParsedPlanItems = (input: unknown): ParsedPlanItem[] => {
  if (Array.isArray(input)) return input as ParsedPlanItem[];
  if (!input || typeof input !== "object") return [];

  const candidate = input as Record<string, unknown>;
  if (Array.isArray(candidate.days)) return candidate.days as ParsedPlanItem[];
  if (Array.isArray(candidate.plan)) return candidate.plan as ParsedPlanItem[];
  if (Array.isArray(candidate.schedule)) return candidate.schedule as ParsedPlanItem[];

  return [candidate as ParsedPlanItem];
};

const normalizeParsedItems = (planItems: ParsedPlanItem[]): PlanItem[] => {
  const grouped = new Map<WeekDay, { focus: string; workouts: PlanWorkout[] }>();

  for (const [index, item] of planItems.entries()) {
    const day = normalizeDay(item.day ?? item.dayName, index);
    const focus = String(item.focus ?? "").trim() || "General";
    const workoutInputs =
      Array.isArray(item.workouts) ? item.workouts :
      Array.isArray(item.exercises) ? item.exercises :
      Array.isArray(item.items) ? item.items :
      [item];
    const normalizedWorkouts = workoutInputs
      .map(toParsedWorkout)
      .filter(Boolean)
      .map((entry) => toPlanWorkout(entry as ParsedWorkout))
      .filter(Boolean) as PlanWorkout[];

    if (!grouped.has(day)) {
      grouped.set(day, { focus, workouts: [] });
    }

    const existing = grouped.get(day)!;
    if (!existing.focus && focus) {
      existing.focus = focus;
    }
    existing.workouts.push(...normalizedWorkouts);
  }

  return WEEK_DAYS.filter((day) => grouped.has(day)).map((day) => ({
    day,
    focus: grouped.get(day)!.focus || "General",
    workouts: grouped.get(day)!.workouts,
  }));
};

const salvageNestedPlanItems = (text: string): ParsedPlanItem[] => {
  const cleaned = normalizePlanText(text);
  const dayBlocks = cleaned
    .split(/(?=\{\s*"day"\s*:)/g)
    .filter((part) => /"day"\s*:/.test(part) || /"focus"\s*:/.test(part));

  const items: ParsedPlanItem[] = [];

  for (const block of dayBlocks) {
    const day = block.match(/"day"\s*:\s*"([^"]*)"/i)?.[1];
    const focus = block.match(/"focus"\s*:\s*"([^"]*)"/i)?.[1];
    const workoutsSection = block.match(/"workouts"\s*:\s*\[([\s\S]*)/i)?.[1] ?? "";
    const workouts: ParsedWorkout[] = [];

    const workoutObjectRegex = /\{[\s\S]*?(?=\}\s*,?|\}$)/g;
    const workoutObjects = workoutsSection.match(workoutObjectRegex) ?? [];

    for (const workoutBlock of workoutObjects) {
      const workoutName =
        workoutBlock.match(/"(?:name|workoutName|workout)"\s*:\s*"([^"]+)"/i)?.[1] ?? "";
      const setsReps = workoutBlock.match(/"setsReps"\s*:\s*"([^"]+)"/i)?.[1];
      const sets = workoutBlock.match(/"sets"\s*:\s*"([^"]+)"/i)?.[1];
      const reps = workoutBlock.match(/"reps"\s*:\s*"([^"]+)"/i)?.[1];
      const notes = workoutBlock.match(/"notes"\s*:\s*"([^"]*)"/i)?.[1];

      if (!workoutName.trim()) continue;
      workouts.push({
        name: workoutName,
        setsReps,
        sets,
        reps,
        notes,
      });
    }

    if (day || focus || workouts.length > 0) {
      items.push({ day, focus, workouts });
    }
  }

  return items;
};

const salvageFlatPlanItems = (text: string): ParsedPlanItem[] => {
  const cleaned = normalizePlanText(text);
  const items: ParsedPlanItem[] = [];
  const itemRegex =
    /(?:"day"\s*:\s*"([^"]*)")?[\s\S]*?"focus"\s*:\s*"([^"]*)"[\s\S]*?"(?:name|workoutName|workout)"\s*:\s*"([^"]+)"[\s\S]*?(?:"setsReps"\s*:\s*"([^"]*)"|"sets"\s*:\s*"([^"]*)"(?:[\s\S]*?"reps"\s*:\s*"([^"]*)")?)[\s\S]*?(?:"notes"\s*:\s*"([^"]*)")?/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(cleaned)) !== null) {
    items.push({
      day: match[1],
      focus: match[2],
      name: match[3],
      setsReps: match[4],
      sets: match[5],
      reps: match[6],
      notes: match[7],
    });
  }

  return items;
};

const parseLinePlanItems = (text: string): ParsedPlanItem[] => {
  const lines = normalizePlanText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: ParsedPlanItem[] = [];
  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 2) continue;

    const [day, focus, name = "", sets = "", reps = "", notes = ""] = parts;
    if (!day) continue;

    items.push({
      day,
      focus,
      name,
      sets,
      reps,
      notes,
    });
  }

  return items;
};

const parsePlanResponse = (
  raw: string
): { plan: PlanItem[]; diagnostics: PlanParseDiagnostics } => {
  const jsonText = extractPlanJson(raw);
  const probablyTruncated =
    jsonText.trim().endsWith("{") ||
    jsonText.trim().endsWith("[") ||
    raw.trim().endsWith(",") ||
    raw.trim().endsWith(":");

  try {
    const parsed = JSON.parse(jsonText);
    const rawItems = unwrapParsedPlanItems(parsed);
    const plan = normalizeParsedItems(rawItems);
    return {
      plan,
      diagnostics: {
        source: "json",
        validJson: true,
        repairedJson: false,
        truncated: probablyTruncated,
        itemCount: rawItems.length,
        workoutCount: plan.reduce((sum, day) => sum + day.workouts.length, 0),
        outputLength: raw.length,
      },
    };
  } catch {
    const repaired = closeUnbalancedJson(jsonText);
    if (repaired !== jsonText) {
      try {
        const parsed = JSON.parse(repaired);
        const rawItems = unwrapParsedPlanItems(parsed);
        const plan = normalizeParsedItems(rawItems);
        return {
          plan,
          diagnostics: {
            source: "repaired_json",
            validJson: false,
            repairedJson: true,
            truncated: true,
            itemCount: rawItems.length,
            workoutCount: plan.reduce((sum, day) => sum + day.workouts.length, 0),
            outputLength: raw.length,
          },
        };
      } catch {
        // fall through to salvage parsing
      }
    }
  }

  const nestedItems = salvageNestedPlanItems(raw);
  const nestedPlan = normalizeParsedItems(nestedItems);
  if (nestedPlan.some((day) => day.workouts.length > 0)) {
    return {
      plan: nestedPlan,
      diagnostics: {
        source: "nested_regex",
        validJson: false,
        repairedJson: false,
        truncated: true,
        itemCount: nestedItems.length,
        workoutCount: nestedPlan.reduce((sum, day) => sum + day.workouts.length, 0),
        outputLength: raw.length,
      },
    };
  }

  const flatItems = salvageFlatPlanItems(raw);
  const flatPlan = normalizeParsedItems(flatItems);
  if (flatPlan.some((day) => day.workouts.length > 0)) {
    return {
      plan: flatPlan,
      diagnostics: {
        source: "flat_regex",
        validJson: false,
        repairedJson: false,
        truncated: true,
        itemCount: flatItems.length,
        workoutCount: flatPlan.reduce((sum, day) => sum + day.workouts.length, 0),
        outputLength: raw.length,
      },
    };
  }

  const lineItems = parseLinePlanItems(raw);
  const linePlan = normalizeParsedItems(lineItems);
  if (linePlan.some((day) => day.workouts.length > 0)) {
    return {
      plan: linePlan,
      diagnostics: {
        source: "line_format",
        validJson: false,
        repairedJson: false,
        truncated: false,
        itemCount: lineItems.length,
        workoutCount: linePlan.reduce((sum, day) => sum + day.workouts.length, 0),
        outputLength: raw.length,
      },
    };
  }

  return {
    plan: [],
    diagnostics: {
      source: "empty",
      validJson: false,
      repairedJson: false,
      truncated: probablyTruncated,
      itemCount: 0,
      workoutCount: 0,
      outputLength: raw.length,
    },
  };
};

const logPlanParse = (label: string, diagnostics: PlanParseDiagnostics) => {
  console.log(label, diagnostics);

  if (diagnostics.workoutCount === 0) {
    const reason =
      diagnostics.source === "empty"
        ? diagnostics.truncated
          ? "truncated output"
          : "invalid JSON or empty parsed workouts"
        : `salvage mode ${diagnostics.source} still produced zero workouts`;
    console.error(`AI plan parsing failure: ${reason}`);
  }
};

const generatePlanContent = async (
  prompt: string,
  options?: {
    maxOutputTokens?: number;
    timeoutMs?: number;
    temperature?: number;
    modelNames?: readonly string[];
    responseMimeType?: string;
  }
) => {
  const timeoutMs = options?.timeoutMs ?? 30000;
  const modelNames = options?.modelNames ?? PLAN_MODEL_CANDIDATES;
  let lastError: unknown;

  for (const modelName of modelNames) {
    try {
      const activeModel = createGenerativeModel(modelName);
      const response = activeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: options?.responseMimeType ?? "application/json",
          temperature: options?.temperature ?? 0.15,
          maxOutputTokens: options?.maxOutputTokens ?? 650,
        },
      } as any);

      const result = await Promise.race([
        response,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Plan generation timed out")), timeoutMs)
        ),
      ]);

      return { result, modelName };
    } catch (error) {
      lastError = error;
      const canFallback =
        isServiceUnavailableError(error) || isRateLimitError(error) || isTimeoutError(error);
      console.error(`Plan generation failed for ${modelName}`, error);
      if (!canFallback || modelName === modelNames[modelNames.length - 1]) {
        throw error;
      }
      console.warn(`Falling back to backup plan model after ${modelName}`);
    }
  }

  throw lastError ?? new Error("Plan generation failed");
};

export const aiPlanService = {
  parsePlanItems(raw: string) {
    return parsePlanResponse(raw).plan;
  },

  async getLatestPlan(userId: string) {
    const latest = await embeddingStoreService.getLatestBySource(userId, "plan");

    if (!latest) return [];
    return aiPlanService.parsePlanItems(latest.content);
  },

  async generatePlan(userId: string): Promise<PlanGenerationResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fitnessGoal: true,
        activityType: true,
        fitnessLevel: true,
      },
    });

    if (!user) {
      const err = new Error("User not found") as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }

    const retrievedContext = await retrieveContextBySources(
      userId,
      "Generate an optimal weekly workout plan from latest progress and previous plan data.",
      ["progress", "plan"],
      PLAN_CONTEXT_TOP_K,
      PLAN_CONTEXT_MAX_CHARS
    );
    const compactContext = compactPlanContext(retrievedContext || "none");

    const prompt = `
Return ONLY valid JSON in this exact schema:
${FLAT_PLAN_TEMPLATE}

Rules:
- Return a flat JSON array of workout items.
- Use keys exactly: "day", "focus", "name", "sets", "reps".
- One object = one workout.
- Return exactly 7 calendar days total.
- Training-day workout count must match workoutDuration: <=45 min -> 4 workouts, 46-70 min -> 5 workouts, >70 min -> 6 workouts.
- Non-training days must still appear with { "day": "<weekday>", "focus": "Rest", "name": "", "sets": "", "reps": "" }.
- Read "workoutFrequency" and "workoutDuration" from user context.
- Training days in the week must equal workoutFrequency (cap to 1-7).
- Keep exercise choice aligned with user goal and level from context.
- If context is missing, return a safe beginner 3-day full-body plan + rest days.
- No markdown, no code fences, no commentary, no explanation text.
- Do not stop early. Finish the full JSON array.

User context:
${compactContext}
`;

    let planItems: PlanItem[] = [];
    let modelFailure: unknown;
    let lastParseDiagnostics: PlanParseDiagnostics | null = null;
    let tokenLimitExceeded = false;
    let rateLimitExceeded = false;
    let timeoutExceeded = false;
    try {
      const { result, modelName } = await generatePlanContent(prompt, {
        maxOutputTokens: 650,
        timeoutMs: 30000,
        temperature: 0.1,
      });
      console.log("AI_PLAN_MODEL_PRIMARY:", modelName);
      const raw = result.response.text().trim();
      console.log("RAW_PLAN_RESPONSE:", raw);
      const parsed = parsePlanResponse(raw);
      planItems = parsed.plan;
      lastParseDiagnostics = parsed.diagnostics;
      logPlanParse("AI_PLAN_PARSE_PRIMARY:", parsed.diagnostics);
    } catch (error) {
      modelFailure = error;
      tokenLimitExceeded = isTokenLimitError(error);
      rateLimitExceeded = isRateLimitError(error);
      timeoutExceeded = isTimeoutError(error);
      console.error("Plan generation model call failed", error);
    }

    if (planItems.length === 0) {
      const retryPrompt = `
Return ONLY valid JSON.
Schema:
${FLAT_PLAN_TEMPLATE}

Strict rules:
- Return a flat JSON array of workout items.
- Use keys exactly: "day", "focus", "name", "sets", "reps".
- Return exactly 7 calendar days total.
- Non-training days must appear with empty "name", "sets", and "reps".
- Use short exercise names and short numeric strings only.
- No markdown, no prose, no comments, no code fences.
`;
      try {
        const { result: retry, modelName } = await generatePlanContent(retryPrompt, {
          maxOutputTokens: 450,
          timeoutMs: 20000,
          temperature: 0.05,
        });
        console.log("AI_PLAN_MODEL_RETRY:", modelName);
        const retryRaw = retry.response.text().trim();
        console.log("RAW_PLAN_RESPONSE_RETRY:", retryRaw);
        const parsedRetry = parsePlanResponse(retryRaw);
        planItems = parsedRetry.plan;
        lastParseDiagnostics = parsedRetry.diagnostics;
        logPlanParse("AI_PLAN_PARSE_RETRY:", parsedRetry.diagnostics);
      } catch (error) {
        modelFailure = error;
        tokenLimitExceeded = tokenLimitExceeded || isTokenLimitError(error);
        rateLimitExceeded = rateLimitExceeded || isRateLimitError(error);
        timeoutExceeded = timeoutExceeded || isTimeoutError(error);
        console.error("Plan generation retry failed", error);
      }
    }

    if (planItems.length === 0) {
      const finalRetryPrompt = `
Return plain text only.
Use exactly one line per workout or rest day in this format:
day|focus|name|sets|reps|notes

Rules:
- Return exactly 7 calendar days total.
- Use one line per workout for training days.
- For rest days return: day|Rest||||
- No JSON.
- No markdown.
- No explanations.
- Use short values only.
`;
      try {
        const { result: finalRetry, modelName } = await generatePlanContent(finalRetryPrompt, {
          maxOutputTokens: 350,
          timeoutMs: 15000,
          temperature: 0.05,
          responseMimeType: "text/plain",
        });
        console.log("AI_PLAN_MODEL_FINAL_RETRY:", modelName);
        const finalRetryRaw = finalRetry.response.text().trim();
        console.log("RAW_PLAN_RESPONSE_FINAL_RETRY:", finalRetryRaw);
        const parsedFinalRetry = parsePlanResponse(finalRetryRaw);
        planItems = parsedFinalRetry.plan;
        lastParseDiagnostics = parsedFinalRetry.diagnostics;
        logPlanParse("AI_PLAN_PARSE_FINAL_RETRY:", parsedFinalRetry.diagnostics);
      } catch (error) {
        modelFailure = error;
        tokenLimitExceeded = tokenLimitExceeded || isTokenLimitError(error);
        rateLimitExceeded = rateLimitExceeded || isRateLimitError(error);
        timeoutExceeded = timeoutExceeded || isTimeoutError(error);
        console.error("Plan generation final retry failed", error);
      }
    }

    if (planItems.length === 0) {
      const failureBanner = rateLimitExceeded
        ? "AI plan provider is temporarily busy. Showing your previous plan."
        : tokenLimitExceeded
        ? "Token limit exceeded while generating your plan. Please try again shortly."
        : timeoutExceeded
        ? "Plan generation timed out. Please try again."
        : summarizeError(modelFailure)
        ? `Plan generation failed: ${summarizeError(modelFailure)}`
        : "Plan generation failed due to an AI service error. Showing your previous plan.";

      const previousPlan = await prisma.plan.findUnique({
        where: { userId },
        select: { workoutPlan: true },
      });

      const previousFromPlanTable = previousPlan?.workoutPlan
        ? aiPlanService.parsePlanItems(previousPlan.workoutPlan)
        : [];

      if (previousFromPlanTable.length > 0) {
        return {
          plan: previousFromPlanTable,
          usedFallback: true,
          banner: failureBanner,
        };
      }

      const latestEmbedding = await embeddingStoreService.getLatestBySource(
        userId,
        "plan"
      );
      const previousFromEmbedding = latestEmbedding
        ? aiPlanService.parsePlanItems(latestEmbedding.content)
        : [];

      if (previousFromEmbedding.length > 0) {
        return {
          plan: previousFromEmbedding,
          usedFallback: true,
          banner: failureBanner,
        };
      }

      const details =
        modelFailure && typeof modelFailure === "object" && "message" in (modelFailure as any)
          ? String((modelFailure as any).message)
          : "";
      const parseDetails = !modelFailure && lastParseDiagnostics
        ? lastParseDiagnostics.source === "empty"
          ? lastParseDiagnostics.truncated
            ? "AI returned truncated or partial JSON"
            : "AI returned JSON that could not be parsed into any workouts"
          : `AI response could not be normalized reliably (${lastParseDiagnostics.source})`
        : "";
      const err = new Error(
        rateLimitExceeded
          ? "AI plan provider is temporarily busy. Please try again."
          : tokenLimitExceeded
          ? "Token limit exceeded. Please reduce context size and try again."
          : timeoutExceeded
          ? "Plan generation timed out. Please try again."
          : details
          ? `Failed to generate a valid AI workout plan: ${details}`
          : parseDetails
          ? `Failed to generate a valid AI workout plan: ${parseDetails}`
          : "Failed to generate a valid AI workout plan"
      ) as Error & {
        statusCode?: number;
        banner?: string;
      };
      err.statusCode = rateLimitExceeded ? 503 : tokenLimitExceeded ? 413 : 502;
      err.banner = failureBanner;
      throw err;
    }

    console.log("Generated plan items:", planItems);
    const planText = JSON.stringify(planItems);

    const existingPlan = await prisma.plan.findUnique({
      where: { userId },
      select: {
        calories: true,
        protein: true,
        carbs: true,
        fats: true,
      },
    });

    const defaultMacrosByGoal = {
      FAT_LOSS: { calories: 1800, protein: 140, carbs: 170, fats: 60 },
      WEIGHT_GAIN: { calories: 2600, protein: 160, carbs: 320, fats: 75 },
      MUSCLE_GAIN: { calories: 2400, protein: 165, carbs: 280, fats: 70 },
      MAINTENANCE: { calories: 2100, protein: 140, carbs: 220, fats: 70 },
      STRENGTH_INCREASE: { calories: 2400, protein: 160, carbs: 260, fats: 70 },
      ENDURANCE_INCREASE: { calories: 2300, protein: 140, carbs: 290, fats: 65 },
      FLEXIBILITY: { calories: 2000, protein: 125, carbs: 220, fats: 65 },
      MOBILITY: { calories: 2000, protein: 125, carbs: 220, fats: 65 },
      BALANCE: { calories: 2000, protein: 125, carbs: 220, fats: 65 },
      ATHLETIC_PERFORMANCE: { calories: 2600, protein: 170, carbs: 320, fats: 75 },
      PHYSICAL_REHABILITATION: { calories: 2100, protein: 145, carbs: 220, fats: 70 },
    } as const;

    const fallbackMacros = defaultMacrosByGoal[user.fitnessGoal];
    const calories = existingPlan?.calories ?? fallbackMacros.calories;
    const protein = existingPlan?.protein ?? fallbackMacros.protein;
    const carbs = existingPlan?.carbs ?? fallbackMacros.carbs;
    const fats = existingPlan?.fats ?? fallbackMacros.fats;

    await prisma.plan.upsert({
      where: { userId },
      update: {
        goal: user.fitnessGoal,
        activity: user.activityType,
        level: user.fitnessLevel,
        workoutPlan: planText,
      },
      create: {
        userId,
        goal: user.fitnessGoal,
        activity: user.activityType,
        level: user.fitnessLevel,
        calories,
        protein,
        carbs,
        fats,
        workoutPlan: planText,
      },
    });

    void (async () => {
      try {
        const hasPlanEmbedding = await embeddingStoreService.hasExactContent(
          userId,
          "plan",
          planText
        );
        if (hasPlanEmbedding) return;

        const planEmbedding = await createEmbedding(planText);
        await prisma.$executeRaw`
          INSERT INTO "DocumentEmbedding"
            (id, "userId", source, content, embedding)
          VALUES
            (${crypto.randomUUID()}, ${userId}, 'plan', ${planText}, ${planEmbedding}::vector)
        `;
      } catch (error) {
        console.error("Plan embedding background write failed", error);
      }
    })();

    return {
      plan: planItems,
      usedFallback: false,
    };
  },
};
