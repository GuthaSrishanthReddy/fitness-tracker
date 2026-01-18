import { Router } from "express";

import {
  getProgressHistory,
  createOrUpdateProgress
} from "../controllers/progress.controller";

import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getProgressHistory);

router.post("/", authMiddleware, createOrUpdateProgress);

export default router;
