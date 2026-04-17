import { prisma } from "../config/db";
import { createEmbedding } from "./embedding.service";
import { model } from "./model.service";
import { embeddingStoreService } from "./embeddingStore.service";
import { planTemplate, WEEK_DAYS,  } from "../utils/constants";
import crypto from "crypto";
import { retrieveContextBySources } from "./rag.retrieve";
import { WeekDay, PlanItem, PlanGenerationResult, PlanParseDiagnostics, ParsedWorkout, ParsedPlanItem, PlanWorkout, PlanInput } from "../types/plan.types";
import {PLAN_CONTEXT_TOP_K, PLAN_CONTEXT_MAX_CHARS} from "../utils/constants";

// ── Error helpers ─────────────────────────────────────────────────────────────

const getRawErrorMsg = (error: unknown): string =>
  error != null && typeof error === "object" && "message" in error
    ? String((error as any).message)
    : "";

const errorMsg = (error: unknown) => getRawErrorMsg(error).toLowerCase();

const isTokenLimitError = (error: unknown): boolean => {
  const msg = errorMsg(error);
  return msg.includes("token") && (
    msg.includes("limit") || msg.includes("exceed") ||
    msg.includes("too many") || msg.includes("context")
  );
};

const isRateLimitError = (error: unknown): boolean => {
  const msg = errorMsg(error);
  return msg.includes("rate limit") || msg.includes("quota") ||
    msg.includes("too many requests") || msg.includes("429");
};

const isTimeoutError = (error: unknown): boolean => {
  const msg = errorMsg(error);
  return msg.includes("timed out") || msg.includes("timeout");
};

const summarizeError = (error: unknown): string => {
  const msg = getRawErrorMsg(error).trim();
  return msg.length > 120 ? `${msg.slice(0, 117)}...` : msg;
};

// ── Text helpers ──────────────────────────────────────────────────────────────

const compactPlanContext = (text: string) =>
  text.replace(/\s+/g, " ").replace(/Date:\s*/gi, "Date: ").trim().slice(0, PLAN_CONTEXT_MAX_CHARS);

const normalizePlanText = (text: string) =>
  text
    .replace(/[â€œâ€]/g, "\"")
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
    firstArray === -1 ? firstObj :
    firstObj === -1 ? firstArray :
    Math.min(firstArray, firstObj);
  if (start === -1) return cleaned;
  const lastArray = cleaned.lastIndexOf("]");
  const lastObj = cleaned.lastIndexOf("}");
  const end =
    lastArray === -1 ? lastObj :
    lastObj === -1 ? lastArray :
    Math.max(lastArray, lastObj);
  return end >= start ? cleaned.slice(start, end + 1).trim() : cleaned.slice(start).trim();
};

const closeUnbalancedJson = (text: string) => {
  let repaired = text.trim();
  const openCurly = (repaired.match(/\{/g) || []).length;
  const closeCurly = (repaired.match(/\}/g) || []).length;
  const openSquare = (repaired.match(/\[/g) || []).length;
  const closeSquare = (repaired.match(/\]/g) || []).length;
  if (closeCurly < openCurly) repaired += "}".repeat(openCurly - closeCurly);
  if (closeSquare < openSquare) repaired += "]".repeat(openSquare - closeSquare);
  return repaired;
};

// ── Plan data helpers ─────────────────────────────────────────────────────────

const normalizeDay = (value: unknown, index: number): WeekDay => {
  const fallback = WEEK_DAYS[index % WEEK_DAYS.length];
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().toLowerCase();
  return WEEK_DAYS.find((d) => d.toLowerCase() === cleaned) ?? fallback;
};

const toPlanWorkout = (input: ParsedWorkout): PlanWorkout | null => {
  const workoutName = String(
    input.workoutName ?? input.workout ?? input.name ?? input.exercise ?? input.title ?? ""
  ).trim();
  if (!workoutName) return null;
  const setsReps = String(
    input.setsReps ??
      (input.sets && input.reps ? `${input.sets} x ${input.reps}` : input.sets ?? input.reps ?? "")
  ).trim();
  return { workoutName, setsReps, notes: String(input.notes ?? "").trim() };
};

