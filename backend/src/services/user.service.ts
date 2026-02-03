import { prisma } from "../config/db";

export const userService = {
  async getMe(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
  },

  async updateMe(userId: string, data: any) {
    const user = await prisma.user.update({
      where: { id: userId },
      data
    });
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
};
