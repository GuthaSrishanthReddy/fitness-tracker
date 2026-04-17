import {WEEK_DAYS} from "../utils/constants";

export interface PlanInput {
  goal: "FAT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE";
  calories: number;

  protein: number;
  carbs: number;
  fats: number;

  workoutPlan: string;
  meditationPlan?: string;
  supplementPlan?: string;
}


export type WeekDay = (typeof WEEK_DAYS)[number];

export type PlanWorkout = {
  workoutName: string;
  setsReps: string;
  notes: string;
};

export type PlanItem = {
  day: WeekDay;
  focus: string;
  workouts: PlanWorkout[];
};

export type ParsedWorkout = {
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

export type ParsedPlanItem = {
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

export type PlanParseDiagnostics = {
  source: "json" | "repaired_json" | "line_format" | "text_salvage" | "empty";
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