const toParsedWorkout = (input: ParsedWorkout | string): ParsedWorkout | null => {
  if (typeof input === "string") {
    const text = input.trim();
    if (!text) return null;
    const matched = text.match(
      /^(.*?)\s*(?:-|:|,)\s*(\d+(?:-\d+)?)\s*(?:x|sets?)\s*(\d+(?:-\d+)?(?:\s*each leg)?)?$/i
    );
    return matched
      ? { name: matched[1].trim(), sets: matched[2].trim(), reps: matched[3]?.trim() ?? "" }
      : { name: text };
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
      .map(toParsedWorkout).filter(Boolean)
      .map((entry) => toPlanWorkout(entry as ParsedWorkout)).filter(Boolean) as PlanWorkout[];

    if (!grouped.has(day)) grouped.set(day, { focus, workouts: [] });
    const existing = grouped.get(day)!;
    if (!existing.focus && focus) existing.focus = focus;
    existing.workouts.push(...normalizedWorkouts);
  }

  return WEEK_DAYS.filter((day) => grouped.has(day)).map((day) => ({
    day,
    focus: grouped.get(day)!.focus || "General",
    workouts: grouped.get(day)!.workouts,
  }));
};

// ── Salvage parsers ───────────────────────────────────────────────────────────

const parseLinePlanItems = (text: string): ParsedPlanItem[] => {
  const lines = normalizePlanText(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedPlanItem[] = [];
  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) continue;
    const [day, focus, name = "", sets = "", reps = "", notes = ""] = parts;
    if (!day) continue;
    items.push({ day, focus, name, sets, reps, notes });
  }
  return items;
};

const parseFreeformTextPlanItems = (text: string): ParsedPlanItem[] => {
  const lines = normalizePlanText(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedPlanItem[] = [];
  let currentDay: string | undefined;
  let currentFocus = "General";

  for (const line of lines) {
    const dayHeader = line.match(
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*:?\s*(.*)$/i
    );
    if (dayHeader) {
      currentDay = dayHeader[1];
      const trailing = dayHeader[2].trim();
      currentFocus = trailing.replace(/^[-|:]/, "").trim().replace(/^focus\s*[:\-]?\s*/i, "") || "General";
      continue;
    }

    if (!currentDay) continue;
    const bullet = line.replace(/^[-*•\d.)\s]+/, "").trim();
    if (!bullet) continue;

    if (/^rest\b/i.test(bullet)) {
      items.push({ day: currentDay, focus: "Rest", name: "", sets: "", reps: "", notes: "" });
      continue;
    }

    const structured = bullet.match(
      /^(.*?)(?:\s+[xX]\s*|\s*[-,:]\s*)?(\d+(?:-\d+)?)?\s*(?:sets?)?\s*(?:[xX]\s*)?(\d+(?:-\d+)?(?:\s*each leg)?)?\s*(.*)$/i
    );
    const name = structured?.[1]?.trim() || bullet;
    if (!name) continue;
    items.push({
      day: currentDay,
      focus: currentFocus,
      name,
      sets: structured?.[2]?.trim() || "",
      reps: structured?.[3]?.trim() || "",
      notes: structured?.[4]?.trim() || "",
    });
  }
  return items;
};

// ── Plan response parsing ─────────────────────────────────────────────────────

const makeDiagnostics = (
  source: PlanParseDiagnostics["source"],
  rawItems: ParsedPlanItem[],
  plan: PlanItem[],
  raw: string,
  truncated: boolean
): PlanParseDiagnostics => ({
  source,
  validJson: source === "json",
  repairedJson: source === "repaired_json",
  truncated,
  itemCount: rawItems.length,
  workoutCount: plan.reduce((sum, d) => sum + d.workouts.length, 0),
  outputLength: raw.length,
});

