import { Router } from "express";

import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import trainerRoutes from "./trainer.routes";
import progressRoutes from "./progress.routes";
import planRoutes from "./plan.routes";
import messageRoutes from "./message.routes";
import aiRoutes from "./ai.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/trainers", trainerRoutes);
router.use("/progress", progressRoutes);
router.use("/plans", planRoutes);
router.use("/messages", messageRoutes);
router.use("/ai", aiRoutes);

export default router;
