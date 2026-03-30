"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import type { Ticket, TicketPriority, TicketStatus } from "@/api/types";

const statusPalette: Record<TicketStatus, { label: string; color: string }> = {
  RECU: { label: "Reçu", color: "#d9d9d9" },
  OUVERT: { label: "Ouvert", color: "#f7b500" },
  PRIS: { label: "Pris en charge", color: "#23b47e" },
  EN_COURS: { label: "En cours de résolution", color: "#7552d4" },
  RESOLU: { label: "Résolu", color: "#727885" },
  FERME: { label: "Fermé", color: "#1f6c97" },
  AJOURNE: { label: "Ajourné", color: "#b266f5" },
  ABANDONNE: { label: "Abandonné", color: "#d63b35" },
};

const priorityPalette: Record<TicketPriority, { label: string; color: string }> = {
  CRITIQUE: { label: "P1", color: "#d63b35" },
  HAUT: { label: "P2", color: "#f4a300" },
  MOYEN: { label: "P3", color: "#20b16a" },
  BAS: { label: "P4", color: "#6f8ecb" },
};

const filters = {
  period: ["Ce mois", "Ce trimestre", "Cet année"],
  services: ["Tous services", "DSI", "Relation Clientèle", "Boldcode", "Opérations"],
  priorities: ["Toutes priorités", "P1", "P2", "P3", "P4"],
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );

