import { getDashboardRouteForRole, UserRole } from "./roles";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthenticatedUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  direction?: string | null;
  service?: string | null;
};

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
