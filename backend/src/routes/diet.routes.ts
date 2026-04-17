import { Router } from "express";

import {
  generateAiDiet,
  getLatestAiDiet,
  getMealRecipeDetails,
} from "../controllers/diet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/ai", authMiddleware, generateAiDiet);
router.get("/ai/latest", authMiddleware, getLatestAiDiet);
router.get("/recipe", authMiddleware, getMealRecipeDetails);

export default router;
