import { Router } from "express";

import {
  chatWithAI,
  analyzeProgress
} from "../controllers/ai.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/chat", authMiddleware, chatWithAI);

router.post("/analyze-progress", authMiddleware, analyzeProgress);

export default router;
