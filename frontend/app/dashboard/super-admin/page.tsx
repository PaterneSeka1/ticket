"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/DashboardShell";
import { getRedirectRouteForRole } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { fetchTickets } from "@/api/tickets";
import type { Ticket, TicketPriority, TicketStatus } from "@/api/types";

const openStatuses: Set<TicketStatus> = new Set(["RECU", "EN_COURS", "AJOURNE", "OUVERT", "PRIS"]);
const priorityOrder: TicketPriority[] = ["CRITIQUE", "HAUT", "MOYEN", "BAS"];
const priorityColorMap: Record<TicketPriority, string> = {
  CRITIQUE: "#f97066",
  HAUT: "#f5b134",
  MOYEN: "#23b47e",
  BAS: "#6f8ecb",
};

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  useEffect(() => {
    let cancelled = false;
    const loadTickets = async () => {
      setLoading(true);
      try {
        const data = await fetchTickets();
        if (!cancelled) {
          setTickets(data);
        }
      } catch {
        if (!cancelled) {
          setTickets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadTickets();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(today);
      current.setDate(today.getDate() - offset);
      const dayKey = current.toISOString().slice(0, 10);
      const dayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(current);
      const created = tickets.filter((ticket) => ticket.createdAt.startsWith(dayKey)).length;
      const closed = tickets.filter((ticket) => ticket.resolvedAt?.startsWith(dayKey)).length;
      data.push({ day: dayLabel, created, closed });
    }
    return data;
  }, [tickets]);

  const priorityDistribution = useMemo(() => {
    return priorityOrder.map((priority) => ({
      name: priority === "CRITIQUE" ? "P1" : priority === "HAUT" ? "P2" : priority === "MOYEN" ? "P3" : "P4",
      value: tickets.filter((ticket) => ticket.priority === priority).length,
      fill: priorityColorMap[priority],
    }));
  }, [tickets]);

  const topServices = useMemo(() => {
    const counts = new Map<string, number>();
    tickets.forEach((ticket) => {
      const serviceKey = ticket.assignedService ?? "Non assigné";
      counts.set(serviceKey, (counts.get(serviceKey) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([service, ticketsCount]) => ({ service, tickets: ticketsCount }));
  }, [tickets]);

  const openTickets = tickets.filter((ticket) => openStatuses.has(ticket.status)).length;
  const slaEligible = tickets.filter((ticket) => ticket.slaMaxMinutes && ticket.waitMinutes !== undefined && ticket.waitMinutes !== null);
  const slaMet = slaEligible.filter((ticket) => ticket.waitMinutes! <= ticket.slaMaxMinutes!).length;
  const slaPercent = slaEligible.length ? Math.round((slaMet / slaEligible.length) * 100) : 0;
  const activeServices = new Set(tickets.map((ticket) => ticket.assignedService).filter(Boolean)).size;
  const criticalTickets = tickets.filter((ticket) => ticket.priority === "CRITIQUE").length;

  const firstHalfCreated = weeklyData.slice(0, 3).reduce((acc, value) => acc + value.created, 0);
  const lastHalfCreated = weeklyData.slice(-3).reduce((acc, value) => acc + value.created, 0);
  const delta = lastHalfCreated - firstHalfCreated;
  const trendText =
    delta > 0
      ? `+${delta} tickets vs début de semaine`
      : delta < 0
      ? `${delta} vs début de semaine`
      : "Stabilité par rapport au début de semaine";

  const summaryTiles = [
    {
      label: "Tickets ouverts",
      value: openTickets.toString(),
      trend: trendText,
      tone: "from-[#ffe0d3] to-[#ffd2a5]",
    },
    {
      label: "SLA respectés",
      value: `${slaPercent} %`,
      trend: `${slaMet}/${slaEligible.length || 1} tickets éligibles`,
      tone: "from-[#e6f4ed] to-[#c6f1d6]",
    },
    {
      label: "Équipes DSI actives",
      value: `${activeServices} services`,
      trend: `${tickets.length} tickets suivis`,
      tone: "from-[#e1e8ff] to-[#c5d4ff]",
    },
    {
      label: "Tickets critiques",
      value: criticalTickets.toString(),
      trend: criticalTickets ? "Suivi prioritaire requis" : "Aucun P1 en cours",
      tone: "from-[#ffe9e4] to-[#ffcac1]",
    },
  ];

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de votre espace Super-Admin…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Tableau de bord super-admin"
      subtitle="Pilotez les équipes, les SLA et les grands indicateurs de tickets."
    >
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryTiles.map((tile) => (
            <article
              key={tile.label}
              className={`rounded-[24px] border border-[#f3e2cf] bg-gradient-to-br ${tile.tone} p-6 shadow-[0_16px_40px_rgba(0,0,0,0.08)]`}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-[#5c3d1a]">{tile.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#2b1d10]">{tile.value}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5c3d1a]">{tile.trend}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-[32px] border border-[#dfe5ef] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6b6b6b]">Activité hebdo</p>
                <p className="text-sm text-[#2b1d10]">Création vs résolution</p>
              </div>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#1f6f3a]">
                {loading ? "Chargement…" : "Niveau stable"}
              </span>
            </header>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="closed" stroke="#1f6f3a" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="space-y-4 rounded-[32px] border border-[#dfe5ef] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6b6b6b]">Répartition des priorités</p>
                <p className="text-sm text-[#2b1d10]">Répartition par couleur</p>
              </div>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#c42d1f]">Urgence suivie</span>
            </header>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {priorityDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>

        <section className="space-y-4 rounded-[32px] border border-[#dfe5ef] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6b6b6b]">Top services</p>
              <p className="text-sm text-[#2b1d10]">Tickets ouverts par équipe</p>
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#4a5566]">
              Données en temps réel
            </span>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {topServices.map((service) => (
              <article
                key={service.service}
                className="flex items-center justify-between rounded-[20px] border border-[#eceef2] bg-[#f8fafc] px-4 py-3"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#6b5446]">{service.service}</p>
                  <p className="text-2xl font-semibold text-[#1f6f3a]">{service.tickets}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-[#1f6f3a]/10 text-[#1f6f3a]">
                  <span className="flex h-full items-center justify-center text-sm font-semibold">{service.tickets}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
