"use client";

import { useEffect, useState } from "react";
import { fetchTickets } from "@/api/tickets";
import type { Ticket } from "@/api/types";

export function useTickets(isReady: boolean) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchTickets();
        if (!cancelled) {
          setTickets(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setTickets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isReady]);

  return {
    tickets,
    loading,
  };
}
