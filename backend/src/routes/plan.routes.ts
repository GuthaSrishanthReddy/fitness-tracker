import { Router } from "express";

import { getMyPlan, updateMyPlan } from "../controllers/plan.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/my", authMiddleware, getMyPlan);
router.put("/my", authMiddleware, updateMyPlan);

export default router;
