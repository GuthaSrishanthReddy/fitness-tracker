export const ROLES = {
  USER: "USER",
  TRAINER: "TRAINER"
} as const;

export const PROGRESS_RULES = {
  MAX_PER_DAY: 1,
  MIN_GAP_DAYS: 10
};


export const PLAN_CONTEXT_TOP_K = 5;
export const PLAN_CONTEXT_MAX_CHARS = 900;
export const WEEK_DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
] as const;

export const AI_LIMITS = {
  MAX_CONTEXT_ENTRIES: 5
};

export const planTemplate = 
    [
  {
    "day": "Monday",
    "focus": "Push A (Chest Emphasis)",
    "workouts": [
      { "workoutName": "Barbell Bench Press", "setsReps": "3 x 5-8", "notes": "Primary strength movement" },
      { "workoutName": "Incline Dumbbell Press", "setsReps": "3 x 8-10", "notes": "Upper chest focus" },
      { "workoutName": "Seated Dumbbell Shoulder Press", "setsReps": "3 x 8-10", "notes": "Stable vertical press" },
      { "workoutName": "Cable Lateral Raises", "setsReps": "3 x 12-15", "notes": "Strict form for medial delts" },
      { "workoutName": "Tricep Pushdowns", "setsReps": "3 x 10-12", "notes": "Controlled lockout" }
    ]
  },
  {
    "day": "Tuesday",
    "focus": "Pull A (Lat Emphasis)",
    "workouts": [
      { "workoutName": "Pull-Ups", "setsReps": "3 x 6-10", "notes": "Full stretch at bottom" },
      { "workoutName": "Chest-Supported Row", "setsReps": "3 x 8-10", "notes": "Mid-back focus" },
      { "workoutName": "Lat Pulldown", "setsReps": "3 x 10-12", "notes": "Controlled movement" },
      { "workoutName": "Face Pulls", "setsReps": "3 x 12-15", "notes": "Rear delt health" },
      { "workoutName": "Hammer Curls", "setsReps": "3 x 10-12", "notes": "Forearm and brachialis" }
    ]
  },
  {
    "day": "Wednesday",
    "focus": "Rest",
    "workouts": []
  },
  {
    "day": "Thursday",
    "focus": "Legs (Quad Emphasis)",
    "workouts": [
      { "workoutName": "Back Squats", "setsReps": "3 x 5-8", "notes": "Primary quad compound" },
      { "workoutName": "Bulgarian Split Squats", "setsReps": "3 x 8-10", "notes": "Unilateral strength" },
      { "workoutName": "Leg Press", "setsReps": "3 x 10-12", "notes": "Controlled depth" },
      { "workoutName": "Seated Leg Curls", "setsReps": "3 x 10-12", "notes": "Hamstring balance" },
      { "workoutName": "Standing Calf Raises", "setsReps": "3 x 12-15", "notes": "Pause at stretch" }
    ]
  },
  {
    "day": "Friday",
    "focus": "Upper (Mixed Push/Pull)",
    "workouts": [
      { "workoutName": "Standing Barbell Overhead Press", "setsReps": "3 x 5-8", "notes": "Primary shoulder press" },
      { "workoutName": "Flat Dumbbell Press", "setsReps": "3 x 8-10", "notes": "Chest hypertrophy" },
      { "workoutName": "Seated Cable Rows", "setsReps": "3 x 8-10", "notes": "Back thickness" },
      { "workoutName": "Reverse Pec Deck", "setsReps": "3 x 12-15", "notes": "Rear delt isolation" },
      { "workoutName": "EZ-Bar Curls", "setsReps": "3 x 10-12", "notes": "Biceps control" }
    ]
  },
  {
    "day": "Saturday",
    "focus": "Posterior Chain",
    "workouts": [
      { "workoutName": "Romanian Deadlifts", "setsReps": "3 x 6-8", "notes": "Hamstring hinge" },
      { "workoutName": "Front Squats", "setsReps": "3 x 8-10", "notes": "Quad focus upright torso" },
      { "workoutName": "Walking Lunges", "setsReps": "3 x 10 each leg", "notes": "Glute engagement" },
      { "workoutName": "Lying Leg Curls", "setsReps": "3 x 10-12", "notes": "Direct hamstring work" },
      { "workoutName": "Hanging Leg Raises", "setsReps": "3 x 12-15", "notes": "Core control" }
    ]
  },
  {
    "day": "Sunday",
    "focus": "Rest",
    "workouts": []
  }
];

export const mealsTemplate = 
[
  {
    "mealName": "Breakfast",
    "minCarbs": 40,
    "maxCarbs": 60,
    "minProtein": 15,
    "maxProtein": 20,
    "minFat": 10,
    "maxFat": 20
  },
  {
    "mealName": "Mid-Morning Snack",
    "minCarbs": 20,
    "maxCarbs": 35,
    "minProtein": 8,
    "maxProtein": 12,
    "minFat": 5,
    "maxFat": 10
  },
  {
    "mealName": "Lunch",
    "minCarbs": 50,
    "maxCarbs": 70,
    "minProtein": 18,
    "maxProtein": 22,
    "minFat": 10,
    "maxFat": 20
  },
  {
    "mealName": "Pre-Workout",
    "minCarbs": 30,
    "maxCarbs": 50,
    "minProtein": 5,
    "maxProtein": 10,
    "minFat": 0,
    "maxFat": 8
  },
  {
    "mealName": "Post-Workout",
    "minCarbs": 40,
    "maxCarbs": 60,
    "minProtein": 15,
    "maxProtein": 20,
    "minFat": 0,
    "maxFat": 8
  },
  {
    "mealName": "Dinner",
    "minCarbs": 30,
    "maxCarbs": 50,
    "minProtein": 12,
    "maxProtein": 18,
    "minFat": 10,
    "maxFat": 20
  }
];