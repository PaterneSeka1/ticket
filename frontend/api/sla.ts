import { apiRequest } from './client';
import type { TicketPriority } from './types';

export interface SlaPolicyPayload {
  responseMinutes?: number;
  resolutionMinutes?: number;
  isActive?: boolean;
}

export interface SlaPolicy {
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  isActive: boolean;
}

export function fetchSlaPolicies() {
  return apiRequest<SlaPolicy[]>('/sla/priorities');
}

export function updateSlaPolicy(priority: TicketPriority, payload: SlaPolicyPayload) {
  return apiRequest<SlaPolicy>(`/sla/priorities/${priority}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
