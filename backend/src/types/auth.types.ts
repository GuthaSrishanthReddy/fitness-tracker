import { Request } from "express";

/**
 * What auth middleware guarantees at runtime
 */
export type Role = "USER" | "TRAINER";

export interface JwtUser {
  id: string;
  role: Role;
}

/**
 * Request AFTER auth middleware
 */
export interface AuthRequest extends Request {
  user?: JwtUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}
