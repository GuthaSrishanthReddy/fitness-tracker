import { prisma } from "../config/db";

export const messageService = {
  async getMessages(conversationId: string, userId: string) {
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
    return prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: data.content
      }
    });
  }
};
