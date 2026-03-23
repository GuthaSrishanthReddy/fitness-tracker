import { Router } from "express";

import { getMe, getMyTrainer, updateMe, setup } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, getMe);
router.get("/my-trainer", authMiddleware, getMyTrainer);
router.put("/me", authMiddleware, updateMe);
router.post("/setup", authMiddleware, setup);

export default router;
