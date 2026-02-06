import { Router } from "express";

import {
  chatWithAI,
  analyzeProgress,
  chatWithChatbot
} from "../controllers/ai.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/chat", authMiddleware, chatWithAI);
router.post("/chatbot", authMiddleware, chatWithChatbot);

router.post("/analyze-progress", authMiddleware, analyzeProgress);

export default router;
