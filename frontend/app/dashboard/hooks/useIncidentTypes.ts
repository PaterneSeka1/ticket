"use client";

import { useEffect, useState } from "react";
import { fetchIncidentTypes } from "@/api/tickets";
import type { IncidentTypeSummary } from "@/api/tickets";

export function useIncidentTypes() {
  const [incidentTypes, setIncidentTypes] = useState<IncidentTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIncidentTypes();
      setIncidentTypes(data);
    } catch {
      setError("Impossible de charger les types d'incident.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return { incidentTypes, loading, error, reload: load };
}