const parsePlanResponse = (raw: string): { plan: PlanItem[]; diagnostics: PlanParseDiagnostics } => {
  const jsonText = extractPlanJson(raw);
  const probablyTruncated =
    jsonText.trim().endsWith("{") || jsonText.trim().endsWith("[") ||
    raw.trim().endsWith(",") || raw.trim().endsWith(":");

  // Attempt 1: clean JSON parse
  try {
    const parsed = JSON.parse(jsonText);
    const rawItems = unwrapParsedPlanItems(parsed);
    const plan = normalizeParsedItems(rawItems);
    return { plan, diagnostics: makeDiagnostics("json", rawItems, plan, raw, probablyTruncated) };
  } catch { console.log("Failed to parse JSON") }

  // Attempt 2: repaired JSON
  const repaired = closeUnbalancedJson(jsonText);
  if (repaired !== jsonText) {
    try {
      const parsed = JSON.parse(repaired);
      const rawItems = unwrapParsedPlanItems(parsed);
      const plan = normalizeParsedItems(rawItems);
      return { plan, diagnostics: makeDiagnostics("repaired_json", rawItems, plan, raw, true) };
    } catch { console.log("Failed to parse repaired JSON") }
  }

  // Attempts 3–4: salvage parsers for when the model ignores JSON instructions
  const salvageAttempts: Array<[PlanParseDiagnostics["source"], () => ParsedPlanItem[], boolean]> = [
    ["line_format",  () => parseLinePlanItems(raw),         false],
    ["text_salvage", () => parseFreeformTextPlanItems(raw), false],
  ];

  for (const [source, parse, truncated] of salvageAttempts) {
    const rawItems = parse();
    const plan = normalizeParsedItems(rawItems);
    if (plan.some((d) => d.workouts.length > 0)) {
      return { plan, diagnostics: makeDiagnostics(source, rawItems, plan, raw, truncated) };
    }
  }

  return { plan: [], diagnostics: makeDiagnostics("empty", [], [], raw, probablyTruncated) };
};

const logPlanParse = (label: string, diagnostics: PlanParseDiagnostics) => {
  console.log(label, diagnostics);
  if (diagnostics.workoutCount === 0) {
    const reason =
      diagnostics.source === "empty"
        ? diagnostics.truncated ? "truncated output" : "invalid JSON or empty parsed workouts"
        : `salvage mode ${diagnostics.source} still produced zero workouts`;
    console.error(`AI plan parsing failure: ${reason}`);
  }
};

// ── Model call ────────────────────────────────────────────────────────────────

const generatePlanContent = async (
  prompt: string,
  options?: { maxOutputTokens?: number; timeoutMs?: number; temperature?: number; responseMimeType?: string; }
) => {
  const timeoutMs = options?.timeoutMs ?? 30000;
  const response = model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: options?.responseMimeType ?? "application/json",
      temperature: options?.temperature ?? 0.15,
      maxOutputTokens: options?.maxOutputTokens ?? 650,
    },
  } as any);

  return Promise.race([
    response,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Plan generation timed out")), timeoutMs)
    ),
  ]);
};

