export const SAFE_RANGES = {
  // Weight in kg
  weight: { min: 20, max: 300 },
  
  // Waist circumference in cm
  waistCircumference: { min: 40, max: 200 },
  
  // Resting heart rate in bpm
  restingHeartRate: { min: 30, max: 200 },
  
  // Sleep hours
  sleepHours: { min: 0, max: 24 },
  
  // Protein intake in grams
  proteinIntake: { min: 0, max: 400 },
  
  // Cardio minutes
  cardioMinutes: { min: 0, max: 1000 },
  
  // Stress level 1-5
  stressLevel: { min: 1, max: 5 },
  
  // Body fat percentage
  bodyFat: { min: 2, max: 70 },
  
  // Muscle mass in kg
  muscleMass: { min: 5, max: 80 },
  
  // Workout frequency per week
  workoutFrequency: { min: 0, max: 14 },
  
  // Workout duration in minutes
  workoutDuration: { min: 0, max: 300 }
};
