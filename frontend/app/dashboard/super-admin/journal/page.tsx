"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchActivityLogs } from "@/api/activity";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import { buildTicketJournalEntries, filterJournalEntries, toDateInputValue } from "@/app/dashboard/lib/journal";
import { formatDateTime } from "@/app/dashboard/lib/ticket-formatters";
import type { ActivityLogEntry } from "@/api/types";

const filterOptions = ["TOUS", "CREATE", "STATUS_CHANGE", "COMMENT"] as const;
const typeLabels: Record<(typeof filterOptions)[number], string> = {
  TOUS: "Tous",
  CREATE: "Créé",
  STATUS_CHANGE: "Changement de statut",
  COMMENT: "Commentaire",
};

export default function SuperAdminJournalPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");
  const [selectedType, setSelectedType] = useState<(typeof filterOptions)[number]>("TOUS");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue());
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<"ALL" | "LOGIN" | "LOGOUT">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sessionPage, setSessionPage] = useState(0);
  const [sessionPageSize, setSessionPageSize] = useState(6);
  const sessionLabel = useMemo(() => {
    if (actionFilter === "LOGIN") return "Connexions";
    if (actionFilter === "LOGOUT") return "Déconnexions";
    return "Connexions & déconnexions";
  }, [actionFilter]);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const journalEntries = useMemo(() => {
    const entries = tickets.flatMap((ticket) => buildTicketJournalEntries(ticket));
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tickets]);

  const filteredEvents = useMemo(() => {
    return filterJournalEntries(journalEntries, {
      type: selectedType,
      search: timelineSearch,
      date: selectedDate,
    });
  }, [journalEntries, selectedType, timelineSearch, selectedDate]);

  const summary = useMemo(() => {
    const ticketIds = new Set(journalEntries.map((entry) => entry.ticketId));
    return {
      totalEvents: journalEntries.length,
      ticketsTracked: ticketIds.size,
    };
  }, [journalEntries]);

  const sessionPageCount = useMemo(
    () => Math.max(1, Math.ceil(activityLogs.length / sessionPageSize)),
    [activityLogs.length, sessionPageSize],
  );

  const safeSessionPage = useMemo(
    () => Math.min(sessionPage, sessionPageCount - 1),
    [sessionPage, sessionPageCount],
  );

  const pagedSessionLogs = useMemo(() => {
    const start = safeSessionPage * sessionPageSize;
    return activityLogs.slice(start, start + sessionPageSize);
  }, [activityLogs, safeSessionPage, sessionPageSize]);

  useEffect(() => {
    if (status !== "ready" || user?.role !== "SUPER_ADMIN") return;

    let cancelled = false;
    const loadLogs = async () => {
      setLogsLoading(true);
      try {
        const actionParam =
          actionFilter === "LOGIN"
            ? "auth.login"
            : actionFilter === "LOGOUT"
              ? "auth.logout"
              : undefined;
        const data = await fetchActivityLogs({
          limit: 500,
          action: actionParam,
          search: debouncedSearchTerm || undefined,
          date: selectedDate,
        });
        if (!cancelled) {
          setActivityLogs(data);
          setLogsError(null);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setActivityLogs([]);
          setLogsError("Impossible de récupérer l'historique des connexions.");
        }
      } finally {
        if (!cancelled) {
          setLogsLoading(false);
        }
      }
    };

    void loadLogs();
    return () => {
      cancelled = true;
    };
  }, [status, user, actionFilter, debouncedSearchTerm, selectedDate]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation du journal d’activité…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Journal d’activité"
      subtitle="Suivez les actions sur les tickets en temps réel."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[20px] border border-[#ebe6df] bg-white px-5 py-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8d816d]">Événements suivis</p>
            <p className="mt-4 text-3xl font-bold text-[#2b1d10]">
              {loading ? "—" : summary.totalEvents}
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-[#a0897b]">chronologie globale</p>
          </div>
          <div className="rounded-[20px] border border-[#ebe6df] bg-white px-5 py-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8d816d]">Tickets concernés</p>
            <p className="mt-4 text-3xl font-bold text-[#2b1d10]">
              {loading ? "—" : summary.ticketsTracked}
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-[#a0897b]">utilisés dans la période</p>
          </div>
        </div>

                <section className="space-y-4 rounded-[24px] border border-[#e7e3db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Activité récente</p>
              <p className="text-sm text-[#2b1d10]">
                {loading
                  ? "Chargement…"
                  : `${filteredEvents.length} événement(s) (${selectedType === "TOUS" ? "tous types" : typeLabels[selectedType]}) • ${selectedDate}`}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
                Date
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="min-w-[170px] rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
                Type d’événement
                <select
                  value={selectedType}
                  onChange={(event) => {
                    setSelectedType(event.target.value as (typeof filterOptions)[number]);
                  }}
                  className="rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
                >
                  {filterOptions.map((option) => (
                    <option key={option} value={option}>
                      {typeLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
                Rechercher
                <input
                  value={timelineSearch}
                  onChange={(event) => {
                    setTimelineSearch(event.target.value);
                  }}
                  placeholder="Ticket, acteur, détail..."
                  className="min-w-[220px] rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
                />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-10 text-center text-sm text-[#7b6c5c]">
              Chargement du journal…
            </div>
          ) : filteredEvents.length ? (
            <div className="space-y-4">
              {filteredEvents.map((entry) => (
                <article
                  key={`${entry.ticketId}-${entry.id}`}
                  className="rounded-[18px] border border-[#f1ede8] bg-[#fffdfa] px-4 py-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[#8a8176]">
                      {formatDateTime(entry.createdAt)}
                    </span>
                    <span className="rounded-full border border-[#f0d58d] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#b26a0b]">
                      {typeLabels[entry.type]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#2b1d10]">{entry.label}</p>
                  {entry.details && (
                    <p className="mt-2 text-sm text-[#4c4945] line-clamp-2">{entry.details}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-[#4c4945]">
                    <span className="rounded-full border border-[#ece6dd] px-2 py-1">Ticket {entry.ticketCode}</span>
                    <span className="rounded-full border border-[#ece6dd] px-2 py-1">Catégorie {entry.ticketCategory}</span>
                    <span className="rounded-full border border-[#ece6dd] px-2 py-1">Par {entry.actorName}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-10 text-center text-sm text-[#7b6c5c]">
              Aucune action disponible pour ce filtre.
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-[24px] border border-[#e7e3db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">{sessionLabel}</p>
              <p className="text-sm text-[#2b1d10]">
                {logsLoading
                  ? "Chargement…"
                  : logsError ?? `${activityLogs.length} événement(s) enregistré(s)`}
              </p>
            </div>
            <span className="rounded-full border border-[#f1ede8] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#8a8176]">
              Journée sélectionnée
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-col text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
              Date
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSessionPage(0);
                }}
                className="mt-2 w-full min-w-[170px] rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
              />
            </label>
            <label className="flex flex-col text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
              Rechercher
              <input
                type="text"
                placeholder="Nom, email ou détail"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSessionPage(0);
                }}
                className="mt-2 w-full min-w-[200px] rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
              />
            </label>
            <label className="flex flex-col text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
              Filtrer
              <select
                value={actionFilter}
                onChange={(event) => {
                  setActionFilter(event.target.value as "ALL" | "LOGIN" | "LOGOUT");
                  setSessionPage(0);
                }}
                className="mt-2 min-w-[150px] rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
              >
                <option value="ALL">Tous</option>
                <option value="LOGIN">Connexions</option>
                <option value="LOGOUT">Déconnexions</option>
              </select>
            </label>
          </div>

          {logsLoading ? (
            <div className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-10 text-center text-sm text-[#7b6c5c]">
              Chargement de l’historique des sessions…
            </div>
          ) : logsError ? (
            <div className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-10 text-center text-sm text-[#7b6c5c]">
              {logsError}
            </div>
          ) : (
            <div className="space-y-3">
              {activityLogs.length ? (
                <>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs text-[#7b6c5c]">
                      Page {safeSessionPage + 1} / {sessionPageCount} • {activityLogs.length} événement(s)
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#7b6c5c]">
                        Par page
                        <select
                          value={sessionPageSize}
                          onChange={(event) => {
                            setSessionPageSize(Number(event.target.value));
                            setSessionPage(0);
                          }}
                          className="rounded-[10px] border border-[#dcccbc] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition"
                        >
                          {[3, 6, 12].map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => setSessionPage((current) => Math.max(0, current - 1))}
                        disabled={safeSessionPage === 0}
                        className="rounded-[10px] border border-[#dcccbc] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition disabled:opacity-40"
                      >
                        Précédent
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionPage((current) => Math.min(sessionPageCount - 1, current + 1))}
                        disabled={safeSessionPage >= sessionPageCount - 1}
                        className="rounded-[10px] border border-[#dcccbc] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition disabled:opacity-40"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>

                  {pagedSessionLogs.map((log) => {
                  const isLogin = log.action === "auth.login";
                  const badgeTone = isLogin
                    ? "border-[#cfe9d6] text-[#1f6f3a] bg-[#f3fbf5]"
                    : "border-[#f6d5c1] text-[#c4620c] bg-[#fff7ef]";

                  return (
                    <article
                      key={log.id}
                      className="rounded-[16px] border border-[#f1ede8] bg-[#fffdfa] px-4 py-3 shadow-[0_6px_16px_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#8a8176]">
                          {formatDateTime(log.createdAt)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] ${badgeTone}`}
                          >
                            {isLogin ? "Connexion" : "Déconnexion"}
                          </span>
                          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[#2b1d10]">
                            {log.actorName ?? "Utilisateur inconnu"}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-[#4c4945]">
                        {log.details ?? (isLogin ? "Connexion enregistrée" : "Déconnexion enregistrée")}
                      </p>
                    </article>
                  );
                })}
                </>
              ) : (
                <p className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-5 text-center text-xs text-[#7b6c5c]">
                  Aucun événement pour cette journée.
                </p>
              )}
            </div>
          )}
        </section>


      </div>
    </DashboardShell>
  );
}
