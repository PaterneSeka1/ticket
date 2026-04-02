import { getDashboardRouteForRole } from "./roles";
import type { AuthenticatedUser as ApiAuthenticatedUser } from "@/api/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthenticatedUser = ApiAuthenticatedUser;

export const fetchCurrentUser = async (token: string): Promise<AuthenticatedUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Impossible de récupérer l’utilisateur connecté.");
  }

  return response.json();
};

export const formatFullName = (user: AuthenticatedUser | null) => {
  if (!user) return "Utilisateur";
  return `${user.prenom} ${user.nom}`.trim();
};

export const getRedirectRouteForRole = (role: string | undefined) =>
  getDashboardRouteForRole(role);
