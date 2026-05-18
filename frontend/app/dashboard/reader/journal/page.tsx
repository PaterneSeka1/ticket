"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchActivityLogs } from "@/api/activity";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import {
  buildTicketJournalEntries,
  filterJournalEntries,
  toDateInputValue,
  type JournalEventType,
  type TicketJournalEntry,
} from "@/app/dashboard/lib/journal";
import { formatDateTime } from "@/app/dashboard/lib/ticket-formatters";
import type { ActivityLogEntry } from "@/api/types";

const EVENT_CFG: Record<
  JournalEventType,
  { label: string; icon: string; borderColor: string; badgeCls: string; dotCls: string }
> = {
  CREATE: {
    label: "Création",
    icon: "✦",
    borderColor: "#16a34a",
    badgeCls: "bg-[#dcfce7] text-[#15803d]",
    dotCls: "bg-[#16a34a]",
  },
  STATUS_CHANGE: {
    label: "Changement statut",
    icon: "⟳",
    borderColor: "#d97706",
    badgeCls: "bg-[#fef3c7] text-[#92400e]",
    dotCls: "bg-[#d97706]",
  },
  COMMENT: {
    label: "Commentaire",
    icon: "💬",
    borderColor: "#3b82f6",
    badgeCls: "bg-[#dbeafe] text-[#1d4ed8]",
    dotCls: "bg-[#3b82f6]",
  },
};

