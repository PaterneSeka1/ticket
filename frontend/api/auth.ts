import { apiRequest } from "./client";
import type { AuthenticatedUser } from "./types";

export interface LoginPayload {
  email?: string;
  matricule?: string;
  passwordHash: string;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  authenticatedAt: string;
  accessToken: string;
}

export function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
}

export function fetchCurrentUser() {
  return apiRequest<AuthenticatedUser>("/auth/me");
}

export function logout() {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
  });
}
