import { prisma } from "../config/db";

export const trainerService = {
  async exploreTrainers() {
    return prisma.trainer.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
  },

  async getTrainerProfile(trainerId: string) {
    return prisma.trainer.findUnique({
      where: { userId: trainerId }
    });
  },

  async getMyClients(trainerId: string) {
    return prisma.clientTrainer.findMany({
      where: { trainerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });
  }
};
