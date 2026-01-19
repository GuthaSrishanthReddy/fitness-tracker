import { api } from "./api";
import type { AuthUser } from "../types/auth.types";

export const loginApi = (email: string, password: string) =>
  api<AuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signupApi = (data: any) =>
  api<AuthUser>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const logoutApi = () =>
  api<void>("/auth/logout", { method: "POST" });
