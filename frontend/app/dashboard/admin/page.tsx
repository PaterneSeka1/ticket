"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
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
import { useTickets } from "../hooks/useTickets";
import { useRouter } from "next/navigation";
import type { Ticket, TicketPriority, TicketStatus } from "@/api/types";
import {
  formatDuration,
  getSlaProgress,
  getSlaTone,
  priorityLabels,
  statusLabels,
} from "@/app/dashboard/lib/ticket-formatters";

const STATUS_CHART_COLORS: Record<TicketStatus, string> = {
  RECU: "#d9d9d9",
  EN_COURS: "#6d35d9",
  AJOURNE: "#b4a5f0",
  RESOLU: "#1f6c97",
  ABANDONNE: "#d63b35",
  FERME: "#727885",
  OUVERT: "#f4b000",
  PRIS: "#2dad5b",
};

const PRIORITY_CHART_COLORS: Record<TicketPriority, string> = {
  CRITICAL: "#e53935",
  HIGH: "#f4a300",
  MEDIUM: "#2ba84a",
  LOW: "#1f6bb7",
};

const PRIORITY_DISPLAY_NAMES: Record<TicketPriority, string> = {
  CRITICAL: "Critique",
  HIGH: "Haut",
  MEDIUM: "Moyen",
  LOW: "Bas",
};

const OPEN_STATUSES = new Set<TicketStatus>(["RECU", "EN_COURS", "OUVERT", "PRIS"]);
const RESOLVED_STATUSES = new Set<TicketStatus>(["RESOLU", "FERME", "ABANDONNE"]);

const STATUS_LIST = Object.keys(statusLabels) as TicketStatus[];
const PRIORITY_LIST: TicketPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

type Metric = {
  label: string;
  value: string;
  detail: string;
  valueColor: string;
  accent: string;
};

function priorityBadge(priority: TicketPriority) {
  return `inline-flex rounded-full px-2 py-[3px] text-[10px] font-semibold uppercase ${priorityLabels[priority].tone}`;
}

function statusBadge(status: TicketStatus) {
  return statusLabels[status].color;
}

function getAssigneeLabel(ticket: Ticket) {
  if (ticket.receivedBy) {
    return `${ticket.receivedBy.prenom} ${ticket.receivedBy.nom}`;
  }
  return ticket.assignedService ?? "—";
}

