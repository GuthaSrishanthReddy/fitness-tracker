import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../config/db";
import { env } from "../config/env";
import { FitnessGoal, FitnessLevel, ActivityType } from "@prisma/client";

export const authService = {
  async register(data: any) {
    const { email, password, role, name } = data;

    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password,
        role,
        name,

        fitnessGoal: FitnessGoal.MAINTENANCE,
        fitnessLevel: FitnessLevel.BEGINNER,
        activityType: ActivityType.WALKING
      }
    });


    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { token, user };
  },

  async login(data: any) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { token, user };
  }
};
