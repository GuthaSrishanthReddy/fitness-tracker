import { Response, NextFunction } from "express";
import { aiDietService } from "../services/aiDiet.service";
import { AuthRequest } from "../types/auth.types";
import { getMealRecipes } from "../services/recipe.service";

export const generateAiDiet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const dietItems = await aiDietService.generateDiet(userId);
    res.json(dietItems);
  } catch (error) {
    next(error);
  }
};

export const getLatestAiDiet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const dietItems = await aiDietService.getLatestDiet(userId);
    res.json(dietItems);
  } catch (error) {
    next(error);
  }
};

export const getMealRecipeDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const meal =
      typeof req.query.meal === "string" ? req.query.meal.trim() : "";

    if (!meal) {
      return res.status(400).json({ message: "Query parameter 'meal' is required" });
    }

    const recipes = await getMealRecipes(meal);
    res.json(recipes);
  } catch (error) {
    next(error);
  }
};
