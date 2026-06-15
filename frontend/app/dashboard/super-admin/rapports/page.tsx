"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import type { Ticket, TicketPriority, TicketStatus } from "@/api/types";
import { PageSkeleton } from "../../components/PageSkeleton";

// ─── Palettes ─────────────────────────────────────────────────────────────────

const statusPalette: Partial<Record<TicketStatus, { label: string; color: string }>> = {
  RECU:               { label: "Reçu",                     color: "#d9d9d9" },
  OUVERT:             { label: "Ouvert",                   color: "#f7b500" },
  PRIS:               { label: "Pris en charge",           color: "#23b47e" },
  EN_COURS:           { label: "En cours de résolution",   color: "#7552d4" },
  RESOLU:             { label: "Résolu",                   color: "#727885" },
  FERME:              { label: "Fermé",                    color: "#1f6c97" },
  AJOURNE:            { label: "Ajourné",                  color: "#b266f5" },
  ABANDONNE:          { label: "Abandonné",                color: "#d63b35" },
  PENDING_ASSIGNMENT: { label: "En attente d'assignation", color: "#f7b500" },
  ASSIGNED:           { label: "Assigné",                  color: "#23b47e" },
  IN_PROGRESS:        { label: "En cours",                 color: "#7552d4" },
  RESOLVED:           { label: "Résolu",                   color: "#727885" },
  UNRESOLVED:         { label: "Non résolu",               color: "#d63b35" },
  CLOSED:             { label: "Clôturé",                  color: "#1f6c97" },
  REOPENED:           { label: "Réouvert",                 color: "#b266f5" },
  CANCELLED:          { label: "Annulé",                   color: "#d63b35" },
};

