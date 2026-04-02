"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchActivityLogs } from "@/api/activity";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useTickets } from "@/app/dashboard/hooks/useTickets";
import type { ActivityLogEntry, TicketTimeline } from "@/api/types";

const filterOptions = ["TOUS", "CREATE", "RECEIVE", "STATUS_CHANGE", "ACTION"] as const;
const typeLabels: Record<TicketTimeline["type"], string> = {
  CREATE: "Créé",
  RECEIVE: "Reçu",
  STATUS_CHANGE: "Changement de statut",
  ACTION: "Action",
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

type JournalEntry = TicketTimeline & {
  ticketId: string;
  ticketCode: string;
  ticketCategory: string;
};

export default function SuperAdminJournalPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const { tickets, loading } = useTickets(status === "ready");
  const [selectedType, setSelectedType] = useState<(typeof filterOptions)[number]>("TOUS");
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<"ALL" | "LOGIN" | "LOGOUT">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const loginLogs = useMemo(
    () => activityLogs.filter((log) => log.action === "auth.login"),
    [activityLogs],
  );
  const logoutLogs = useMemo(
    () => activityLogs.filter((log) => log.action === "auth.logout"),
    [activityLogs],
  );

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

  const timelineEvents = useMemo(() => {
    const entries: JournalEntry[] = [];
    tickets.forEach((ticket) => {
      ticket.timeline.forEach((event) => {
        entries.push({
          ...event,
          ticketId: ticket.id,
          ticketCode: ticket.code,
          ticketCategory: ticket.category.libelle,
        });
      });
    });
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tickets]);

  const filteredEvents = useMemo(() => {
    if (selectedType === "TOUS") return timelineEvents;
    return timelineEvents.filter((event) => event.type === selectedType);
  }, [selectedType, timelineEvents]);

  const displayedEvents = useMemo(() => filteredEvents.slice(0, 30), [filteredEvents]);

  const summary = useMemo(() => {
    const ticketIds = new Set(timelineEvents.map((entry) => entry.ticketId));
    return {
      totalEvents: timelineEvents.length,
      ticketsTracked: ticketIds.size,
    };
  }, [timelineEvents]);

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
          limit: 30,
          action: actionParam,
          search: debouncedSearchTerm || undefined,
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
  }, [status, user, actionFilter, debouncedSearchTerm]);

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Connexions & déconnexions</p>
              <p className="text-sm text-[#2b1d10]">
                {logsLoading
                  ? "Chargement…"
                  : logsError ?? `${activityLogs.length} événement(s) enregistré(s)`}
              </p>
            </div>
            <span className="rounded-full border border-[#f1ede8] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#8a8176]">
              Dernières 30 entrées
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-col text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
              Rechercher
              <input
                type="text"
                placeholder="Nom, email ou détail"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="mt-2 w-full min-w-[200px] rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
              />
            </label>
            <label className="flex flex-col text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
              Filtrer
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value as "ALL" | "LOGIN" | "LOGOUT")}
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
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8a8176]">Connexions récentes</p>
                  <span className="text-[0.65rem] text-[#4c4945]">
                    {loginLogs.length} entrée(s)
                  </span>
                </div>
                {loginLogs.length ? (
                  <div className="space-y-3">
                    {loginLogs.map((log) => (
                      <article
                        key={log.id}
                        className="rounded-[16px] border border-[#f1ede8] bg-[#fffdfa] px-4 py-3 shadow-[0_6px_16px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#8a8176]">
                            {formatDateTime(log.createdAt)}
                          </span>
                          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[#2b1d10]">
                            {log.actorName ?? "Utilisateur inconnu"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#4c4945]">{log.details ?? "Connexion enregistrée"}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-5 text-center text-xs text-[#7b6c5c]">
                    Aucune connexion récente.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8a8176]">Déconnexions récentes</p>
                  <span className="text-[0.65rem] text-[#4c4945]">
                    {logoutLogs.length} entrée(s)
                  </span>
                </div>
                {logoutLogs.length ? (
                  <div className="space-y-3">
                    {logoutLogs.map((log) => (
                      <article
                        key={log.id}
                        className="rounded-[16px] border border-[#f1ede8] bg-[#fffdfa] px-4 py-3 shadow-[0_6px_16px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#8a8176]">
                            {formatDateTime(log.createdAt)}
                          </span>
                          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[#2b1d10]">
                            {log.actorName ?? "Utilisateur inconnu"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[#4c4945]">{log.details ?? "Déconnexion enregistrée"}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-5 text-center text-xs text-[#7b6c5c]">
                    Aucune déconnexion récente.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-[24px] border border-[#e7e3db] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Activité récente</p>
              <p className="text-sm text-[#2b1d10]">
                {loading
                  ? "Chargement…"
                  : `${filteredEvents.length} événement(s) listé(s) (${selectedType === "TOUS" ? "tous types" : typeLabels[selectedType]})`}
              </p>
            </div>
            <label className="flex flex-col gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-[#7b6c5c]">
              Type d’événement
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value as (typeof filterOptions)[number])}
                className="rounded-[10px] border border-[#d6d2c8] bg-[#fffdf9] px-3 py-2 text-sm font-semibold text-[#2b1d10] outline-none"
              >
                {filterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "TOUS" ? "Tous" : typeLabels[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-10 text-center text-sm text-[#7b6c5c]">
              Chargement du journal…
            </div>
          ) : displayedEvents.length ? (
            <div className="space-y-4">
              {displayedEvents.map((entry) => (
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
                  <div className="mt-2 flex flex-wrap gap-2 text-[0.7rem] text-[#4c4945]">
                    <span className="rounded-full border border-[#ece6dd] px-2 py-1">Ticket {entry.ticketCode}</span>
                    <span className="rounded-full border border-[#ece6dd] px-2 py-1">Catégorie {entry.ticketCategory}</span>
                    <span className="rounded-full border border-[#ece6dd] px-2 py-1">Par {entry.actorName}</span>
                  </div>
                </article>
              ))}
              {filteredEvents.length > displayedEvents.length && (
                <p className="text-xs text-[#7a6c5c]">
                  Affiche {displayedEvents.length} des {filteredEvents.length} événements récents.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[#e7e3db] px-4 py-10 text-center text-sm text-[#7b6c5c]">
              Aucune action disponible pour ce filtre.
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
