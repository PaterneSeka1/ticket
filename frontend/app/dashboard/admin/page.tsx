"use client";

import { useEffect, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { DashboardShell } from "../components/DashboardShell";
import { getRedirectRouteForRole } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useRouter } from "next/navigation";

type Metric = {
  label: string;
  value: string;
  detail: string;
  valueColor: string;
  accent: string;
};

type Ticket = {
  id: string;
  titre: string;
  prio: "P1" | "P2" | "P3";
  sla: string;
  status: "Reçu" | "En cours de résolution" | "Ouvert" | "Pris en charge";
  assigne: string;
  slaProgress: number;
};

const metrics: Metric[] = [
  {
    label: "TOTAL TICKETS",
    value: "6",
    detail: "2 aujourd’hui",
    valueColor: "text-[#181818]",
    accent: "bg-[#f1efe9]",
  },
  {
    label: "P1 CRITIQUES",
    value: "1",
    detail: "1 non ouvert",
    valueColor: "text-[#d73b2f]",
    accent: "bg-[#fde7e4]",
  },
  {
    label: "EN COURS",
    value: "4",
    detail: "SLA moyen P2 : 2h",
    valueColor: "text-[#f0a11d]",
    accent: "bg-[#fff1d7]",
  },
  {
    label: "RÉSOLUS / FERMÉS",
    value: "2",
    detail: "Taux : 33%",
    valueColor: "text-[#2fa26b]",
    accent: "bg-[#e4f5ec]",
  },
];

const tickets: Ticket[] = [
  {
    id: "#TK-001",
    titre: "Inaccessibilité à une plateforme métier",
    prio: "P1",
    sla: "2h 38m",
    status: "Reçu",
    assigne: "DSI",
    slaProgress: 92,
  },
  {
    id: "#TK-002",
    titre: "SOTRA — Retard de réception",
    prio: "P2",
    sla: "58m",
    status: "En cours de résolution",
    assigne: "Relation Clientèle",
    slaProgress: 58,
  },
  {
    id: "#TK-003",
    titre: "Plateforme — Bugs / Lenteurs",
    prio: "P2",
    sla: "1h 50m",
    status: "Ouvert",
    assigne: "DSI",
    slaProgress: 68,
  },
  {
    id: "#TK-004",
    titre: "Dysfonctionnement d’un portail externe",
    prio: "P2",
    sla: "1h 12m",
    status: "Pris en charge",
    assigne: "Boldcode",
    slaProgress: 44,
  },
];

const ticketStatusData = [
  { name: "Reçu", value: 1, color: "#d9d9d9" },
  { name: "Ouvert", value: 1, color: "#f4b000" },
  { name: "Pris en charge", value: 1, color: "#2dad5b" },
  { name: "En cours de résolution", value: 1, color: "#6d35d9" },
  { name: "Résolu", value: 1, color: "#727885" },
  { name: "Fermé", value: 1, color: "#1f6c97" },
];

const ticketPriorityData = [
  { name: "P1 Critique", value: 2, fill: "#e53935" },
  { name: "P2 Majeur", value: 3, fill: "#f4a300" },
  { name: "P3 Mineur", value: 1, fill: "#2ba84a" },
];

function priorityBadge(prio: Ticket["prio"]) {
  if (prio === "P1") {
    return "bg-[#fde8e5] text-[#d73b2f]";
  }
  if (prio === "P2") {
    return "bg-[#fff2db] text-[#d69007]";
  }
  return "bg-[#e7f5ec] text-[#2f8f58]";
}

function statusBadge(status: Ticket["status"]) {
  switch (status) {
    case "Reçu":
      return "bg-[#eceff3] text-[#5b6370]";
    case "En cours de résolution":
      return "bg-[#fff0bf] text-[#987100]";
    case "Ouvert":
      return "bg-[#fff5de] text-[#a76800]";
    case "Pris en charge":
      return "bg-[#e6f4ff] text-[#1d79c4]";
    default:
      return "bg-[#eceff3] text-[#5b6370]";
  }
}

function MetricCard({ metric }: { metric: Metric }) {
  return (
    <article className="relative overflow-hidden rounded-[14px] border border-[#ebe6df] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(17,17,17,0.03)]">
      <div
        className={`absolute -right-4 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full opacity-60 ${metric.accent}`}
      />
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8f8b85]">
        {metric.label}
      </p>
      <p className={`relative mt-2 text-[2rem] font-semibold leading-none ${metric.valueColor}`}>
        {metric.value}
      </p>
      <p className="relative mt-1 text-[11px] text-[#8a8176]">{metric.detail}</p>
    </article>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation du tableau de bord…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} title="Tableau de bord admin" subtitle="Vision globale des tickets">
      <AdminDashboardContent />
    </DashboardShell>
  );
}

function SlaBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-[4px] w-[72px] overflow-hidden rounded-full bg-[#e8e0d7]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#d63b35] to-[#f1a456]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[11px] text-[#7d7267]">{label}</span>
    </div>
  );
}

function MobileTicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <article className="space-y-2 rounded-[12px] border border-[#ebe6df] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8176]">
          {ticket.id}
        </span>
        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase ${priorityBadge(ticket.prio)}`}>
          {ticket.prio}
        </span>
      </div>
      <p className="text-sm font-semibold text-[#2b1d10]">{ticket.titre}</p>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#7d7267]">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f5f7] px-2 py-1 uppercase tracking-[0.2em] text-[#5c5c5c]">
          {ticket.assigne}
        </span>
        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${statusBadge(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>
      <SlaBar progress={ticket.slaProgress} label={ticket.sla} />
      <div className="flex justify-end">
        <button className="rounded-full bg-[#f9b800] px-3 py-[6px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#352300] shadow-[0_8px_16px_rgba(249,184,0,0.18)]">
          Voir
        </button>
      </div>
    </article>
  );
}

export function AdminDashboardContent() {
  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="inline-flex rounded-md bg-[#f3f5f7] px-2 py-[3px] text-[10px] font-semibold text-[#6e7681]">
            {row.original.id}
          </span>
        ),
      },
      {
        accessorKey: "titre",
        header: "TITRE",
        cell: ({ row }) => (
          <span className="block max-w-[320px] truncate text-[12px] text-[#241d16]">
            {row.original.titre}
          </span>
        ),
      },
      {
        accessorKey: "prio",
        header: "PRIO",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2 py-[3px] text-[10px] font-semibold uppercase ${priorityBadge(
              row.original.prio
            )}`}
          >
            {row.original.prio}
          </span>
        ),
      },
      {
        accessorKey: "sla",
        header: "SLA",
        cell: ({ row }) => (
          <SlaBar progress={row.original.slaProgress} label={row.original.sla} />
        ),
      },
      {
        accessorKey: "status",
        header: "STATUT",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2 py-[3px] text-[10px] font-medium ${statusBadge(
              row.original.status
            )}`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "assigne",
        header: "ASSIGNÉ",
        cell: ({ row }) => (
          <span className="text-[12px] text-[#544a40]">{row.original.assigne}</span>
        ),
      },
      {
        id: "action",
        header: "ACTION",
        cell: () => (
          <div className="flex justify-end">
            <button className="rounded-full bg-[#f9b800] px-3 py-[6px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#352300] shadow-[0_8px_16px_rgba(249,184,0,0.18)]">
              Voir
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: tickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* KPI */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {/* Alert */}
      <section className="rounded-[14px] border border-[#f0df8e] bg-[#fff6cc] px-4 py-3 shadow-[0_2px_8px_rgba(17,17,17,0.02)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold text-[#c26d00]">
              Escalade automatique — 1 ticket(s) non ouvert(s) depuis +1h
            </p>
            <p className="text-[11px] text-[#7e6c58]">
              Tickets concernés : #TK-001. Notifications envoyées automatiquement.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded-md bg-[#2dac45] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              Renvoyer WhatsApp
            </button>
            <button className="rounded-md bg-[#1f1f1f] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              Renvoyer Email
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-[14px] border border-[#ebe6df] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(17,17,17,0.03)]">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8b85]">
              Tickets actifs — SLA
            </p>
            <p className="mt-1 text-[11px] text-[#8a8176]">4 ticket(s)</p>
          </div>

          <button className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f0a000]">
            Voir
          </button>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={`border-b border-[#f1ece6] pb-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a9187] ${
                        index === headerGroup.headers.length - 1 ? "text-right" : ""
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="align-middle">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="border-b border-[#f5f1eb] py-3 pr-3 text-[12px] text-[#241d16] last:pr-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 lg:hidden">
          {tickets.map((ticket) => (
            <MobileTicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Donut */}
        <div className="rounded-[14px] border border-[#ebe6df] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(17,17,17,0.03)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8b85]">
              Tickets par statut
            </p>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Legend
                  verticalAlign="top"
                  align="center"
                  iconType="rect"
                  iconSize={10}
                  formatter={(value) => (
                    <span className="text-[11px] text-[#7a7268]">{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #ece7df",
                    fontSize: 12,
                  }}
                />
                <Pie
                  data={ticketStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="58%"
                  innerRadius={42}
                  outerRadius={66}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {ticketStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vertical bar */}
        <div className="rounded-[14px] border border-[#ebe6df] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(17,17,17,0.03)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8b85]">
              Tickets par priorité
            </p>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketPriorityData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#f0ece6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#7d7469" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#7d7469" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #ece7df",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {ticketPriorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
