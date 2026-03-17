import { apiRequest } from "./client";
import type { AuthenticatedUser, DirectionType, OperationService, UserRole } from "./types";

export interface CreateUserPayload {
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  passwordHash: string;
  role?: UserRole;
  direction?: DirectionType;
  service?: OperationService;
  isActive?: boolean;
  createdById?: string;
  lastLogin?: string;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export function createUser(payload: CreateUserPayload) {
  return apiRequest<AuthenticatedUser>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listUsers() {
  return apiRequest<AuthenticatedUser[]>("/users");
}

export function fetchUser(id: string) {
  return apiRequest<AuthenticatedUser>(`/users/${id}`);
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return apiRequest<AuthenticatedUser>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: string) {
  return apiRequest<void>(`/users/${id}`, {
    method: "DELETE",
  });
}

export function activateUser(id: string) {
  return apiRequest<AuthenticatedUser>(`/users/${id}/activate`, {
    method: "PATCH",
  });
}

export function deactivateUser(id: string) {
  return apiRequest<AuthenticatedUser>(`/users/${id}/deactivate`, {
    method: "PATCH",
  });
}