const FILTER_OPTIONS = ["TOUS", "CREATE", "STATUS_CHANGE", "COMMENT"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

function groupByDate(entries: TicketJournalEntry[]) {
  const map = new Map<string, TicketJournalEntry[]>();
  for (const entry of entries) {
    const key = toDateInputValue(new Date(entry.createdAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
}

function formatDateLabel(yyyy_mm_dd: string) {
  const d = new Date(`${yyyy_mm_dd}T00:00:00`);
  const today = toDateInputValue();
  const yesterday = toDateInputValue(new Date(Date.now() - 86400000));
  if (yyyy_mm_dd === today) return "Aujourd'hui";
  if (yyyy_mm_dd === yesterday) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function KpiCard({ label, value, sub, accent, icon }: { label: string; value: string | number; sub: string; accent: string; icon: string }) {
  return (
    <div className="rounded-[20px] border border-[#eee3d6] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(43,29,16,0.05)]">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8b7765]">{label}</p>
        <span className="text-[20px] leading-none">{icon}</span>
      </div>
      <p className="mt-3 text-[28px] font-[800] leading-none" style={{ color: accent }}>{value}</p>
      <p className="mt-1.5 text-[11px] text-[#a0897b]">{sub}</p>
    </div>
  );
}

function EventRow({ entry }: { entry: TicketJournalEntry }) {
  const cfg = EVENT_CFG[entry.type];
  return (
    <div
      className="group relative rounded-[14px] border border-[#f1ede8] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(43,29,16,0.04)] transition hover:shadow-[0_6px_20px_rgba(43,29,16,0.08)]"
      style={{ borderLeft: `4px solid ${cfg.borderColor}` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${cfg.dotCls} text-white font-bold`}>
            {cfg.icon}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${cfg.badgeCls}`}>
            {cfg.label}
          </span>
          <span className="rounded-full border border-[#ece6dd] bg-[#fffaf5] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#7b6655]">
            #{entry.ticketCode}
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#a0897b]">{timeOnly(entry.createdAt)}</span>
      </div>
      <p className="mt-2 text-[13px] font-[600] leading-snug text-[#2b1d10]">{entry.label}</p>
      {entry.details && (
        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#5f4d3f]">{entry.details}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#8b7765]">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d4c8bc]" />
          {entry.actorName}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#d4c8bc]" />
          {entry.ticketCategory}
        </span>
      </div>
    </div>
  );
}

function SessionRow({ log }: { log: ActivityLogEntry }) {
  const isLogin = log.action === "auth.login";
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-[#f1ede8] bg-white px-3 py-3">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] ${isLogin ? "bg-[#dcfce7]" : "bg-[#fff7ed]"}`}>
        {isLogin ? "🔐" : "🚪"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <p className="truncate text-[12px] font-semibold text-[#2b1d10]">
            {log.actorName ?? "Utilisateur inconnu"}
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${isLogin ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fff7ed] text-[#c2410c]"}`}>
            {isLogin ? "Connexion" : "Déconnexion"}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-[#a0897b]">{formatDateTime(log.createdAt)}</p>
        {log.details && <p className="mt-0.5 truncate text-[11px] text-[#7b6655]">{log.details}</p>}
      </div>
    </div>
  );
}

export default function ReaderJournalPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");

  const [selectedType, setSelectedType] = useState<FilterOption>("TOUS");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue());
  const [activityPage, setActivityPage] = useState(0);
  const ACTIVITY_PAGE_SIZE = 20;

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [debouncedSessionSearch, setDebouncedSessionSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "LOGIN" | "LOGOUT">("ALL");
  const [sessionPage, setSessionPage] = useState(0);
  const SESSION_PAGE_SIZE = 8;

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "READER") router.replace(getRedirectRouteForRole(user.role));
  }, [router, status, user]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSessionSearch(sessionSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [sessionSearch]);

  const journalEntries = useMemo(() => {
    const entries = tickets.flatMap((t) => buildTicketJournalEntries(t));
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tickets]);

  const filteredEvents = useMemo(
    () => filterJournalEntries(journalEntries, { type: selectedType, search: timelineSearch, date: selectedDate }),
    [journalEntries, selectedType, timelineSearch, selectedDate],
  );

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / ACTIVITY_PAGE_SIZE));
  const safePage = Math.min(activityPage, pageCount - 1);
  const pagedEvents = filteredEvents.slice(safePage * ACTIVITY_PAGE_SIZE, (safePage + 1) * ACTIVITY_PAGE_SIZE);
  const groupedEvents = groupByDate(pagedEvents);

  useEffect(() => { setActivityPage(0); }, [selectedType, timelineSearch, selectedDate]);

  const summary = useMemo(() => {
    const allToday = journalEntries.filter(
      (e) => toDateInputValue(new Date(e.createdAt)) === toDateInputValue(),
    );
    return {
      totalEvents: journalEntries.length,
      ticketsTracked: new Set(journalEntries.map((e) => e.ticketId)).size,
      todayEvents: allToday.length,
      todayComments: allToday.filter((e) => e.type === "COMMENT").length,
    };
  }, [journalEntries]);

  useEffect(() => {
    if (status !== "ready" || user?.role !== "READER") return;
    let cancelled = false;
    const load = async () => {
      setLogsLoading(true);
      try {
        const actionParam =
          actionFilter === "LOGIN" ? "auth.login" : actionFilter === "LOGOUT" ? "auth.logout" : undefined;
        const data = await fetchActivityLogs({
          limit: 500,
          action: actionParam,
          search: debouncedSessionSearch || undefined,
          date: selectedDate,
        });
        if (!cancelled) { setActivityLogs(data); setLogsError(null); }
      } catch {
        if (!cancelled) { setActivityLogs([]); setLogsError("Impossible de récupérer l'historique."); }
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [status, user, actionFilter, debouncedSessionSearch, selectedDate]);

  const sessionPageCount = Math.max(1, Math.ceil(activityLogs.length / SESSION_PAGE_SIZE));
  const safeSessionPage = Math.min(sessionPage, sessionPageCount - 1);
  const pagedSessions = activityLogs.slice(safeSessionPage * SESSION_PAGE_SIZE, (safeSessionPage + 1) * SESSION_PAGE_SIZE);

  useEffect(() => { setSessionPage(0); }, [actionFilter, debouncedSessionSearch, selectedDate]);

  if (status !== "ready" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#7b6655]">Préparation du journal…</p>
      </div>
    );
  }

  const todayLabel = toDateInputValue();
  const yesterdayLabel = toDateInputValue(new Date(Date.now() - 86400000));

  return (
    <DashboardShell user={user} title="Journal d'activité" subtitle="Traçabilité complète — lecture seule.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Événements total" value={loading ? "—" : summary.totalEvents} sub="sur tous les tickets" accent="#b87731" icon="📋" />
          <KpiCard label="Tickets concernés" value={loading ? "—" : summary.ticketsTracked} sub="avec historique" accent="#2563eb" icon="🎫" />
          <KpiCard label="Activité aujourd'hui" value={loading ? "—" : summary.todayEvents} sub="événements du jour" accent="#16a34a" icon="⚡" />
          <KpiCard label="Commentaires" value={loading ? "—" : summary.todayComments} sub="ajoutés aujourd'hui" accent="#7c3aed" icon="💬" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
          <div className="space-y-4 rounded-[24px] border border-[#eee3d6] bg-[#fffaf5] p-5 shadow-[0_18px_40px_rgba(43,29,16,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#b87731]">Timeline tickets</p>
                <p className="mt-0.5 text-[13px] text-[#7b6655]">
                  {loading ? "Chargement…" : `${filteredEvents.length} événement(s)`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-[12px] border border-[#eee3d6] bg-white p-1">
                {[{ key: todayLabel, label: "Aujourd'hui" }, { key: yesterdayLabel, label: "Hier" }].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setSelectedDate(key)}
                    className={`rounded-[9px] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${selectedDate === key ? "bg-[#fdbf12] text-[#352300]" : "text-[#7b6655] hover:bg-[#f7f0e6]"}`}>
                    {label}
                  </button>
                ))}
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 rounded-[9px] border border-[#eee3d6] bg-[#fffaf5] px-2 text-[11px] text-[#2b1d10] outline-none focus:border-[#d5a15c]" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-[10px] border border-[#eee3d6] bg-white p-1">
                {FILTER_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => setSelectedType(opt)}
                    className={`rounded-[8px] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${selectedType === opt ? "bg-[#2b1d10] text-white" : "text-[#7b6655] hover:bg-[#f7f0e6]"}`}>
                    {opt === "TOUS" ? "Tous" : opt === "CREATE" ? "✦ Créé" : opt === "STATUS_CHANGE" ? "⟳ Statut" : "💬 Commentaire"}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b89070] text-[12px]">🔍</span>
                <input value={timelineSearch} onChange={(e) => setTimelineSearch(e.target.value)}
                  placeholder="Ticket, acteur, catégorie…"
                  className="h-9 w-full rounded-[10px] border border-[#eee3d6] bg-white pl-8 pr-3 text-[12px] text-[#2b1d10] outline-none placeholder:text-[#b89070] focus:border-[#d5a15c]" />
              </div>
            </div>

            {loading ? (
              <div className="rounded-[16px] border border-dashed border-[#eee3d6] py-12 text-center text-[13px] text-[#b89070]">Chargement du journal…</div>
            ) : filteredEvents.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[#eee3d6] py-12 text-center">
                <p className="text-[28px]">🗂️</p>
                <p className="mt-2 text-[13px] font-semibold text-[#7b6655]">Aucun événement</p>
                <p className="text-[12px] text-[#b89070]">Essayez une autre date ou un autre filtre.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedEvents.map(([date, entries]) => (
                  <div key={date}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-[#eee3d6]" />
                      <span className="rounded-full border border-[#eee3d6] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b7765]">
                        {formatDateLabel(date)}
                      </span>
                      <div className="h-px flex-1 bg-[#eee3d6]" />
                    </div>
                    <div className="space-y-2">
                      {entries.map((entry) => <EventRow key={`${entry.ticketId}-${entry.id}`} entry={entry} />)}
                    </div>
                  </div>
                ))}
                {pageCount > 1 && (
                  <div className="flex items-center justify-between rounded-[14px] border border-[#eee3d6] bg-white px-4 py-3">
                    <p className="text-[11px] text-[#8b7765]">Page {safePage + 1} / {pageCount} · {filteredEvents.length} événements</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setActivityPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
                        className="rounded-[8px] border border-[#eee3d6] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#2b1d10] transition hover:bg-[#faf6f1] disabled:opacity-40">
                        ← Précédent
                      </button>
                      <button type="button" onClick={() => setActivityPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}
                        className="rounded-[8px] border border-[#eee3d6] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#2b1d10] transition hover:bg-[#faf6f1] disabled:opacity-40">
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-[#eee3d6] bg-white px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Connexions</p>
                <p className="mt-2 text-[22px] font-[800] text-[#16a34a]">
                  {logsLoading ? "—" : activityLogs.filter((l) => l.action === "auth.login").length}
                </p>
              </div>
              <div className="rounded-[16px] border border-[#eee3d6] bg-white px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Déconnexions</p>
                <p className="mt-2 text-[22px] font-[800] text-[#c2410c]">
                  {logsLoading ? "—" : activityLogs.filter((l) => l.action === "auth.logout").length}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#eee3d6] bg-[#fffaf5] p-4 shadow-[0_10px_30px_rgba(43,29,16,0.05)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b87731]">Sessions</p>
                <span className="rounded-full border border-[#eee3d6] bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#7b6655]">
                  {activityLogs.length} entrée(s)
                </span>
              </div>
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-1 rounded-[10px] border border-[#eee3d6] bg-white p-1">
                  {(["ALL", "LOGIN", "LOGOUT"] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setActionFilter(f)}
                      className={`flex-1 rounded-[8px] py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${actionFilter === f ? "bg-[#2b1d10] text-white" : "text-[#7b6655] hover:bg-[#f7f0e6]"}`}>
                      {f === "ALL" ? "Tous" : f === "LOGIN" ? "🔐 Connexion" : "🚪 Déco."}
                    </button>
                  ))}
                </div>
                <input value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="h-8 w-full rounded-[10px] border border-[#eee3d6] bg-white px-3 text-[11px] text-[#2b1d10] outline-none placeholder:text-[#b89070] focus:border-[#d5a15c]" />
              </div>
              {logsLoading ? (
                <div className="py-8 text-center text-[12px] text-[#b89070]">Chargement…</div>
              ) : logsError ? (
                <div className="rounded-[12px] border border-[#f0c2bb] bg-[#fff3f2] px-3 py-3 text-[12px] text-[#b42318]">{logsError}</div>
              ) : activityLogs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[22px]">🔒</p>
                  <p className="mt-1 text-[12px] text-[#7b6655]">Aucune session enregistrée.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pagedSessions.map((log) => <SessionRow key={log.id} log={log} />)}
                  {sessionPageCount > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] text-[#8b7765]">{safeSessionPage + 1} / {sessionPageCount}</p>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setSessionPage((p) => Math.max(0, p - 1))} disabled={safeSessionPage === 0}
                          className="rounded-[8px] border border-[#eee3d6] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#2b1d10] disabled:opacity-40">←</button>
                        <button type="button" onClick={() => setSessionPage((p) => Math.min(sessionPageCount - 1, p + 1))} disabled={safeSessionPage >= sessionPageCount - 1}
                          className="rounded-[8px] border border-[#eee3d6] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#2b1d10] disabled:opacity-40">→</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-[18px] border border-[#f1e5d7] bg-[#fffaf5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b87731]">Légende</p>
              <div className="mt-3 space-y-2">
                {(Object.entries(EVENT_CFG) as [JournalEventType, typeof EVENT_CFG[JournalEventType]][]).map(([type, cfg]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] text-white font-bold ${cfg.dotCls}`}>{cfg.icon}</span>
                    <span className="text-[11px] text-[#5f4d3f]">{cfg.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[9px]">🔐</span>
                  <span className="text-[11px] text-[#5f4d3f]">Connexion</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[9px]">🚪</span>
                  <span className="text-[11px] text-[#5f4d3f]">Déconnexion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
