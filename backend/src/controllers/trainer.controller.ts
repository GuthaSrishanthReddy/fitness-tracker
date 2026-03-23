import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth.types";
import { trainerService } from "../services/trainer.service";

export const exploreTrainers = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const trainers = await trainerService.exploreTrainers();
    res.json(trainers);
  } catch (error) {
    next(error);
  }
};

export const getTrainerProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const profile = await trainerService.getTrainerProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const getTrainerById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const trainer = await trainerService.getTrainerById(
      req.params.trainerId,
      req.user?.role === "USER" ? req.user.id : undefined
    );
    res.json(trainer);
  } catch (error) {
    next(error);
  }
};

export const createTrainerRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const request = await trainerService.createTrainerRequest(
      req.user.id,
      req.params.trainerId
    );
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
};

export const getTrainerRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requests = await trainerService.getTrainerRequests(req.user.id);
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

export const respondToTrainerRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const action = req.body?.action;
    if (action !== "ACCEPT" && action !== "REJECT") {
      return res
        .status(400)
        .json({ message: "Action must be ACCEPT or REJECT" });
    }

    const result = await trainerService.respondToTrainerRequest(
      req.user.id,
      req.params.requestId,
      action
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyClients = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const clients = await trainerService.getMyClients(req.user.id);
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

export const updateTrainerProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { expertise } = req.body;
    if (!Array.isArray(expertise)) {
      return res.status(400).json({ message: "Expertise must be an array" });
    }

    const updated = await trainerService.updateTrainerProfile(
      req.user.id,
      expertise
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
