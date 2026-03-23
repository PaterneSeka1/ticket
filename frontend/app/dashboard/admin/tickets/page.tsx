"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { fetchTickets } from "@/api/tickets";
import type { Ticket, TicketPriority, TicketStatus, TicketType } from "@/api/types";

type StatusFilter = TicketStatus | "Tous";
type PriorityFilter = TicketPriority | "Tous";

const statusLabels: Record<TicketStatus, { label: string; color: string }> = {
  RECU: { label: "Reçu", color: "bg-[#ffe9d6] text-[#c4620c]" },
  EN_COURS: { label: "En cours de résolution", color: "bg-[#fff6e0] text-[#c4620c]" },
  AJOURNE: { label: "Ajourné", color: "bg-[#f0ecff] text-[#5a3db7]" },
  RESOLU: { label: "Résolu", color: "bg-[#e8f6eb] text-[#1f6f3a]" },
  ABANDONNE: { label: "Abandonné", color: "bg-[#fde8e7] text-[#c42d1f]" },
  FERME: { label: "Fermé", color: "bg-[#f0f0f0] text-[#6b6b6b]" },
  OUVERT: { label: "Ouvert", color: "bg-[#fff7ea] text-[#a36807]" },
  PRIS: { label: "Pris en charge", color: "bg-[#eef5ff] text-[#1f4bbf]" },
};

const priorityLabels: Record<TicketPriority, { label: string; tone: string }> = {
  CRITIQUE: { label: "P1", tone: "bg-[#fee2e0] text-[#c42d1f]" },
  HAUT: { label: "P2", tone: "bg-[#fff1d6] text-[#d9731d]" },
  MOYEN: { label: "P3", tone: "bg-[#e8f6eb] text-[#1f6f3a]" },
  BAS: { label: "P4", tone: "bg-[#f0f4ff] text-[#1f4bbf]" },
};

const typeLabels: Record<TicketType, string> = {
  INCIDENT: "Interne",
  DEMANDE: "Client",
};

