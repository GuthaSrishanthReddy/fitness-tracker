import { prisma } from "../config/db";

export const progressService = {
  async getProgressHistory(userId: string) {
    return prisma.progress.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  },

  async createOrUpdateProgress(userId: string, data: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.progress.findFirst({
      where: {
        userId,
        createdAt: {
          gte: today
        }
      }
    });

    if (existing) {
      throw new Error("Progress already updated today");
    }

    return prisma.progress.create({
      data: {
        userId,
        ...data
      }
    });
  }
};
