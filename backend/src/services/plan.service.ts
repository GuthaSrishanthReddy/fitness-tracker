import { prisma } from "../config/db";

export const planService = {
  async getMyPlan(userId: string) {
    return prisma.plan.findFirst({
      where: { userId }
    });
  },

  async updateMyPlan(userId: string, data: any) {
    return prisma.plan.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data
      }
    });
  }
};
