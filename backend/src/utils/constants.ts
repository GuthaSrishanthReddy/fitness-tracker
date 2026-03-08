export const ROLES = {
  USER: "USER",
  TRAINER: "TRAINER"
} as const;

export const PROGRESS_RULES = {
  MAX_PER_DAY: 1,
  MIN_GAP_DAYS: 10
};

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