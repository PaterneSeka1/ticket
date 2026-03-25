"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { TicketTablePanel } from "@/app/dashboard/components/TicketTablePanel";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import type { Ticket } from "@/api/types";

export default function EmployeMesTicketsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "USER") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  const ticketFilter = useMemo(
    () => (ticket: Ticket) => ticket.emitter.id === user?.id,
    [user],
  );

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Chargement de vos tickets…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Mes tickets"
      subtitle="Vos demandes suivies"
      className="mx-auto px-4 lg:px-6 mx-auto max-w-[340] sm:max-w-[540px] lg:max-w-[800px] xl:max-w-[1024px] 2xl:max-w-[1280px] 3xl:max-w-[1440px]"
    >
      <div className="flex w-full flex-col gap-4">
        <div className="rounded-[28px] bg-white/70 px-5 py-6 shadow-[0_18px_45px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-[#b87731]">Mes tickets</p>
              <p className="text-sm text-[#7b6655]">Liste complète des tickets dont vous êtes l’émetteur</p>
            </div>
            <span className="text-[13px] font-semibold text-[#2b1d10]">
              {tickets.filter(ticketFilter).length} résultat(s)
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-[26px] border border-[#f1e5d7] bg-[#fffaf5] p-5 shadow-[0_18px_40px_rgba(43,29,16,0.05)]">
          <TicketTablePanel tickets={tickets} loading={loading} ticketFilter={ticketFilter} />
        </div>
      </div>
    </DashboardShell>
  );
}
