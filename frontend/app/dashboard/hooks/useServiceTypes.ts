"use client";

import { useEffect, useState } from "react";
import { fetchServiceTypes } from "@/api/tickets";
import type { ServiceTypeSummary } from "@/api/tickets";

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServiceTypes();
      setServiceTypes(data);
    } catch {
      setError("Impossible de charger les domaines de service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return { serviceTypes, loading, error, reload: load };
}
