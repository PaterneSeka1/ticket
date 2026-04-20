"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTickets } from "@/api/tickets";
import type { Ticket } from "@/api/types";

type UseTicketsOptions = {
  pollMs?: number;
};

export function useTickets(isReady: boolean, options: UseTicketsOptions = {}) {
  const pollMs = options.pollMs ?? 15000;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isReady || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setLoading(true);
    try {
      const data = await fetchTickets();
      setTickets(data);
    } catch (error) {
      console.error(error);
      setTickets([]);
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, [isReady]);

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
    tickets,
    loading,
    refresh,
  };
}
