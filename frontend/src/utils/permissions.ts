import { Role } from "../types/auth.types";

export const canAccessUser = (role: Role) => role === "USER";
export const canAccessTrainer = (role: Role) => role === "TRAINER";
