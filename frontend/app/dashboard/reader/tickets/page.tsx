"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { PageSkeleton } from "../../components/PageSkeleton";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { TicketTablePanel } from "@/app/dashboard/components/TicketTablePanel";
import { useTickets } from "@/app/dashboard/hooks/useTickets";

export default function ReaderTicketsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading, lastUpdatedAt } = useTickets(status === "ready");

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "READER") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation des tickets…" />;
  }

  return (
    <DashboardShell user={user} title="Tous les tickets" subtitle="Aperçu global — lecture seule">
      <TicketTablePanel tickets={tickets} loading={loading} showExports={false} lastUpdatedAt={lastUpdatedAt} />
    </DashboardShell>
  );
}
