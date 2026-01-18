import { prisma } from "../config/db";

export const insightService = {
  async analyzeProgress(userId: string) {
    const progress = await prisma.progress.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    // Placeholder insight logic
    return {
      summary: "Progress looks stable",
      recentEntries: progress
    };
  }
};
