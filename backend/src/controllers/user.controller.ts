import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth.types";
import { userService } from "../services/user.service";

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({ userId: req.user.id });
  } catch (error) {
    next(error);
  }
};


export const updateMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const updated = await userService.updateMe(userId, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
