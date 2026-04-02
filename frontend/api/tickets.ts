import { apiRequest } from "./client";
import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketTimeline,
  TicketType,
  TimelineEventType,
} from "./types";

export interface CreateTicketPayload {
  type: TicketType;
  priority: TicketPriority;
  categoryId: string;
  description: string;
  assignedService?: string;
  clientName?: string;
  product?: string;
  attachmentName?: string;
  detectedAt?: string;
  resolvedAt?: string;
  slaMaxMinutes?: number;
  waitMinutes?: number;
}

export type UpdateTicketPayload = Partial<CreateTicketPayload>;

export interface ChangeTicketStatusPayload {
  status: TicketStatus;
  actorName?: string;
  receivedById?: string;
  eventType?: TimelineEventType;
}

export interface CreateTicketCommentPayload {
  content: string;
}

export interface CreateTicketTimelinePayload {
  type: TimelineEventType;
  label: string;
  actorName: string;
}

export interface IncidentTypeSummary {
  id: string;
  name: string;
  scope: "INTERNE" | "EXTERNE";
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  incidentTypeId: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export function createTicket(payload: CreateTicketPayload) {
  return apiRequest<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchTickets(filters?: Record<string, string | number | undefined>) {
  const query = filters
    ? "?" +
      Object.entries(filters)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&")
    : "";
  return apiRequest<Ticket[]>(`/tickets${query}`);
}

export function fetchTicket(id: string) {
  return apiRequest<Ticket>(`/tickets/${id}`);
}

export function updateTicket(id: string, payload: UpdateTicketPayload) {
  return apiRequest<Ticket>(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTicket(id: string) {
  return apiRequest<void>(`/tickets/${id}`, {
    method: "DELETE",
  });
}

export function changeTicketStatus(id: string, payload: ChangeTicketStatusPayload) {
  return apiRequest<Ticket>(`/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createTicketComment(id: string, payload: CreateTicketCommentPayload) {
  return apiRequest(`/tickets/${id}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createTicketTimeline(id: string, payload: CreateTicketTimelinePayload) {
  return apiRequest<TicketTimeline>(`/tickets/${id}/timeline`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMyTickets() {
  return apiRequest<Ticket[]>("/tickets/me/created");
}

export function fetchDsiTickets() {
  return apiRequest<Ticket[]>("/tickets/dsi/received");
}

export function fetchCategories() {
  return apiRequest<TicketCategory[]>("/tickets/categories");
}

export function createCategory(payload: CreateCategoryPayload) {
  return apiRequest<TicketCategory>("/tickets/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCategory(id: string, payload: UpdateCategoryPayload) {
  return apiRequest<TicketCategory>(`/tickets/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCategory(id: string) {
  return apiRequest<void>(`/tickets/categories/${id}`, {
    method: "DELETE",
  });
}

export function fetchIncidentTypes() {
  return apiRequest<IncidentTypeSummary[]>("/tickets/categories/incident-types");
}
