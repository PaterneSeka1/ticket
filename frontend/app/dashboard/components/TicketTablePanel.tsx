"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import {
  ColumnDef,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Ticket, TicketPriority, TicketStatus } from "@/api/types";

import { TicketDetailModal } from "./TicketDetailModal";
import {
  formatDateTime,
  formatDuration,
  getSlaProgress,
  getSlaTone,
  priorityLabels,
  statusLabels,
  typeLabels,
} from "@/app/dashboard/lib/ticket-formatters";

export type StatusFilter = TicketStatus | "Tous";
export type PriorityFilter = TicketPriority | "Tous";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const statusOrder = Object.keys(statusLabels) as TicketStatus[];

interface TicketTablePanelProps {
  tickets: Ticket[];
  loading: boolean;
  ticketFilter?: (ticket: Ticket) => boolean;
}

export function TicketTablePanel({ tickets, loading, ticketFilter }: TicketTablePanelProps) {
  const filteredSource = useMemo(() => {
    if (!ticketFilter) return tickets;
    return tickets.filter(ticketFilter);
  }, [ticketFilter, tickets]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("Tous");
  const [serviceFilter, setServiceFilter] = useState("Tous services");
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const closeTicketModal = useCallback(() => setSelectedTicket(null), []);

  const serviceOptions = useMemo(() => {
    return Array.from(
      new Set(filteredSource.map((ticket) => ticket.assignedService ?? "").filter(Boolean)),
    );
  }, [filteredSource]);

  const filteredTickets = useMemo(() => {
    return filteredSource.filter((ticket) => {
      const matchesStatus = statusFilter === "Tous" || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === "Tous" || ticket.priority === priorityFilter;
      const matchesService =
        serviceFilter === "Tous services" || ticket.assignedService === serviceFilter;

      return matchesStatus && matchesPriority && matchesService;
    });
  }, [filteredSource, priorityFilter, serviceFilter, statusFilter]);

  const ticketGlobalFilter = useCallback<FilterFn<Ticket>>((row, _columnId, filterValue) => {
    const query = String(filterValue ?? "").trim().toLowerCase();
    if (!query) return true;

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
      ticket.type,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  }, []);

  const ticketColumns = useMemo<ColumnDef<Ticket>[]>(() => [
      {
        id: "code",
        accessorFn: (ticket) => ticket.code,
        header: "ID",
        cell: ({ row }) => (
          <span className="inline-flex rounded-[8px] bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#4b5563]">
            {row.original.code}
          </span>
        ),
        size: 110,
      },
      {
        id: "categoryTitle",
        header: "Catégorie / Titre",
        cell: ({ row }) => {
          const ticket = row.original;

          return (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#23160c]">
                {ticket.category.libelle}
              </p>
              <p className="truncate text-[12px] text-[#7b6655]">{ticket.description}</p>
            </div>
          );
        },
        size: 280,
      },
      {
        id: "type",
        accessorFn: (ticket) => ticket.type,
        header: "Type",
        cell: ({ row }) => (
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#6b5446]">
            {typeLabels[row.original.type]}
          </span>
        ),
        size: 90,
      },
      {
        id: "priority",
        accessorFn: (ticket) => ticket.priority,
        header: "Priorité",
        cell: ({ row }) => {
          const priority = priorityLabels[row.original.priority];

          return (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                priority.tone,
              )}
            >
              {priority.label}
            </span>
          );
        },
        size: 90,
      },
      {
        id: "sla",
        header: "SLA",
        cell: ({ row }) => {
          const ticket = row.original;
          const progress = getSlaProgress(ticket);
          const tone = getSlaTone(progress);
          const label = formatDuration(ticket.waitMinutes ?? ticket.slaMaxMinutes);

          return (
            <div className="w-full min-w-[110px]">
              <div className={cn("mb-1 text-[11px] font-semibold", tone.text)}>{label}</div>
              <div className={cn("h-1.5 overflow-hidden rounded-full", tone.track)}>
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", tone.bar)}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        },
        size: 130,
      },
      {
        id: "status",
        accessorFn: (ticket) => ticket.status,
        header: "Statut",
        cell: ({ row }) => {
          const statusInfo = statusLabels[row.original.status];

          return (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                statusInfo.color,
              )}
            >
              {statusInfo.label}
            </span>
          );
        },
        size: 150,
      },
      {
        id: "assignedService",
        accessorFn: (ticket) => ticket.assignedService ?? "",
        header: "Service assigné",
        cell: ({ row }) => (
          <span className="text-[12px] text-[#2b1d10]">
            {row.original.assignedService ?? "—"}
          </span>
        ),
        size: 140,
      },
      {
        id: "emitter",
        accessorFn: (ticket) => `${ticket.emitter.prenom} ${ticket.emitter.nom}`,
        header: "Émetteur",
        cell: ({ row }) => (
          <span className="text-[12px] text-[#2b1d10]">
            {row.original.emitter.prenom} {row.original.emitter.nom}
          </span>
        ),
        size: 130,
      },
      {
        id: "date",
        accessorFn: (ticket) => ticket.detectedAt ?? ticket.createdAt ?? "",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-[12px] text-[#5f4d3f]">
            {formatDateTime(row.original.detectedAt ?? row.original.createdAt)}
          </span>
        ),
        size: 100,
      },
          {
            id: "actions",
            header: "Action",
            cell: ({ row }) => (
              <button
                type="button"
                className="rounded-[10px] border border-[#d8cabc] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
                onClick={() => setSelectedTicket(row.original)}
              >
                Détail
              </button>
            ),
            size: 90,
          },
    ],
    [],
  );

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
    defaultColumn: {
      minSize: 60,
      size: 120,
    },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, statusFilter, priorityFilter, serviceFilter, table]);

  const paginatedRows = table.getPaginationRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalColumns = table.getAllLeafColumns().length;

  const mobileRows = filteredTickets;

  return (
    <>
      <div className="space-y-4 rounded-[24px] border border-[#f1e5d7] bg-[#fffaf5] p-5 shadow-[0_18px_40px_rgba(43,29,16,0.05)]">
        <div className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b87731]">
              Ticketing Vedem
            </p>
            <p className="mt-1 text-[13px] text-[#7b6655]">
              {loading ? "Chargement des tickets…" : `${filteredCount} ticket(s) trié(s).`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#dcccbc] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#dcccbc] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_180px_180px_180px]">
          <input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Rechercher par ref, titre, client..."
            className="h-10 rounded-[12px] border border-[#e7ddd2] bg-white px-3 text-sm text-[#2b1d10] placeholder:text-[#a28d7b] focus:border-[#d29b55] focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-10 rounded-[12px] border border-[#e7ddd2] bg-white px-3 text-sm text-[#2b1d10] focus:border-[#d29b55] focus:outline-none"
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
            className="h-10 rounded-[12px] border border-[#e7ddd2] bg-white px-3 text-sm text-[#2b1d10] focus:border-[#d29b55] focus:outline-none"
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
            className="h-10 rounded-[12px] border border-[#e7ddd2] bg-white px-3 text-sm text-[#2b1d10] focus:border-[#d29b55] focus:outline-none"
          >
            <option value="Tous services">Tous services</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4 lg:hidden max-w-[420px] mx-auto w-full">
          {mobileRows.length === 0 ? (
            <div className="rounded-[18px] border border-[#eee3d6] bg-white p-4 text-center text-sm text-[#6b5446]">
              {loading ? "Chargement en cours…" : "Aucun ticket disponible."}
            </div>
          ) : (
            mobileRows.map((ticket) => {
              const statusInfo = statusLabels[ticket.status];
              const priorityInfo = priorityLabels[ticket.priority];

              return (
                <article
                  key={ticket.id}
                  className="rounded-[18px] border border-[#eee3d6] bg-white p-4 shadow-[0_10px_30px_rgba(17,17,17,0.08)]"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#2b1d10]">{ticket.category.libelle}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b6655]">
                        {ticket.code}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#5f4d3f]">{ticket.description}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                      <span className={cn("rounded-full px-3 py-1", priorityInfo.tone)}>{priorityInfo.label}</span>
                      <span className={cn("rounded-full px-3 py-1", statusInfo.color)}>{statusInfo.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#7b6655]">
                      <span>Service: {ticket.assignedService ?? "—"}</span>
                      <span>Émetteur: {ticket.emitter.prenom} {ticket.emitter.nom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[12px] text-[#7b6655]">
                        Date: {formatDateTime(ticket.detectedAt ?? ticket.createdAt)}
                      </span>
                      <button
                        type="button"
                        className="rounded-[10px] border border-[#dcccbc] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        Détails
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="hidden lg:block overflow-hidden rounded-[18px] border border-[#eee3d6] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead className="bg-[#f7f1ea]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="border-b border-[#eee3d6] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
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
                ) : filteredCount ? (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="bg-white transition hover:bg-[#fcfaf7]">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="border-b border-[#f4ece3] px-4 py-3 align-middle">
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
        </div>

        <div className="flex flex-col gap-2 rounded-[16px] border border-[#f1e6da] bg-[#fffdfb] px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b6655]">
            {filteredCount} résultat(s) • page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </div>

          <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-full rounded-[10px] border border-[#dcccbc] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition disabled:opacity-40 md:w-auto"
            >
              Précédent
            </button>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="w-full rounded-[10px] border border-[#dcccbc] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition disabled:opacity-40 md:w-auto"
            >
              Suivant
            </button>

            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="h-8 w-full rounded-[10px] border border-[#e7ddd2] bg-white px-2 text-[11px] text-[#2b1d10] focus:border-[#d29b55] focus:outline-none md:w-auto"
            >
              {[3, 6, 12, 24].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={closeTicketModal} />
      )}
    </>
  );
}
