import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth.types";
import { progressService } from "../services/progress.service";
import { aiPlanService } from "../services/aiPlan.service";
import { aiDietService } from "../services/aiDiet.service";
import { aiSupplementService } from "../services/aiSupplement.service";

export const getProgressHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const history = await progressService.getProgressHistory(userId);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
)=> {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const progress = await progressService.createOrUpdateProgress(
      userId,
      req.body
    );
    try {
      await aiPlanService.generatePlan(userId);
      await aiDietService.generateDiet(userId);
      await aiSupplementService.generateSupplements(userId);
    } catch (err) {
      console.error("Failed to generate AI plan/diet/supplements", err);
    }
    res.status(201).json(progress);
  } catch (error) {
    next(error);
  }
};