const statusOrder = Object.keys(statusLabels) as TicketStatus[];

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatDuration = (minutes?: number | null) => {
  if (minutes === undefined || minutes === null) {
    return "—";
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const parts: string[] = [];
  if (hours) {
    parts.push(`${hours}h`);
  }
  if (remainder || !parts.length) {
    parts.push(`${remainder}m`);
  }
  return parts.join(" ");
};

const getSlaProgress = (ticket: Ticket) => {
  if (!ticket.slaMaxMinutes) return 0;
  const consumed = ticket.waitMinutes ?? 0;
  return Math.min(100, Math.round((consumed / ticket.slaMaxMinutes) * 100));
};

export default function AdminTicketListPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("Tous");
  const [serviceFilter, setServiceFilter] = useState("Tous services");
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 });

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  useEffect(() => {
    if (status !== "ready") return;
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
  }, [status]);

  const serviceOptions = useMemo(() => {
    const services = Array.from(
      new Set(tickets.map((ticket) => ticket.assignedService ?? "").filter(Boolean)),
    );
    return services;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "Tous" || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === "Tous" || ticket.priority === priorityFilter;
      const matchesService =
        serviceFilter === "Tous services" || ticket.assignedService === serviceFilter;
      return matchesStatus && matchesPriority && matchesService;
    });
  }, [tickets, statusFilter, priorityFilter, serviceFilter]);

  const ticketColumns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      { id: "code", accessorFn: (ticket) => ticket.code },
      { id: "category", accessorFn: (ticket) => ticket.category.libelle },
      { id: "description", accessorFn: (ticket) => ticket.description },
      { id: "status", accessorFn: (ticket) => ticket.status },
      { id: "priority", accessorFn: (ticket) => ticket.priority },
      { id: "emitter", accessorFn: (ticket) => `${ticket.emitter.prenom} ${ticket.emitter.nom}` },
    ],
    [],
  );

  const ticketGlobalFilter = useCallback<FilterFn<Ticket>>((row, columnId, filterValue) => {
    const query = String(filterValue ?? "").trim().toLowerCase();
    if (!query) {
      return true;
    }
    const ticket = row.original;
    const haystack = [
      ticket.code,
      ticket.category.libelle,
      ticket.category.type,
      ticket.description,
      ticket.emitter.nom,
      ticket.emitter.prenom,
      ticket.assignedService ?? "",
      ticket.priority,
      ticket.status,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }, []);

  const table = useReactTable({
    data: filteredTickets,
    columns: ticketColumns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: ticketGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    setGlobalFilter(search);
  }, [search]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [filteredTickets.length, table]);

  const paginatedRows = table.getPaginationRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

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
    <DashboardShell user={user} title="Gestion des tickets" subtitle={`${tickets.length} ticket(s) au total`}>
      <div className="space-y-5 rounded-[32px] border border-[#f0d7c6] bg-[#fffdf7] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[#6b5446]">
            {loading ? "Chargement des tickets…" : `${filteredCount} ticket(s) trié(s)`}.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-[#d6c5b4] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2b1d10]"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-[#d6c5b4] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2b1d10]"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 items-end">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par ref, titre, client..."
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          >
            <option value="Tous">Tous statuts</option>
            {statusOrder.map((statusKey) => (
              <option key={statusKey} value={statusKey}>
                {statusLabels[statusKey].label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          >
            <option value="Tous">Toutes priorités</option>
            {Object.entries(priorityLabels).map(([key, data]) => (
              <option key={key} value={key}>
                {data.label}
              </option>
            ))}
          </select>
          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          >
            <option value="Tous services">Tous services</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-[24px] border border-[#f3ece2]">
          <table
            className="min-w-full table-fixed text-left text-sm"
            style={{ tableLayout: "fixed" }}
          >
            <thead className="text-xs uppercase tracking-[0.35em] text-[#8a7c6c]">
              <tr>
                <th className="pb-3">ID</th>
                <th className="pb-3">Catégorie / Titre</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Priorité</th>
                <th className="pb-3">SLA</th>
                <th className="pb-3">Statut</th>
                <th className="pb-3">Service assigné</th>
                <th className="pb-3">Émetteur</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right w-32">Action</th>
              </tr>
            </thead>
            <tbody className="text-[#2b1d10]">
              {loading && !paginatedRows.length ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-[#6b5446]">
                    Chargement en cours…
                  </td>
                </tr>
              ) : filteredCount ? (
                paginatedRows.map((row) => {
                  const ticket = row.original;
                  const priority = priorityLabels[ticket.priority];
                  const statusInfo = statusLabels[ticket.status];
                  const slaProgress = getSlaProgress(ticket);
                  const slaLabel = formatDuration(ticket.slaMaxMinutes);
                  return (
                    <tr key={ticket.id} className="border-b border-[#f3ece2]">
                      <td className="py-4 font-semibold text-[#2b1d10]">{ticket.code}</td>
                      <td className="py-4">
                        <p className="font-semibold text-[#2b1d10]">{ticket.category.libelle}</p>
                        <p className="text-xs text-[#6b5446]">{ticket.description}</p>
                      </td>
                      <td className="py-4">
                        <span className="text-xs uppercase tracking-[0.3em] text-[#6b5446]">
                          {typeLabels[ticket.type]}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${priority.tone}`}
                        >
                          {priority.label}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#6b5446]">
                          {slaLabel}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#f3ece2]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#c42d1f] to-[#f2976a]"
                            style={{ width: `${slaProgress}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4">{ticket.assignedService ?? "—"}</td>
                      <td className="py-4">
                        {ticket.emitter.prenom} {ticket.emitter.nom}
                      </td>
                      <td className="py-4">{formatDateTime(ticket.detectedAt ?? ticket.createdAt)}</td>
                      <td className="py-4 text-right w-32">
                        <button className="rounded-full border border-[#c6b6a9] px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#2b1d10]">
                          Détail
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-[#6b5446]">
                    Aucun ticket disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-[#f3ece2] bg-white/50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
            {filteredCount} résultat(s) • page {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-full border border-[#d6c5b4] px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2b1d10] disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-full border border-[#d6c5b4] px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2b1d10] disabled:opacity-50"
            >
              Suivant
            </button>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="rounded-[12px] border border-[#e2dbd1] bg-white px-3 py-1 text-[0.7rem] text-[#2b1d10]"
            >
              {[6, 12, 24].map((size) => (
                <option key={size} value={size}>
                  Afficher {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
