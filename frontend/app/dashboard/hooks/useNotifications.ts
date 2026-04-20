"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notifications";
import type { UserNotification } from "@/api/types";

type UseNotificationsOptions = {
  limit?: number;
  pollMs?: number;
};

export function useNotifications(isReady: boolean, options: UseNotificationsOptions = {}) {
  const limit = options.limit ?? 12;
  const pollMs = options.pollMs ?? 15000;

  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const refreshInFlight = useRef(false);
  const hiddenNotificationIds = useRef<Set<string>>(new Set());
  const hiddenUnreadIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!isReady || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setLoading(true);
    try {
      const [countResult, list] = await Promise.all([
        fetchUnreadNotificationCount(),
        fetchNotifications({ limit }),
      ]);
      const filtered = hiddenNotificationIds.current.size
        ? list.filter((item) => !hiddenNotificationIds.current.has(item.id))
        : list;

      setUnreadCount(Math.max(0, countResult.count - hiddenUnreadIds.current.size));
      setNotifications(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, [isReady, limit]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error(error);
      await refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error(error);
      await refresh();
    }
  }, [refresh]);

  const removeNotification = useCallback(
    async (id: string, wasUnread: boolean) => {
      hiddenNotificationIds.current.add(id);
      if (wasUnread) hiddenUnreadIds.current.add(id);

      setNotifications((current) => current.filter((item) => item.id !== id));
      if (wasUnread) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
      try {
        await deleteNotification(id);
        hiddenNotificationIds.current.delete(id);
        hiddenUnreadIds.current.delete(id);
      } catch (error) {
        console.error(error);
        if (wasUnread) {
          try {
            await markNotificationRead(id);
          } catch (readError) {
            console.error(readError);
          }
        }
      }
    },
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [isReady, pollMs, refresh]);

  useEffect(() => {
    if (!isReady) return;
    const onFocus = () => void refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isReady, refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    removeNotification,
  };
}
