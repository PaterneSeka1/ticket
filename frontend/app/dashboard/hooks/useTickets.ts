"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTickets, type TicketFilters } from "@/api/tickets";
import type { Ticket } from "@/api/types";

type UseTicketsOptions = {
  pollMs?: number;
  limit?: number;
  filters?: Omit<TicketFilters, "page" | "limit">;
};

export function useTickets(isReady: boolean, options: UseTicketsOptions = {}) {
  const { pollMs = 15000, limit = 25, filters } = options;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const refreshInFlight = useRef(false);
  const pageRef = useRef(page);
  pageRef.current = page;

  const refresh = useCallback(async () => {
    if (!isReady || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTickets({ ...filters, page: pageRef.current, limit });
      setTickets(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setLastUpdatedAt(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur réseau. Veuillez réessayer.";
      setError(message);
      setTickets([]);
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, [isReady, limit, filters]);

  // Reload when page changes
  useEffect(() => {
    void refresh();
  }, [refresh, page]);

  // Polling
  useEffect(() => {
    if (!isReady) return;
    const timer = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(timer);
  }, [isReady, pollMs, refresh]);

  // Reload on window focus / visibility
  useEffect(() => {
    if (!isReady) return;
    const onFocus = () => void refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isReady, refresh]);

  const goToPage = useCallback((next: number) => {
    setPage(next);
  }, []);

  return {
    tickets,
    loading,
    error,
    lastUpdatedAt,
    refresh,
    page,
    total,
    totalPages,
    limit,
    goToPage,
  };
}
