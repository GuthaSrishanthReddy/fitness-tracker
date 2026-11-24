import { Router } from "express";

import {
  getMessages,
  sendMessage,
  getOrCreateTrainerConversation,
  getUserConversations,
  deleteConversation,
} from "../controllers/message.controller";

import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { messageSchema } from "../validators/message.schema";

const router = Router();

// Get all conversations for current user
router.get("/conversations", authMiddleware, getUserConversations);

// Get or create conversation with another user
router.get("/conversations/:otherUserId", authMiddleware, getOrCreateTrainerConversation);

// Get messages in a conversation
router.get("/:conversationId", authMiddleware, getMessages);

// Send a message
router.post("/:conversationId", authMiddleware, validate(messageSchema), sendMessage);

// Delete a conversation
router.delete("/:conversationId", authMiddleware, deleteConversation);

export default router;
