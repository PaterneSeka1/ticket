"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { PageSkeleton } from "../../components/PageSkeleton";
import { TicketTablePanel } from "@/app/dashboard/components/TicketTablePanel";
import { useTickets } from "@/app/dashboard/hooks/useTickets";

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading, lastUpdatedAt } = useTickets(status === "ready");

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation de la gestion des tickets…" />;
  }

  return (
    <DashboardShell user={user} title="Gestion des tickets" subtitle="Vision globale des tickets"> 
      <TicketTablePanel tickets={tickets} loading={loading} lastUpdatedAt={lastUpdatedAt} />
    </DashboardShell>
  );
}
