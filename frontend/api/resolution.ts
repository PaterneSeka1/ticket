import { apiRequest } from './client';

export interface ResolutionResponsible {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  department?: string | null;
  isExternal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResolutionResponsiblePayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  isExternal?: boolean;
}

export type UpdateResolutionResponsiblePayload = Partial<CreateResolutionResponsiblePayload> & {
  isActive?: boolean;
};

export function fetchResolutionResponsibles() {
  return apiRequest<ResolutionResponsible[]>('/resolution-responsibles');
}

export function createResolutionResponsible(payload: CreateResolutionResponsiblePayload) {
  return apiRequest<ResolutionResponsible>('/resolution-responsibles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateResolutionResponsible(id: string, payload: UpdateResolutionResponsiblePayload) {
  return apiRequest<ResolutionResponsible>(`/resolution-responsibles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteResolutionResponsible(id: string) {
  return apiRequest<void>(`/resolution-responsibles/${id}`, {
    method: 'DELETE',
  });
}
