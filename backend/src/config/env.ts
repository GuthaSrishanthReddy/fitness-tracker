import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GOOGLE_API_KEY",
  "SPOONACULAR_API_KEY",
  
] as const;

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
});

export const env = {
  PORT: Number(process.env.PORT ?? 5000),
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  NODE_ENV: process.env.NODE_ENV || "development",
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY as string,
  SPOONACULAR_API_KEY: process.env.SPOONACULAR_API_KEY as string,
};
