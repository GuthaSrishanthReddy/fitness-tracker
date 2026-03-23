import { prisma } from "../config/db";

const prismaClient = prisma as any;

const TRAINER_REQUEST_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED"
} as const;

const notFoundError = (message: string) => {
  const err = new Error(message) as Error & {
    statusCode?: number;
  };
  err.statusCode = 404;
  return err;
};

const badRequestError = (message: string) => {
  const err = new Error(message) as Error & {
    statusCode?: number;
  };
  err.statusCode = 400;
  return err;
};

export const trainerService = {
  async exploreTrainers() {
    return prisma.trainer.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  },

  async getTrainerProfile(trainerId: string) {
    return prisma.trainer.findUnique({
      where: { userId: trainerId }
    });
  },

  async getTrainerById(trainerId: string, viewerUserId?: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!trainer) {
      throw notFoundError("Trainer not found");
    }

    if (!viewerUserId) {
      return {
        ...trainer,
        requestStatus: null,
        canRequest: false
      };
    }

    const [existingAssignment, existingPendingRequest] = await Promise.all([
      prisma.clientTrainer.findFirst({
        where: { userId: viewerUserId },
        select: { trainerId: true }
      }),
      prismaClient.trainerRequest.findFirst({
        where: {
          userId: viewerUserId,
          status: TRAINER_REQUEST_STATUS.PENDING
        },
        select: { trainerId: true }
      })
    ]);

    const ownRequest = await prismaClient.trainerRequest.findUnique({
      where: {
        trainerId_userId: {
          trainerId,
          userId: viewerUserId
        }
      },
      select: { status: true }
    });

    const hasAcceptedTrainer = Boolean(existingAssignment);
    const hasOtherPendingRequest = Boolean(
      existingPendingRequest && existingPendingRequest.trainerId !== trainerId
    );

    return {
      ...trainer,
      requestStatus: ownRequest?.status ?? null,
      canRequest:
        !hasAcceptedTrainer &&
        !hasOtherPendingRequest &&
        ownRequest?.status !== TRAINER_REQUEST_STATUS.PENDING
    };
  },

  async createTrainerRequest(userId: string, trainerId: string) {
    const [trainer, existingAssignment, pendingRequest, existingRequest] =
      await Promise.all([
        prisma.trainer.findUnique({
          where: { id: trainerId },
          select: { id: true, userId: true }
        }),
        prisma.clientTrainer.findFirst({
          where: { userId },
          select: { id: true }
        }),
        prismaClient.trainerRequest.findFirst({
          where: { userId, status: TRAINER_REQUEST_STATUS.PENDING },
          select: { trainerId: true }
        }),
        prismaClient.trainerRequest.findUnique({
          where: {
            trainerId_userId: {
              trainerId,
              userId
            }
          }
        })
      ]);

    if (!trainer) {
      throw notFoundError("Trainer not found");
    }

    if (trainer.userId === userId) {
      throw badRequestError("You cannot request yourself as a trainer");
    }

    if (existingAssignment) {
      throw badRequestError("You already have an assigned trainer");
    }

    if (pendingRequest && pendingRequest.trainerId !== trainerId) {
      throw badRequestError("You already have a pending trainer request");
    }

    if (existingRequest?.status === TRAINER_REQUEST_STATUS.PENDING) {
      throw badRequestError("Trainer request already sent");
    }

    if (existingRequest?.status === TRAINER_REQUEST_STATUS.ACCEPTED) {
      throw badRequestError("This trainer has already accepted your request");
    }

    const request = existingRequest
      ? await prismaClient.trainerRequest.update({
          where: {
            trainerId_userId: {
              trainerId,
              userId
            }
          },
          data: {
            status: TRAINER_REQUEST_STATUS.PENDING
          },
          include: {
            trainer: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        })
      : await prismaClient.trainerRequest.create({
          data: {
            trainerId,
            userId
          },
          include: {
            trainer: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        });

    return request;
  },

  async getTrainerRequests(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
      select: { id: true }
    });

    if (!trainer) {
      throw notFoundError("Trainer profile not found");
    }

    return prismaClient.trainerRequest.findMany({
      where: {
        trainerId: trainer.id,
        status: TRAINER_REQUEST_STATUS.PENDING
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            fitnessGoal: true,
            fitnessLevel: true,
            activityType: true
          }
        }
      }
    });
  },

  async respondToTrainerRequest(
    trainerUserId: string,
    requestId: string,
    action: "ACCEPT" | "REJECT"
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
      select: { id: true }
    });

    if (!trainer) {
      throw notFoundError("Trainer profile not found");
    }

    const request = await prismaClient.trainerRequest.findFirst({
      where: {
        id: requestId,
        trainerId: trainer.id
      }
    });

    if (!request) {
      throw notFoundError("Trainer request not found");
    }

    if (request.status !== TRAINER_REQUEST_STATUS.PENDING) {
      throw badRequestError("This request has already been processed");
    }

    if (action === "REJECT") {
      return prismaClient.trainerRequest.update({
        where: { id: requestId },
        data: { status: TRAINER_REQUEST_STATUS.REJECTED }
      });
    }

    const existingAssignment = await prisma.clientTrainer.findFirst({
      where: { userId: request.userId },
      select: { id: true }
    });

    if (existingAssignment) {
      throw badRequestError("This user already has an assigned trainer");
    }

    return prisma.$transaction(async (tx) => {
      await tx.clientTrainer.create({
        data: {
          trainerId: trainer.id,
          userId: request.userId
        }
      });

      const updatedRequest = await (tx as any).trainerRequest.update({
        where: { id: requestId },
        data: { status: TRAINER_REQUEST_STATUS.ACCEPTED }
      });

      await (tx as any).trainerRequest.updateMany({
        where: {
          userId: request.userId,
          status: TRAINER_REQUEST_STATUS.PENDING,
          id: { not: requestId }
        },
        data: { status: TRAINER_REQUEST_STATUS.REJECTED }
      });

      return updatedRequest;
    });
  },

  async updateTrainerProfile(trainerId: string, expertise: string[]) {
    try {
      return await prisma.trainer.update({
        where: { userId: trainerId },
        data: { expertise }
      });
    } catch (error: any) {
      if (error?.code === "P2025") {
        throw notFoundError("Trainer profile not found");
      }
      throw error;
    }
  },

  async getMyClients(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
      select: { id: true }
    });

    if (!trainer) {
      throw notFoundError("Trainer profile not found");
    }

    return prisma.clientTrainer.findMany({
      where: { trainerId: trainer.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
  }
};