// ── Service ───────────────────────────────────────────────────────────────────

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
      select: { fitnessGoal: true, activityType: true, fitnessLevel: true },
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
${planTemplate}

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
    const errorFlags = { tokenLimit: false, rateLimit: false, timeout: false };

    const trackError = (error: unknown) => {
      errorFlags.tokenLimit = errorFlags.tokenLimit || isTokenLimitError(error);
      errorFlags.rateLimit  = errorFlags.rateLimit  || isRateLimitError(error);
      errorFlags.timeout    = errorFlags.timeout    || isTimeoutError(error);
    };

    // Primary attempt
    try {
      const result = await generatePlanContent(prompt, { maxOutputTokens: 650, timeoutMs: 30000, temperature: 0.1 });
      const raw = result.response.text().trim();
      console.log("RAW_PLAN_RESPONSE:", raw);
      const parsed = parsePlanResponse(raw);
      planItems = parsed.plan;
      lastParseDiagnostics = parsed.diagnostics;
      logPlanParse("AI_PLAN_PARSE_PRIMARY:", parsed.diagnostics);
    } catch (error) {
      modelFailure = error;
      trackError(error);
      console.error("Plan generation model call failed", error);
    }

    // Retry with minimal JSON prompt
    if (planItems.length === 0) {
      const retryPrompt = `
Return ONLY valid JSON.
Schema:
${planTemplate}

Strict rules:
- Return a flat JSON array of workout items.
- Use keys exactly: "day", "focus", "name", "sets", "reps".
- Return exactly 7 calendar days total.
- Non-training days must appear with empty "name", "sets", and "reps".
- Use short exercise names and short numeric strings only.
- No markdown, no prose, no comments, no code fences.
`;
      try {
        const result = await generatePlanContent(retryPrompt, { maxOutputTokens: 450, timeoutMs: 20000, temperature: 0.05 });
        const raw = result.response.text().trim();
        console.log("RAW_PLAN_RESPONSE_RETRY:", raw);
        const parsed = parsePlanResponse(raw);
        planItems = parsed.plan;
        lastParseDiagnostics = parsed.diagnostics;
        logPlanParse("AI_PLAN_PARSE_RETRY:", parsed.diagnostics);
      } catch (error) {
        modelFailure = error;
        trackError(error);
        console.error("Plan generation retry failed", error);
      }
    }

    // Final retry with plain text format
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
        const result = await generatePlanContent(finalRetryPrompt, {
          maxOutputTokens: 350, timeoutMs: 15000, temperature: 0.05, responseMimeType: "text/plain",
        });
        const raw = result.response.text().trim();
        console.log("RAW_PLAN_RESPONSE_FINAL_RETRY:", raw);
        const parsed = parsePlanResponse(raw);
        planItems = parsed.plan;
        lastParseDiagnostics = parsed.diagnostics;
        logPlanParse("AI_PLAN_PARSE_FINAL_RETRY:", parsed.diagnostics);
      } catch (error) {
        modelFailure = error;
        trackError(error);
        console.error("Plan generation final retry failed", error);
      }
    }

    // All attempts failed — try to return a previous plan
    if (planItems.length === 0) {
      const { rateLimit, tokenLimit, timeout } = errorFlags;

      const failureBanner = rateLimit
        ? "AI plan provider is temporarily busy. Showing your previous plan."
        : tokenLimit
        ? "Token limit exceeded while generating your plan. Please try again shortly."
        : timeout
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
        return { plan: previousFromPlanTable, usedFallback: true, banner: failureBanner };
      }

      const latestEmbedding = await embeddingStoreService.getLatestBySource(userId, "plan");
      const previousFromEmbedding = latestEmbedding
        ? aiPlanService.parsePlanItems(latestEmbedding.content)
        : [];

      if (previousFromEmbedding.length > 0) {
        return { plan: previousFromEmbedding, usedFallback: true, banner: failureBanner };
      }

      const details = getRawErrorMsg(modelFailure);
      const parseDetails = !modelFailure && lastParseDiagnostics
        ? lastParseDiagnostics.source === "empty"
          ? lastParseDiagnostics.truncated
            ? "AI returned truncated or partial JSON"
            : "AI returned JSON that could not be parsed into any workouts"
          : `AI response could not be normalized reliably (${lastParseDiagnostics.source})`
        : "";

      const err = new Error(
        rateLimit    ? "AI plan provider is temporarily busy. Please try again." :
        tokenLimit   ? "Token limit exceeded. Please reduce context size and try again." :
        timeout      ? "Plan generation timed out. Please try again." :
        details      ? `Failed to generate a valid AI workout plan: ${details}` :
        parseDetails ? `Failed to generate a valid AI workout plan: ${parseDetails}` :
                       "Failed to generate a valid AI workout plan"
      ) as Error & { statusCode?: number; banner?: string };
      err.statusCode = rateLimit ? 503 : tokenLimit ? 413 : 502;
      err.banner = failureBanner;
      throw err;
    }

    // Success — persist plan and embed in background
    const planText = JSON.stringify(planItems);
    console.log("Generated plan items:", planItems);

    await prisma.plan.upsert({
      where: { userId },
      update: { goal: user.fitnessGoal, activity: user.activityType, level: user.fitnessLevel, workoutPlan: planText },
      create: { userId, goal: user.fitnessGoal, activity: user.activityType, level: user.fitnessLevel, calories: 2000, protein: 150, carbs: 250, fats: 70, workoutPlan: planText },
    });

    void (async () => {
      try {
        const hasPlanEmbedding = await embeddingStoreService.hasExactContent(userId, "plan", planText);
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

    return { plan: planItems, usedFallback: false };
  },
};
