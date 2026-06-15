import { apiRequest } from "./client";
import type {
  PaginatedResult,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketTimeline,
  TimelineEventType,
} from "./types";

export interface CreateTicketPayload {
  title: string;
  description: string;
  serviceTypeId: string;
  categoryId: string;
  priority?: TicketPriority;
  clientName?: string;
  product?: string;
  products?: string[];
  attachmentName?: string;
  detectedAt?: string;
}

export type UpdateTicketPayload = Partial<CreateTicketPayload>;

export interface ChangeTicketStatusPayload {
  status: TicketStatus;
  resolutionComment?: string;
  assignedResponsibleId?: string | null;
}

export interface CreateTicketCommentPayload {
  content: string;
}

export interface CreateTicketTimelinePayload {
  type: TimelineEventType;
  label: string;
  actorName: string;
}

export interface ServiceTypeSummary {
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
  serviceTypeId: string;
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

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  serviceTypeId?: string;
  categoryId?: string;
  assignedResponsibleId?: string;
  createdById?: string;
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  limit?: number;
}

export function fetchTickets(filters?: TicketFilters) {
  const query = filters
    ? "?" +
      Object.entries(filters)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&")
    : "";
  return apiRequest<PaginatedResult<Ticket>>(`/tickets${query}`);
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

export function fetchServiceTypes() {
  return apiRequest<ServiceTypeSummary[]>("/tickets/categories/service-types");
}
