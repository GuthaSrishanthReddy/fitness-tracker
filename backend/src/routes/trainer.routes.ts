import { Router } from "express";

import {
  createTrainerRequest,
  exploreClients,
  exploreTrainers,
  getClientProgressHistory,
  getMyClients,
  getTrainerById,
  getTrainerProfile,
  getTrainerRequests,
  removeClient,
  respondToTrainerRequest,
  updateTrainerProfile
} from "../controllers/trainer.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { roleMiddleware } from "../middleware/role.middleware";

const router = Router();

router.get("/", exploreTrainers);

router.get(
  "/me",
  authMiddleware,
  roleMiddleware("TRAINER"),
  getTrainerProfile
);

router.put(
  "/me",
  authMiddleware,
  roleMiddleware("TRAINER"),
  updateTrainerProfile
);

router.get(
  "/explore-clients",
  authMiddleware,
  roleMiddleware("TRAINER"),
  exploreClients
);

router.get(
  "/clients",
  authMiddleware,
  roleMiddleware("TRAINER"),
  getMyClients
);

router.delete(
  "/clients/:clientLinkId",
  authMiddleware,
  roleMiddleware("TRAINER"),
  removeClient
);

router.get(
  "/clients/:clientLinkId",
  authMiddleware,
  roleMiddleware("TRAINER"),
  getClientProgressHistory
);

router.get(
  "/requests",
  authMiddleware,
  roleMiddleware("TRAINER"),
  getTrainerRequests
);

router.patch(
  "/requests/:requestId",
  authMiddleware,
  roleMiddleware("TRAINER"),
  respondToTrainerRequest
);

router.get("/:trainerId", authMiddleware, getTrainerById);

router.post(
  "/:trainerId/request",
  authMiddleware,
  roleMiddleware("USER"),
  createTrainerRequest
);

export default router;
