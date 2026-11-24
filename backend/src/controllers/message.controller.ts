import { Response, NextFunction } from "express";
import { messageService } from "../services/message.service";
import { AuthRequest } from "../types/auth.types";

/**
 * Get all messages in a conversation
 */
export const getMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { conversationId } = req.params;
    const userId = req.user.id;

    const messages = await messageService.getMessages(conversationId, userId);

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { conversationId } = req.params;
    const userId = req.user.id;

    const message = await messageService.sendMessage(
      conversationId,
      userId,
      req.body
    );

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

/**
 * Get or create a conversation between trainer and user
 */
export const getOrCreateTrainerConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { otherUserId } = req.params;
    const userId = req.user.id;

    const conversation =
      await messageService.getOrCreateTrainerUserConversation(
        userId,
        otherUserId
      );

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all conversations for current user
 */
export const getUserConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;
    const conversations = await messageService.getUserConversations(userId);

    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { conversationId } = req.params;
    const userId = req.user.id;

    await messageService.deleteConversation(conversationId, userId);

    res.json({ message: "Conversation deleted successfully" });
  } catch (error) {
    next(error);
  }
};
