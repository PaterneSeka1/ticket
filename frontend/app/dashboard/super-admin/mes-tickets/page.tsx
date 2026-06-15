"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { PageSkeleton } from "../../components/PageSkeleton";
import { TicketTablePanel } from "@/app/dashboard/components/TicketTablePanel";
import { useMyTickets } from "@/app/dashboard/hooks/useMyTickets";

export default function SuperAdminMesTicketsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useMyTickets(status === "ready");

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation de vos tickets…" />;
  }

  return (
    <DashboardShell user={user} title="Mes tickets" subtitle="Les tickets qui vous concernent">
      <TicketTablePanel tickets={tickets} loading={loading} showExports={false} />
    </DashboardShell>
  );
}
