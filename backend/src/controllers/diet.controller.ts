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

    const userId = req.user.id;
    const storedRecipes = await aiDietService.getStoredMealRecipes(userId, meal);
    if (storedRecipes !== null) {
      return res.json(storedRecipes);
    }

    try {
      const recipes = await getMealRecipes(meal, { requestMode: "interactive" });
      await aiDietService.cacheMealRecipes(userId, meal, recipes);
      return res.json(recipes);
    } catch {
      return res.status(502).json({ success: false, message: "Failed to fetch from spoonacular" });
    }
  } catch (error) {
    next(error);
  }
};
