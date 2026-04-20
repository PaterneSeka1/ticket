import { apiRequest } from "./client";
import type { UserNotification } from "./types";

export function fetchNotifications(params?: { limit?: number; unreadOnly?: boolean }) {
  const query = params
    ? "?" +
      Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&")
    : "";
  return apiRequest<UserNotification[]>(`/notifications${query}`);
}

export function fetchUnreadNotificationCount() {
  return apiRequest<{ count: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiRequest<void>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return apiRequest<void>("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteNotification(id: string) {
  return apiRequest<void>(`/notifications/${id}`, {
    method: "DELETE",
  });
}
