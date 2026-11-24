import { prisma } from "../config/db";

export const messageService = {
  /**
   * Get all messages in a conversation
   */
  async getMessages(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: userId } },
      },
      select: { id: true },
    });

    if (!conversation) {
      const err = new Error("Forbidden") as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    }

    return prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: "asc",
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
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, userId: string, data: any) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: userId } },
      },
      select: { id: true },
    });

    if (!conversation) {
      const err = new Error("Forbidden") as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    }

    return prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: data.content,
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
  },

  /**
   * Get or create a conversation between a trainer and a user
   */
  async getOrCreateTrainerUserConversation(trainerId: string, userId: string) {
    // Check if trainer and user exist in ClientTrainer relationship
    const clientTrainer = await prisma.clientTrainer.findFirst({
      where: {
        trainerId,
        userId,
      },
    });

    if (!clientTrainer) {
      const err = new Error(
        "Trainer and user are not connected"
      ) as Error & { statusCode?: number };
      err.statusCode = 403;
      throw err;
    }

    // Try to find existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: { id: { in: [trainerId, userId] } },
        },
      },
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: trainerId }, { id: userId }],
          },
        },
      });
    }

    return conversation;
  },

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string) {
    return prisma.conversation.findMany({
      where: {
        participants: { some: { id: userId } },
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  /**
   * Get all conversations for a trainer
   */
  async getTrainerConversations(trainerId: string) {
    return prisma.conversation.findMany({
      where: {
        participants: { some: { id: trainerId } },
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: userId } },
      },
    });

    if (!conversation) {
      const err = new Error("Conversation not found") as Error & {
        statusCode?: number;
      };
      err.statusCode = 404;
      throw err;
    }

    // Delete all messages first
    await prisma.message.deleteMany({
      where: {
        conversationId,
      },
    });

    // Delete conversation
    return prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });
  },
};
