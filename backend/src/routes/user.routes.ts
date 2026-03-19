import { Router } from "express";

import { getMe, updateMe, setup } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.post("/setup", authMiddleware, setup);

export default router;