export default function SuperAdminRapportsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");
  const [selectedPeriod, setSelectedPeriod] = useState(filters.period[0]);
  const [selectedService, setSelectedService] = useState(filters.services[0]);
  const [selectedPriority, setSelectedPriority] = useState(filters.priorities[0]);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const serviceMatch = selectedService === filters.services[0] || ticket.assignedService === selectedService;
      const priorityMatch =
        selectedPriority === filters.priorities[0] || priorityPalette[ticket.priority].label === selectedPriority;
      return serviceMatch && priorityMatch;
    });
  }, [tickets, selectedService, selectedPriority]);

  const totalTickets = filteredTickets.length;
  const criticalCount = filteredTickets.filter((ticket) => ticket.priority === "CRITIQUE").length;
  const majorCount = filteredTickets.filter((ticket) => ticket.priority === "HAUT").length;
  const minorCount = filteredTickets.filter((ticket) => ticket.priority === "MOYEN").length;
  const resolvedCount = filteredTickets.filter((ticket) => ticket.status === "RESOLU").length;
  const resolutionRate = totalTickets ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  const statusData = useMemo(() => {
    return Object.entries(statusPalette).map(([key, meta]) => {
      const count = filteredTickets.filter((ticket) => ticket.status === key).length;
      return { name: meta.label, value: count, color: meta.color };
    });
  }, [filteredTickets]);

  const priorityData = useMemo(() => {
    return (["CRITIQUE", "HAUT", "MOYEN"] as TicketPriority[]).map((priority) => ({
      label: priorityPalette[priority].label,
      value: filteredTickets.filter((ticket) => ticket.priority === priority).length,
      fill: priorityPalette[priority].color,
    }));
  }, [filteredTickets]);

  const monthlyTrend = useMemo(() => {
    const bucket = new Map<string, { label: string; yearMonth: string; opened: number; resolved: number }>();
    filteredTickets.forEach((ticket) => {
      const createdAt = new Date(ticket.createdAt);
      const key = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(createdAt);
      if (!bucket.has(key)) {
        bucket.set(key, { label, yearMonth: key, opened: 0, resolved: 0 });
      }
      bucket.get(key)!.opened += 1;
      if (ticket.resolvedAt) {
        const resolvedAt = new Date(ticket.resolvedAt);
        const resolvedKey = `${resolvedAt.getFullYear()}-${(resolvedAt.getMonth() + 1).toString().padStart(2, "0")}`;
        if (!bucket.has(resolvedKey)) {
          bucket.set(resolvedKey, {
            label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(resolvedAt),
            yearMonth: resolvedKey,
            opened: 0,
            resolved: 0,
          });
        }
        bucket.get(resolvedKey)!.resolved += 1;
      }
    });
    const sorted = Array.from(bucket.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    if (sorted.length === 0) {
      const fallbackLabel = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date());
      return [{ label: fallbackLabel, ouvert: 0, resolu: 0 }];
    }
    return sorted.map((entry) => ({
      label: entry.label,
      ouvert: entry.opened,
      resolu: entry.resolved,
    }));
  }, [filteredTickets]);

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "code",
        header: "ID",
        cell: ({ getValue }) => (
          <span className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-[#5f5c56]">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "category.libelle",
        header: "Catégorie",
        cell: ({ getValue }) => <span className="text-sm font-semibold text-[#264238]">{getValue<string>()}</span>,
      },
      {
        accessorKey: "priority",
        header: "Priorité",
        cell: ({ getValue }) => (
          <span
            className="rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
            style={{ backgroundColor: `${priorityPalette[getValue<TicketPriority>()].color}22` }}
          >
            {priorityPalette[getValue<TicketPriority>()].label}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ getValue }) => (
          <span className="rounded-full bg-[#f3f3f3] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#4c4945]">
            {statusPalette[getValue<TicketStatus>()].label}
          </span>
        ),
      },
      {
        accessorKey: "assignedService",
        header: "Service",
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold text-[#4c4945]">{getValue<string>() ?? "Non assigné"}</span>
        ),
      },
      {
        accessorKey: "emitter.nom",
        header: "Émetteur",
        cell: ({ getValue }) => <span className="text-sm text-[#3e3b38]">{getValue<string>()}</span>,
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ getValue }) => (
          <span className="text-sm text-[#4c4945]">{formatDate(getValue<string>())}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredTickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation des rapports…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} title="Rapports & Analyses" subtitle={`Statistiques sur ${totalTickets} ticket(s)`}>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3 rounded-[16px] border border-[#ece8e1] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          {[
            { label: "Période", value: selectedPeriod, setter: setSelectedPeriod, options: filters.period },
            { label: "Service", value: selectedService, setter: setSelectedService, options: filters.services },
            {
              label: "Priorité",
              value: selectedPriority,
              setter: setSelectedPriority,
              options: filters.priorities,
            },
          ].map((filter) => (
            <label key={filter.label} className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7a6f5f]">
              {filter.label}
              <select
                value={filter.value}
                onChange={(event) => filter.setter(event.target.value)}
                className="w-full rounded-[12px] border border-[#d6d2c8] bg-white px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
              >
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "P1 CRITIQUES", value: criticalCount, detail: `${totalTickets ? Math.round((criticalCount / totalTickets) * 100) : 0}% du total` },
            { title: "P2 MAJEURS", value: majorCount, detail: `${totalTickets ? Math.round((majorCount / totalTickets) * 100) : 0}% du total` },
            { title: "P3 MINEURS", value: minorCount, detail: `${totalTickets ? Math.round((minorCount / totalTickets) * 100) : 0}% du total` },
            { title: "TAUX RÉSOLUTIONS", value: `${resolutionRate}%`, detail: `${resolvedCount} ticket(s)` },
          ].map((card) => (
            <div key={card.title} className="rounded-[16px] border border-[#ededec] bg-white px-4 py-5 shadow-[0_6px_20px_rgba(20,20,20,0.06)]">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#b7b2aa]">{card.title}</p>
              <p className="mt-3 text-3xl font-bold text-[#1f1f1f]">{card.value}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a857c]">{card.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="rounded-[20px] border border-[#e7e3db] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Tickets par statut</p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="70%"
                    outerRadius="90%"
                    paddingAngle={4}
                    stroke="none"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#e7e3db] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Tickets par priorité</p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#f4a300" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-[24px] border border-[#e7e3db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Évolution mensuelle</p>
              <p className="text-sm text-[#2b1d10]">Ouverts vs Résolus</p>
            </div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-[#4c4945]">
              {loading ? "Chargement…" : `${monthlyTrend.length} mois suivis`}
            </span>
          </div>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceaea" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="ouvert" stroke="#0a76ff" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="resolu" stroke="#23b47e" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e7e3db] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Détail des tickets</p>
              <p className="text-sm text-[#2b1d10]">Liste complète des tickets filtrés</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-full border border-[#d6d2c8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#4b3e32]">
                CSV
              </button>
              <button className="rounded-full border border-[#d6d2c8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#4b3e32]">
                PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-[0.8rem]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border-b border-[#ebe8e3] px-3 py-2 text-left text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#9c958a]"
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border-b border-[#f0ece4] px-3 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
