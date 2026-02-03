import { prisma } from "../config/db";

export const messageService = {
  async getMessages(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: userId } }
      },
      select: { id: true }
    });

    if (!conversation) {
      throw new Error("Forbidden");
    }

    return prisma.message.findMany({
      where: {
        conversationId
      },
      orderBy: {
        createdAt: "asc"
      }
    });
  },

  async sendMessage(conversationId: string, userId: string, data: any) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: userId } }
      },
      select: { id: true }
    });

    if (!conversation) {
      throw new Error("Forbidden");
    }

    return prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: data.content
      }
    });
  }
};
