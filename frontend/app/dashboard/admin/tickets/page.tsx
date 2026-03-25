"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { TicketTablePanel } from "@/app/dashboard/components/TicketTablePanel";
import { useTickets } from "@/app/dashboard/hooks/useTickets";

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de la gestion des tickets…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} title="Gestion des tickets" subtitle="Vision globale des tickets"> 
      <TicketTablePanel tickets={tickets} loading={loading} />
    </DashboardShell>
  );
}
