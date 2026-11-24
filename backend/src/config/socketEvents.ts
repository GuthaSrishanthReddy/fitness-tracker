import { Socket } from "socket.io";
import { getIO } from "./socket";
import { socketUsers } from "../utils/socketUsers";
import { prisma } from "./db";
import { verifyToken } from "../utils/jwt";

export const setupSocketEvents = () => {
  const io = getIO();

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication failed"));
      }

      const decoded = verifyToken(token) as any;
      socket.data.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected: ${userId} with socket: ${socket.id}`);

    // Register user as online
    socketUsers.addUser(userId, socket.id);

    // Emit online status to all users
    io.emit("user_online", { userId, socketId: socket.id });

    // ==================== Message Events ====================

    /**
     * JOIN_CONVERSATION: User joins a conversation room
     */
    socket.on("JOIN_CONVERSATION", async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;

        // Verify user is part of conversation
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            participants: { some: { id: userId } },
          },
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        socket.join(conversationId);
        console.log(`User ${userId} joined conversation ${conversationId}`);

        // Notify others in conversation
        socket.to(conversationId).emit("user_joined", {
          userId,
          conversationId,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("JOIN_CONVERSATION error:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    /**
     * SEND_MESSAGE: Send a message in a conversation
     */
    socket.on(
      "SEND_MESSAGE",
      async (data: { conversationId: string; content: string }) => {
        try {
          const { conversationId, content } = data;

          // Verify user is part of conversation
          const conversation = await prisma.conversation.findFirst({
            where: {
              id: conversationId,
              participants: { some: { id: userId } },
            },
          });

          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          // Save message to database
          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: userId,
              content,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          // Broadcast message to all users in conversation
          io.to(conversationId).emit("message_received", {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            senderName: message.sender.name,
            content: message.content,
            createdAt: message.createdAt,
          });

          console.log(`Message sent in conversation ${conversationId}`);
        } catch (error) {
          console.error("SEND_MESSAGE error:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    /**
     * TYPING: User is typing indicator
     */
    socket.on(
      "TYPING",
      (data: { conversationId: string; isTyping: boolean }) => {
        const { conversationId, isTyping } = data;

        socket.to(conversationId).emit("user_typing", {
          userId,
          conversationId,
          isTyping,
          timestamp: new Date(),
        });
      }
    );

    /**
     * LEAVE_CONVERSATION: User leaves a conversation
     */
    socket.on("LEAVE_CONVERSATION", (data: { conversationId: string }) => {
      const { conversationId } = data;
      socket.leave(conversationId);

      socket.to(conversationId).emit("user_left", {
        userId,
        conversationId,
        timestamp: new Date(),
      });

      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // ==================== Disconnect Event ====================

    socket.on("disconnect", () => {
      socketUsers.removeUser(userId);
      console.log(`User disconnected: ${userId}`);

      // Notify all users that this user is offline
      io.emit("user_offline", { userId, timestamp: new Date() });
    });

    // ==================== Error Handler ====================

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("Socket.IO events initialized");
};
