"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { PageSkeleton } from "../../components/PageSkeleton";
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
    () => (ticket: Ticket) => {
      if ((ticket.emitter?.id ?? ticket.createdBy?.id) === user?.id) {
        return true;
      }
      if (user?.service?.name) {
        return ticket.assignedService === user.service.name;
      }
      return false;
    },
    [user],
  );

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation de vos tickets…" />;
  }

  return (
    <DashboardShell user={user} title="Mes tickets" subtitle="Les tickets qui vous concernent">
      <TicketTablePanel tickets={tickets} loading={loading} ticketFilter={ticketFilter} />
    </DashboardShell>
  );
}