function SlaBar({ ticket }: { ticket: Ticket }) {
  const progress = getSlaProgress(ticket);
  const tone = getSlaTone(progress);
  const label = formatDuration(ticket.waitMinutes ?? ticket.slaMaxMinutes);

  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className={`h-[4px] w-[72px] overflow-hidden rounded-full ${tone.track}`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[11px] text-[#7d7267]">{label}</span>
    </div>
  );
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

function MobileTicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <article className="space-y-2 rounded-[12px] border border-[#ebe6df] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8176]">
          {ticket.code}
        </span>
        <span className={priorityBadge(ticket.priority)}>
          {priorityLabels[ticket.priority].label}
        </span>
      </div>
      <p className="text-sm font-semibold text-[#2b1d10]">{ticket.category.libelle}</p>
      <p className="text-[12px] text-[#7d7267]">{ticket.description}</p>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#7d7267]">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f5f7] px-2 py-1 uppercase tracking-[0.2em] text-[#5c5c5c]">
          {getAssigneeLabel(ticket)}
        </span>
        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${statusBadge(ticket.status)}`}>
          {statusLabels[ticket.status].label}
        </span>
      </div>
      <SlaBar ticket={ticket} />
      <div className="flex justify-end">
        <button className="rounded-full bg-[#f9b800] px-3 py-[6px] text-[10px] font-semibold uppercase tracking-[0.08em] text-[#352300] shadow-[0_8px_16px_rgba(249,184,0,0.18)]">
          Voir
        </button>
      </div>
    </article>
  );
}

export function AdminDashboardContent() {
  const { tickets, loading } = useTickets(true);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 });

  const { metrics, ticketStatusData, ticketPriorityData } = useMemo(() => {
    const todayKey = new Date().toDateString();
    const statusTotals: Record<TicketStatus, number> = {} as Record<TicketStatus, number>;
    STATUS_LIST.forEach((status) => {
      statusTotals[status] = 0;
    });

    const priorityTotals: Record<TicketPriority, number> = {} as Record<TicketPriority, number>;
    PRIORITY_LIST.forEach((priority) => {
      priorityTotals[priority] = 0;
    });

    let todayCount = 0;
    let unresolvedCritical = 0;
    let openCount = 0;
    let resolvedCount = 0;
    const highWaits: number[] = [];

    for (const ticket of tickets) {
      const createdAt = new Date(ticket.createdAt);
      if (!Number.isNaN(createdAt.getTime()) && createdAt.toDateString() === todayKey) {
        todayCount += 1;
      }

      statusTotals[ticket.status] += 1;
      priorityTotals[ticket.priority] += 1;

      if (ticket.priority === "CRITICAL" && !RESOLVED_STATUSES.has(ticket.status)) {
        unresolvedCritical += 1;
      }

      if (OPEN_STATUSES.has(ticket.status)) {
        openCount += 1;
      }

      if (RESOLVED_STATUSES.has(ticket.status)) {
        resolvedCount += 1;
      }

      if (ticket.priority === "HIGH" && ticket.waitMinutes != null) {
        highWaits.push(ticket.waitMinutes);
      }
    }

    const averageHighWait =
      highWaits.length > 0
        ? Math.round(highWaits.reduce((sum, value) => sum + value, 0) / highWaits.length)
        : undefined;
    const resolvedPercent = tickets.length ? Math.round((resolvedCount / tickets.length) * 100) : 0;

    const normalizedStatusData = STATUS_LIST.map((status) => ({
      name: statusLabels[status].label,
      value: statusTotals[status],
      color: STATUS_CHART_COLORS[status],
    })).filter((entry) => entry.value > 0);

    const normalizedPriorityData = PRIORITY_LIST.map((priority) => ({
      name: `${priorityLabels[priority].label} ${PRIORITY_DISPLAY_NAMES[priority]}`,
      value: priorityTotals[priority],
      fill: PRIORITY_CHART_COLORS[priority],
    })).filter((entry) => entry.value > 0);

    return {
      metrics: [
        {
          label: "TOTAL TICKETS",
          value: `${tickets.length}`,
          detail: `${todayCount} déposés aujourd’hui`,
          valueColor: "text-[#181818]",
          accent: "bg-[#f1efe9]",
        },
        {
          label: "P1 CRITIQUES",
          value: `${priorityTotals.CRITICAL}`,
          detail: `${unresolvedCritical} non résolus`,
          valueColor: "text-[#d73b2f]",
          accent: "bg-[#fde7e4]",
        },
        {
          label: "EN COURS",
          value: `${openCount}`,
          detail: `SLA moyen ${PRIORITY_DISPLAY_NAMES["HIGH"]} : ${formatDuration(averageHighWait)}`,
          valueColor: "text-[#f0a11d]",
          accent: "bg-[#fff1d7]",
        },
        {
          label: "RÉSOLUS / FERMÉS",
          value: `${resolvedCount}`,
          detail: `Taux : ${resolvedPercent}%`,
          valueColor: "text-[#2fa26b]",
          accent: "bg-[#e4f5ec]",
        },
      ],
      ticketStatusData: normalizedStatusData.length
        ? normalizedStatusData
        : [{ name: "Aucun ticket", value: 1, color: "#d9d9d9" }],
      ticketPriorityData: normalizedPriorityData.length
        ? normalizedPriorityData
        : [{ name: "Aucune priorité", value: 1, fill: "#d9d9d9" }],
    };
  }, [tickets]);

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "code",
        header: "ID",
        cell: ({ row }) => (
          <span className="inline-flex rounded-md bg-[#f3f5f7] px-2 py-[3px] text-[10px] font-semibold text-[#6e7681]">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "title",
        header: "TITRE",
        cell: ({ row }) => (
          <div className="max-w-[320px]">
            <p className="truncate text-[12px] font-semibold text-[#241d16]">
              {row.original.category.libelle}
            </p>
            <p className="truncate text-[11px] text-[#7d7267]">{row.original.description}</p>
          </div>
        ),
      },
      {
        accessorKey: "priority",
        header: "PRIO",
        cell: ({ row }) => (
          <span className={priorityBadge(row.original.priority)}>
            {priorityLabels[row.original.priority].label}
          </span>
        ),
      },
      {
        id: "sla",
        header: "SLA",
        cell: ({ row }) => <SlaBar ticket={row.original} />,
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
            {statusLabels[row.original.status].label}
          </span>
        ),
      },
      {
        id: "assigne",
        header: "ASSIGNÉ",
        cell: ({ row }) => (
          <span className="text-[12px] text-[#544a40]">{getAssigneeLabel(row.original)}</span>
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
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    setPagination((current) =>
      current.pageIndex !== 0 ? { ...current, pageIndex: 0 } : current,
    );
  }, [tickets]);

  const paginatedRows = table.getPaginationRowModel().rows;
  const totalColumns = table.getAllLeafColumns().length;
  const hasTickets = tickets.length > 0;

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
            <p className="mt-1 text-[11px] text-[#8a8176]">
              {loading ? "Chargement des tickets…" : `${tickets.length} ticket(s)`}
            </p>
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
              {loading && !paginatedRows.length ? (
                <tr>
                  <td colSpan={totalColumns} className="px-4 py-8 text-center text-sm text-[#6b5446]">
                    Chargement en cours…
                  </td>
                </tr>
              ) : hasTickets ? (
                paginatedRows.map((row) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={totalColumns} className="px-4 py-8 text-center text-sm text-[#6b5446]">
                    Aucun ticket disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-col gap-3 rounded-[14px] border border-[#f1e6da] bg-[#fffdfb] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b6655]">
            {tickets.length} ticket(s) • page {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-full rounded-[10px] border border-[#dcccbc] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition disabled:opacity-40 lg:w-auto"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="w-full rounded-[10px] border border-[#dcccbc] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition disabled:opacity-40 lg:w-auto"
            >
              Suivant
            </button>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="h-8 w-full rounded-[10px] border border-[#e7ddd2] bg-white px-2 text-[11px] text-[#2b1d10] focus:border-[#d29b55] focus:outline-none lg:w-auto"
            >
              {[6, 12, 24].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-3 lg:hidden">
          {loading ? (
            <div className="rounded-[12px] border border-[#ebe6df] bg-[#f9fafb] px-4 py-3 text-[12px] text-[#7d7267]">
              Chargement des tickets…
            </div>
          ) : tickets.length ? (
            tickets.map((ticket) => (
              <MobileTicketCard key={ticket.id} ticket={ticket} />
            ))
          ) : (
            <div className="rounded-[12px] border border-[#ebe6df] bg-[#f9fafb] px-4 py-3 text-[12px] text-[#7d7267]">
              Aucun ticket actif pour le moment.
            </div>
          )}
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