const priorityPalette: Record<TicketPriority, { label: string; short: string; color: string; bg: string }> = {
  CRITICAL: { label: "P1 — Critique", short: "P1", color: "#d63b35", bg: "#fef2f2" },
  HIGH:     { label: "P2 — Majeur",   short: "P2", color: "#f4a300", bg: "#fffbeb" },
  MEDIUM:   { label: "P3 — Mineur",   short: "P3", color: "#20b16a", bg: "#f0fdf4" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_SERVICE_LABEL = "Non assigné";
const RESOLVED_SET = new Set(["RESOLU", "RESOLVED", "FERME", "CLOSED", "UNRESOLVED"]);
const PENDING_SET  = new Set(["RECU", "OUVERT", "PENDING_ASSIGNMENT"]);

function resolveServiceLabel(service?: string | null) {
  if (!service) return DEFAULT_SERVICE_LABEL;
  switch (service) {
    case "QUALITE":    return "Qualité";
    case "OPERATIONS": return "Opérations";
    case "REPUTATION": return "Réputation";
    default:           return service;
  }
}

function resolveStatusMeta(status?: TicketStatus | string) {
  if (!status) return statusPalette.RECU!;
  return statusPalette[status as TicketStatus] ?? statusPalette.RECU!;
}

function resolvePriorityMeta(priority?: TicketPriority | string) {
  if (!priority) return priorityPalette.CRITICAL;
  return priorityPalette[priority as TicketPriority] ?? priorityPalette.CRITICAL;
}

const PERIOD_LABELS = ["Cette semaine", "Ce mois", "Ce trimestre", "Cette année"] as const;
type PeriodLabel = (typeof PERIOD_LABELS)[number];

function resolvePeriodStart(label: PeriodLabel | string): Date | null {
  const now  = new Date();
  const m    = now.getMonth();
  const y    = now.getFullYear();
  if (label === "Cette semaine") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (label === "Ce mois")      return new Date(y, m, 1, 0, 0, 0, 0);
  if (label === "Ce trimestre") return new Date(y, Math.floor(m / 3) * 3, 1, 0, 0, 0, 0);
  if (label === "Cette année")  return new Date(y, 0, 1, 0, 0, 0, 0);
  return null;
}

const SERVICE_FILTER_ALL = "Tous services";
const PRIORITY_FILTER_ALL = "Toutes priorités";
const PRIORITY_FILTER_OPTIONS = [PRIORITY_FILTER_ALL, "P1", "P2", "P3"] as const;

const fmt = (v: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(v));

const fmtDate = (v: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(v));

// ─── Download helpers ─────────────────────────────────────────────────────────

type DownloadPeriod = "7j" | "30j" | "3m" | "12m" | "custom";

const DOWNLOAD_PERIOD_OPTIONS: { key: DownloadPeriod; label: string }[] = [
  { key: "7j",     label: "7 derniers jours" },
  { key: "30j",    label: "30 derniers jours" },
  { key: "3m",     label: "3 derniers mois" },
  { key: "12m",    label: "12 derniers mois" },
  { key: "custom", label: "Période personnalisée" },
];

function resolveDownloadRange(period: DownloadPeriod, customFrom: string, customTo: string): [Date, Date] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  if (period === "7j")  { from.setDate(from.getDate() - 6); return [from, now]; }
  if (period === "30j") { from.setDate(from.getDate() - 29); return [from, now]; }
  if (period === "3m")  { from.setMonth(from.getMonth() - 3); return [from, now]; }
  if (period === "12m") { from.setFullYear(from.getFullYear() - 1); return [from, now]; }
  if (period === "custom" && customFrom && customTo) {
    const f = new Date(customFrom); f.setHours(0, 0, 0, 0);
    const t = new Date(customTo);   t.setHours(23, 59, 59, 999);
    return [f, t];
  }
  from.setDate(from.getDate() - 29);
  return [from, now];
}

function buildCSV(tickets: Ticket[], periodLabel: string, from: Date, to: Date): string {
  const resolvedCount = tickets.filter((t) => RESOLVED_SET.has(t.status)).length;
  const criticalCount = tickets.filter((t) => t.priority === "CRITICAL").length;
  const majorCount    = tickets.filter((t) => t.priority === "HIGH").length;
  const minorCount    = tickets.filter((t) => t.priority === "MEDIUM").length;
  const rate          = tickets.length ? Math.round((resolvedCount / tickets.length) * 100) : 0;

  const header = [
    `RAPPORT TICKETS — Veilleur des Médias`,
    `Généré le;${fmtDate(new Date().toISOString())}`,
    `Période;${periodLabel} (${fmtDate(from.toISOString())} → ${fmtDate(to.toISOString())})`,
    ``,
    `RÉSUMÉ`,
    `Total tickets;${tickets.length}`,
    `P1 Critiques;${criticalCount}`,
    `P2 Majeurs;${majorCount}`,
    `P3 Mineurs;${minorCount}`,
    `Tickets résolus;${resolvedCount}`,
    `Taux de résolution;${rate}%`,
    ``,
    `DÉTAIL DES TICKETS`,
    `Référence;Titre;Catégorie;Type;Priorité;Statut;Service;Émetteur;Client;Produit;Créé le;Résolu le;Commentaire résolution`,
  ];

  const rows = tickets.map((t) => {
    const cells = [
      t.code ?? "",
      (t.title ?? t.description ?? "").replace(/;/g, ",").replace(/\n/g, " "),
      t.category?.libelle ?? "",
      t.type ?? "",
      resolvePriorityMeta(t.priority).short,
      resolveStatusMeta(t.status).label,
      resolveServiceLabel(t.assignedService),
      t.emitter ? `${t.emitter.prenom} ${t.emitter.nom}` : "",
      t.clientName ?? "",
      t.product ?? (t.products?.join(", ") ?? ""),
      fmt(t.createdAt),
      t.resolvedAt ? fmt(t.resolvedAt) : "",
      (t.resolutionComment ?? "").replace(/;/g, ",").replace(/\n/g, " "),
    ];
    return cells.join(";");
  });

  return "﻿" + [...header, ...rows].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function buildPrintHTML(tickets: Ticket[], periodLabel: string, from: Date, to: Date): string {
  const resolvedCount = tickets.filter((t) => RESOLVED_SET.has(t.status)).length;
  const criticalCount = tickets.filter((t) => t.priority === "CRITICAL").length;
  const majorCount    = tickets.filter((t) => t.priority === "HIGH").length;
  const minorCount    = tickets.filter((t) => t.priority === "MEDIUM").length;
  const rate          = tickets.length ? Math.round((resolvedCount / tickets.length) * 100) : 0;

  const rows = tickets.map((t) => `
    <tr>
      <td>${t.code ?? ""}</td>
      <td>${(t.title ?? t.description ?? "").slice(0, 60)}</td>
      <td>${t.category?.libelle ?? ""}</td>
      <td style="color:${resolvePriorityMeta(t.priority).color};font-weight:700">${resolvePriorityMeta(t.priority).short}</td>
      <td><span style="display:inline-flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${resolveStatusMeta(t.status).color};display:inline-block"></span>${resolveStatusMeta(t.status).label}</span></td>
      <td>${resolveServiceLabel(t.assignedService)}</td>
      <td>${t.emitter ? `${t.emitter.prenom} ${t.emitter.nom}` : ""}</td>
      <td>${fmtDate(t.createdAt)}</td>
      <td>${t.resolvedAt ? fmtDate(t.resolvedAt) : "—"}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Rapport Tickets VDM — ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f1508; background: #fff; padding: 32px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #f0ece4; }
  .header h1 { font-size: 1.4rem; font-weight: 800; color: #1f1508; }
  .header p { font-size: 0.75rem; color: #8a7e6e; margin-top: 4px; }
  .kpis { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 100px; border: 1px solid #e8e0d4; border-radius: 10px; padding: 12px 16px; }
  .kpi .label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #a89880; margin-bottom: 4px; }
  .kpi .value { font-size: 1.6rem; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
  thead tr { background: #faf6f0; }
  th { text-align: left; padding: 8px 10px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #a89880; border-bottom: 2px solid #e8e0d4; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0ece4; vertical-align: middle; }
  tr:hover td { background: #faf6f0; }
  .footer { margin-top: 24px; font-size: 0.65rem; color: #b0a08c; text-align: right; }
  @media print { body { padding: 16px; } @page { margin: 1.5cm; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Rapport Tickets — Veilleur des Médias</h1>
      <p>Période : ${periodLabel} &nbsp;|&nbsp; Du ${fmtDate(from.toISOString())} au ${fmtDate(to.toISOString())}</p>
    </div>
    <div style="text-align:right;font-size:0.7rem;color:#8a7e6e">
      Généré le ${fmtDate(new Date().toISOString())}
    </div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="label">Total</div><div class="value" style="color:#3b82f6">${tickets.length}</div></div>
    <div class="kpi"><div class="label">P1 Critiques</div><div class="value" style="color:#d63b35">${criticalCount}</div></div>
    <div class="kpi"><div class="label">P2 Majeurs</div><div class="value" style="color:#f4a300">${majorCount}</div></div>
    <div class="kpi"><div class="label">P3 Mineurs</div><div class="value" style="color:#20b16a">${minorCount}</div></div>
    <div class="kpi"><div class="label">Résolus</div><div class="value" style="color:#727885">${resolvedCount}</div></div>
    <div class="kpi"><div class="label">Taux résolution</div><div class="value" style="color:#7552d4">${rate}%</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Référence</th><th>Titre</th><th>Catégorie</th><th>Priorité</th>
      <th>Statut</th><th>Service</th><th>Émetteur</th><th>Créé le</th><th>Résolu le</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Rapport généré automatiquement • Veilleur des Médias • ${new Date().getFullYear()}</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title, value, detail, accentColor, icon,
}: {
  title: string; value: string | number; detail: string; accentColor: string; icon: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[18px] border border-[#e8e0d4] bg-white px-5 py-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#a89880]">{title}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-[2rem] font-bold leading-none text-[#1f1508]">{value}</p>
      <p className="mt-1.5 text-[0.7rem] font-medium text-[#8a7e6e]">{detail}</p>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#a89880]">{title}</p>
      {sub && <p className="mt-0.5 text-sm font-medium text-[#4a3b28]">{sub}</p>}
    </div>
  );
}

// ─── Download Modal ───────────────────────────────────────────────────────────

function DownloadModal({
  tickets,
  onClose,
}: {
  tickets: Ticket[];
  onClose: () => void;
}) {
  const [period,     setPeriod]     = useState<DownloadPeriod>("30j");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");

  const [from, to] = useMemo(
    () => resolveDownloadRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const rangeTickets = useMemo(
    () => tickets.filter((t) => {
      const d = new Date(t.createdAt);
      return d >= from && d <= to;
    }),
    [tickets, from, to],
  );

  const periodLabel = DOWNLOAD_PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? period;

  function handleCSV() {
    const content  = buildCSV(rangeTickets, periodLabel, from, to);
    const slug     = periodLabel.toLowerCase().replace(/\s+/g, "-");
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadCSV(content, `rapport-tickets-vdm-${slug}-${dateSlug}.csv`);
    onClose();
  }

  function handlePDF() {
    const html = buildPrintHTML(rangeTickets, periodLabel, from, to);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.target   = "_blank";
    a.rel      = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-[20px] border border-[#e8e0d4] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#a89880]">Téléchargement</p>
            <h2 className="mt-0.5 text-base font-bold text-[#1f1508]">Générer un rapport</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e8e0d4] text-[#a89880] transition hover:bg-[#f0ece4] hover:text-[#2b1d10]"
          >
            ✕
          </button>
        </div>

        {/* Period picker */}
        <p className="mb-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#a89880]">
          Période à inclure
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {DOWNLOAD_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold transition ${
                period === opt.key
                  ? "border-[#f0a31c] bg-[#fef3d6] text-[#7a4e00]"
                  : "border-[#e8e0d4] bg-[#faf6f0] text-[#5a4e40] hover:border-[#ddd3c4]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === "custom" && (
          <div className="mb-4 flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#a89880]">
              Du
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-[10px] border border-[#ddd3c4] bg-[#fffaf5] px-3 py-2 text-[0.8rem] text-[#2b1d10] outline-none focus:border-[#f0a31c]"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#a89880]">
              Au
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-[10px] border border-[#ddd3c4] bg-[#fffaf5] px-3 py-2 text-[0.8rem] text-[#2b1d10] outline-none focus:border-[#f0a31c]"
              />
            </label>
          </div>
        )}

        {/* Preview count */}
        <div className="mb-5 rounded-[10px] border border-[#e8e0d4] bg-[#faf6f0] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] text-[#5a4e40]">Tickets dans la période</span>
            <span className="text-lg font-bold text-[#1f1508]">{rangeTickets.length}</span>
          </div>
          <p className="mt-0.5 text-[0.68rem] text-[#a89880]">
            {fmtDate(from.toISOString())} → {fmtDate(to.toISOString())}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCSV}
            disabled={rangeTickets.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#e8e0d4] bg-white py-2.5 text-[0.78rem] font-semibold text-[#2b1d10] transition hover:bg-[#f0ece4] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>⬇</span> CSV
          </button>
          <button
            onClick={handlePDF}
            disabled={rangeTickets.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#f9b800] py-2.5 text-[0.78rem] font-semibold text-[#352300] shadow-[0_4px_12px_rgba(249,184,0,0.3)] transition hover:bg-[#f2aa00] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>🖨</span> PDF / Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperAdminRapportsPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");

  const [selectedPeriod,   setSelectedPeriod]   = useState<PeriodLabel>("Ce mois");
  const [selectedService,  setSelectedService]  = useState(SERVICE_FILTER_ALL);
  const [selectedPriority, setSelectedPriority] = useState<typeof PRIORITY_FILTER_OPTIONS[number]>(PRIORITY_FILTER_ALL);
  const [tableSearch,      setTableSearch]      = useState("");
  const [downloadOpen,     setDownloadOpen]     = useState(false);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") { router.replace(getRedirectRouteForRole(user.role)); return; }
    if (user.accessReport === false)  router.replace(getRedirectRouteForRole(user.role));
  }, [router, status, user]);

  // ── Service options ────────────────────────────────────────────────────────
  const serviceOptions = useMemo(() => {
    const services = new Set<string>();
    let hasUnassigned = false;
    tickets.forEach((t) => {
      if (t.assignedService) services.add(t.assignedService);
      else hasUnassigned = true;
    });
    return [
      SERVICE_FILTER_ALL,
      ...(hasUnassigned ? [DEFAULT_SERVICE_LABEL] : []),
      ...Array.from(services).sort((a, b) => a.localeCompare(b)),
    ];
  }, [tickets]);

  useEffect(() => {
    if (!serviceOptions.includes(selectedService)) setSelectedService(SERVICE_FILTER_ALL);
  }, [selectedService, serviceOptions]);

  const periodStart = useMemo(() => resolvePeriodStart(selectedPeriod), [selectedPeriod]);

  // ── Filtered tickets ───────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const svc           = t.assignedService ?? DEFAULT_SERVICE_LABEL;
      const serviceMatch  = selectedService  === SERVICE_FILTER_ALL || svc === selectedService;
      const priorityMatch =
        selectedPriority === PRIORITY_FILTER_ALL ||
        resolvePriorityMeta(t.priority).short === selectedPriority;
      const periodMatch = periodStart ? new Date(t.createdAt) >= periodStart : true;
      return serviceMatch && priorityMatch && periodMatch;
    });
  }, [tickets, selectedService, selectedPriority, periodStart]);

  // ── KPI counts ─────────────────────────────────────────────────────────────
  const totalTickets  = filteredTickets.length;
  const criticalCount = filteredTickets.filter((t) => t.priority === "CRITICAL").length;
  const majorCount    = filteredTickets.filter((t) => t.priority === "HIGH").length;
  const minorCount    = filteredTickets.filter((t) => t.priority === "MEDIUM").length;
  const resolvedCount = filteredTickets.filter((t) => RESOLVED_SET.has(t.status)).length;
  const pendingCount  = filteredTickets.filter((t) => PENDING_SET.has(t.status)).length;
  const resolutionRate = totalTickets ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const statusData = useMemo(
    () =>
      Object.entries(statusPalette)
        .filter(([, m]) => Boolean(m))
        .map(([key, m]) => ({
          name:  m!.label,
          value: filteredTickets.filter((t) => t.status === key).length,
          color: m!.color,
        }))
        .filter((d) => d.value > 0),
    [filteredTickets],
  );

  const priorityData = useMemo(
    () =>
      (["CRITICAL", "HIGH", "MEDIUM"] as TicketPriority[]).map((p) => ({
        name:  priorityPalette[p].label,
        value: filteredTickets.filter((t) => t.priority === p).length,
        fill:  priorityPalette[p].color,
        bg:    priorityPalette[p].bg,
        pct:   totalTickets
          ? Math.round((filteredTickets.filter((t) => t.priority === p).length / totalTickets) * 100)
          : 0,
      })),
    [filteredTickets, totalTickets],
  );

  const serviceData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTickets.forEach((t) => {
      const k = resolveServiceLabel(t.assignedService);
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  const monthlyTrend = useMemo(() => {
    const bucket = new Map<string, { label: string; yearMonth: string; opened: number; resolved: number }>();
    filteredTickets.forEach((t) => {
      const d   = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const lbl = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d);
      if (!bucket.has(key)) bucket.set(key, { label: lbl, yearMonth: key, opened: 0, resolved: 0 });
      bucket.get(key)!.opened += 1;
      if (t.resolvedAt) {
        const r    = new Date(t.resolvedAt);
        const rKey = `${r.getFullYear()}-${(r.getMonth() + 1).toString().padStart(2, "0")}`;
        if (!bucket.has(rKey))
          bucket.set(rKey, { label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(r), yearMonth: rKey, opened: 0, resolved: 0 });
        bucket.get(rKey)!.resolved += 1;
      }
    });
    const sorted = Array.from(bucket.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    if (!sorted.length) {
      return [{ label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date()), ouvert: 0, resolu: 0 }];
    }
    return sorted.map((e) => ({ label: e.label, ouvert: e.opened, resolu: e.resolved }));
  }, [filteredTickets]);

  // ── Table ──────────────────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return filteredTickets;
    return filteredTickets.filter(
      (t) =>
        (t.code ?? "").toLowerCase().includes(q) ||
        (t.title ?? "").toLowerCase().includes(q) ||
        (t.category?.libelle ?? "").toLowerCase().includes(q) ||
        (t.emitter?.nom ?? "").toLowerCase().includes(q) ||
        (t.clientName ?? "").toLowerCase().includes(q) ||
        (t.assignedService ?? "").toLowerCase().includes(q),
    );
  }, [filteredTickets, tableSearch]);

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Réf.",
        cell: ({ getValue }) => (
          <span className="font-mono text-[0.72rem] font-semibold tracking-wider text-[#7a6542]">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Titre",
        cell: ({ row }) => {
          const title = row.original.title ?? row.original.description ?? "—";
          return (
            <span className="block max-w-[220px] truncate text-[0.8rem] font-medium text-[#1f1508]" title={title}>
              {title}
            </span>
          );
        },
      },
      {
        accessorKey: "category.libelle",
        header: "Catégorie",
        cell: ({ getValue }) => (
          <span className="text-[0.75rem] text-[#4a3b28]">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priorité",
        cell: ({ getValue }) => {
          const meta = resolvePriorityMeta(getValue<TicketPriority>());
          return (
            <span
              className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em]"
              style={{ backgroundColor: meta.bg, color: meta.color }}
            >
              {meta.short}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ getValue }) => {
          const meta = resolveStatusMeta(getValue<TicketStatus>());
          return (
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[#2b1d10]">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
              {meta.label}
            </span>
          );
        },
      },
      {
        accessorKey: "assignedService",
        header: "Service",
        cell: ({ getValue }) => (
          <span className="text-[0.75rem] text-[#5a4e40]">
            {resolveServiceLabel(getValue<string>() ?? null)}
          </span>
        ),
      },
      {
        accessorKey: "emitter",
        header: "Émetteur",
        cell: ({ getValue }) => {
          const emitter = getValue<Ticket["emitter"]>();
          return (
            <span className="text-[0.75rem] text-[#5a4e40]">
              {emitter ? `${emitter.prenom} ${emitter.nom}` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Créé le",
        cell: ({ getValue }) => (
          <span className="text-[0.72rem] tabular-nums text-[#8a7e6e]">{fmtDate(getValue<string>())}</span>
        ),
      },
      {
        accessorKey: "resolvedAt",
        header: "Résolu le",
        cell: ({ getValue }) => {
          const v = getValue<string | null>();
          return (
            <span className="text-[0.72rem] tabular-nums text-[#8a7e6e]">
              {v ? fmtDate(v) : <span className="text-[#c9bfb0]">—</span>}
            </span>
          );
        },
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15, pageIndex: 0 } },
  });

  // Reset to first page whenever data changes
  useEffect(() => { table.setPageIndex(0); }, [tableData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation des rapports…" />;
  }

  const canExport = user.exportReport !== false;

  return (
    <DashboardShell
      user={user}
      title="Rapports & Analyses"
      subtitle={loading ? "Chargement…" : `${totalTickets} ticket(s) sur la période · ${tickets.length} au total`}
    >
      {/* Download modal */}
      {downloadOpen && (
        <DownloadModal
          tickets={tickets}
          onClose={() => setDownloadOpen(false)}
        />
      )}

      <div className="space-y-6">

        {/* ── Filter bar ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-3 rounded-[16px] border border-[#e8e0d4] bg-white px-5 py-4 shadow-[0_4px_18px_rgba(0,0,0,0.05)]">
          <label className="flex flex-col gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#a89880]">
            Période
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodLabel)}
              className="min-w-[160px] rounded-[10px] border border-[#ddd3c4] bg-[#fffaf5] px-3 py-2 text-[0.8rem] font-medium text-[#2b1d10] outline-none transition focus:border-[#f0a31c] focus:ring-2 focus:ring-[#f0a31c]/20"
            >
              {PERIOD_LABELS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#a89880]">
            Service
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="min-w-[160px] rounded-[10px] border border-[#ddd3c4] bg-[#fffaf5] px-3 py-2 text-[0.8rem] font-medium text-[#2b1d10] outline-none transition focus:border-[#f0a31c] focus:ring-2 focus:ring-[#f0a31c]/20"
            >
              {serviceOptions.map((o) => <option key={o} value={o}>{resolveServiceLabel(o)}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#a89880]">
            Priorité
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as typeof PRIORITY_FILTER_OPTIONS[number])}
              className="min-w-[160px] rounded-[10px] border border-[#ddd3c4] bg-[#fffaf5] px-3 py-2 text-[0.8rem] font-medium text-[#2b1d10] outline-none transition focus:border-[#f0a31c] focus:ring-2 focus:ring-[#f0a31c]/20"
            >
              {PRIORITY_FILTER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>

          <div className="ml-auto flex items-end gap-3">
            <div className="text-right">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#a89880]">En attente</p>
              <p className="mt-0.5 text-2xl font-bold text-[#d97706]">{pendingCount}</p>
            </div>

            {canExport && (
              <button
                onClick={() => setDownloadOpen(true)}
                className="flex items-center gap-2 rounded-[12px] bg-[#f9b800] px-4 py-2.5 text-[0.78rem] font-semibold text-[#352300] shadow-[0_4px_12px_rgba(249,184,0,0.3)] transition hover:bg-[#f2aa00] hover:shadow-[0_6px_16px_rgba(249,184,0,0.35)]"
              >
                <span>⬇</span>
                Télécharger un rapport
              </button>
            )}
          </div>
        </div>

        {/* ── KPI cards ─────────────────────────────────────────────────────── */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard title="Total tickets"   value={totalTickets}        detail="sur la période"                                                                     accentColor="#3b82f6" icon="🎫" />
          <KpiCard title="P1 Critiques"    value={criticalCount}       detail={`${totalTickets ? Math.round(criticalCount / totalTickets * 100) : 0}% du total`}   accentColor="#d63b35" icon="🔴" />
          <KpiCard title="P2 Majeurs"      value={majorCount}          detail={`${totalTickets ? Math.round(majorCount / totalTickets * 100) : 0}% du total`}      accentColor="#f4a300" icon="🟠" />
          <KpiCard title="P3 Mineurs"      value={minorCount}          detail={`${totalTickets ? Math.round(minorCount / totalTickets * 100) : 0}% du total`}      accentColor="#20b16a" icon="🟢" />
          <KpiCard title="Taux résolution" value={`${resolutionRate}%`} detail={`${resolvedCount} résolu(s)`}                                                      accentColor="#7552d4" icon="✅" />
        </div>

        {/* ── Charts row ────────────────────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">

          {/* Status donut + legend */}
          <section className="rounded-[20px] border border-[#e8e0d4] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
            <SectionHeader title="Répartition par statut" sub="Distribution actuelle des tickets" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-52 w-full flex-shrink-0 sm:w-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="85%" paddingAngle={3} stroke="none">
                      {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8e0d4", fontSize: "0.75rem" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto max-h-52">
                {statusData.length === 0 ? (
                  <p className="text-[0.75rem] text-[#b0a08c]">Aucune donnée</p>
                ) : (
                  statusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1 transition hover:bg-[#faf6f0]">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate text-[0.75rem] text-[#4a3b28]">{entry.name}</span>
                      </div>
                      <span className="flex-shrink-0 text-[0.75rem] font-semibold text-[#1f1508]">{entry.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Priority bars + service list */}
          <section className="rounded-[20px] border border-[#e8e0d4] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
            <SectionHeader title="Répartition par priorité" sub="Tickets par niveau d'urgence" />
            <div className="flex flex-col gap-4">
              {priorityData.map((p) => (
                <div key={p.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[0.75rem] font-semibold text-[#2b1d10]">{p.name}</span>
                    <span className="text-[0.75rem] font-bold" style={{ color: p.fill }}>
                      {p.value} ({p.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f0ece4]">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.pct}%`, backgroundColor: p.fill }} />
                  </div>
                </div>
              ))}
            </div>

            {serviceData.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#a89880]">Par service</p>
                <div className="flex flex-col gap-1">
                  {serviceData.slice(0, 5).map((s) => (
                    <div key={s.name} className="flex items-center justify-between rounded-[6px] px-2 py-1 transition hover:bg-[#faf6f0]">
                      <span className="text-[0.72rem] text-[#4a3b28]">{s.name}</span>
                      <span className="rounded-full bg-[#f0ece4] px-2 py-0.5 text-[0.65rem] font-semibold text-[#7a6542]">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Monthly trend ──────────────────────────────────────────────────── */}
        <section className="rounded-[20px] border border-[#e8e0d4] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-start justify-between">
            <SectionHeader title="Évolution mensuelle" sub="Tickets ouverts vs résolus par mois" />
            <span className="mt-0.5 rounded-full border border-[#e8e0d4] bg-[#faf6f0] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#7a6542]">
              {loading ? "…" : `${monthlyTrend.length} mois`}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a89880" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a89880" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e8e0d4", fontSize: "0.75rem" }}
                  labelStyle={{ fontWeight: 700, color: "#2b1d10" }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  formatter={(v) => (
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4a3b28" }}>
                      {v === "ouvert" ? "Ouverts" : "Résolus"}
                    </span>
                  )}
                />
                <Line type="monotone" dataKey="ouvert" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="resolu" stroke="#20b16a" strokeWidth={2.5} dot={{ r: 4, fill: "#20b16a", strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Ticket table ───────────────────────────────────────────────────── */}
        <section className="rounded-[20px] border border-[#e8e0d4] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <SectionHeader
                title="Détail des tickets"
                sub={`${tableData.length} ticket(s)${tableSearch ? " correspondant à la recherche" : " dans la sélection"}`}
              />
            </div>
            <input
              type="text"
              placeholder="Rechercher…"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-48 rounded-[10px] border border-[#ddd3c4] bg-[#fffaf5] px-3 py-2 text-[0.8rem] text-[#2b1d10] placeholder:text-[#c0b09c] outline-none transition focus:border-[#f0a31c] focus:ring-2 focus:ring-[#f0a31c]/20"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="border-b-2 border-[#ede8df] bg-[#faf6f0] px-4 py-2.5 text-left text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#a89880]"
                      >
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-[0.8rem] text-[#b0a08c]">
                      Aucun ticket ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, i) => (
                    <tr key={row.id} className={`transition hover:bg-[#faf6f0] ${i % 2 === 0 ? "bg-white" : "bg-[#fdfaf6]"}`}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="border-b border-[#f0ece4] px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f0ece4] pt-4">
              <p className="text-[0.68rem] text-[#a89880]">
                Page <span className="font-semibold text-[#2b1d10]">{table.getState().pagination.pageIndex + 1}</span> sur{" "}
                <span className="font-semibold text-[#2b1d10]">{table.getPageCount()}</span>
                {" · "}
                <span className="font-semibold text-[#2b1d10]">{tableData.length}</span> entrée(s)
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e8e0d4] text-[0.75rem] text-[#5a4e40] transition hover:bg-[#f0ece4] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  «
                </button>
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e8e0d4] text-[0.75rem] text-[#5a4e40] transition hover:bg-[#f0ece4] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ‹
                </button>

                {/* Page number pills */}
                {Array.from({ length: table.getPageCount() }, (_, i) => i)
                  .filter((i) => Math.abs(i - table.getState().pagination.pageIndex) <= 2)
                  .map((i) => (
                    <button
                      key={i}
                      onClick={() => table.setPageIndex(i)}
                      className={`flex h-8 min-w-[2rem] items-center justify-center rounded-[8px] border px-2 text-[0.72rem] font-semibold transition ${
                        i === table.getState().pagination.pageIndex
                          ? "border-[#f0a31c] bg-[#fef3d6] text-[#7a4e00]"
                          : "border-[#e8e0d4] text-[#5a4e40] hover:bg-[#f0ece4]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e8e0d4] text-[0.75rem] text-[#5a4e40] transition hover:bg-[#f0ece4] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ›
                </button>
                <button
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e8e0d4] text-[0.75rem] text-[#5a4e40] transition hover:bg-[#f0ece4] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  »
                </button>

                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="ml-2 rounded-[8px] border border-[#ddd3c4] bg-[#fffaf5] px-2 py-1.5 text-[0.72rem] font-medium text-[#2b1d10] outline-none focus:border-[#f0a31c]"
                >
                  {[10, 15, 25, 50].map((s) => (
                    <option key={s} value={s}>{s} / page</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

      </div>
    </DashboardShell>
  );
}
