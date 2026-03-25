"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { TicketTablePanel } from "@/app/dashboard/components/TicketTablePanel";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import type { Ticket } from "@/api/types";

export default function AdminMesTicketsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  const ticketFilter = useMemo(
    () => (ticket: Ticket) =>
      ticket.emitter.id === user?.id || (user?.service && ticket.assignedService === user.service),
    [user],
  );

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de vos tickets…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} title="Mes tickets" subtitle="Les tickets qui vous concernent">
      <TicketTablePanel tickets={tickets} loading={loading} ticketFilter={ticketFilter} />
    </DashboardShell>
  );
}
