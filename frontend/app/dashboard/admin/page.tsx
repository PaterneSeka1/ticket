"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/DashboardShell";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { getRedirectRouteForRole } from "../lib/api";

const metrics = [
  { label: "Total tickets", value: "6", detail: "2 aujourd’hui", tone: "text-[#1c1c1c]" },
  { label: "P1 critiques", value: "1", detail: "1 non ouverts", tone: "text-[#c42d1f]" },
  { label: "En cours", value: "4", detail: "SLA moyen P2 : 2h", tone: "text-[#1f6f3a]" },
  { label: "Résolus / fermés", value: "2", detail: "Taux : 33%", tone: "text-[#117259]" },
];

const tickets = [
  {
    id: "#TK-001",
    titre: "Inaccessibilité à une plateforme métier",
    prio: "P1",
    sla: "2h 38m",
    status: "Reçu",
    assigne: "DSI",
    badge: "bg-[#c42d1f]/20 text-[#c42d1f]",
    slaProgress: 92,
  },
  {
    id: "#TK-002",
    titre: "SOTRA — Retard de réception",
    prio: "P2",
    sla: "58m",
    status: "En cours de résolution",
    assigne: "Relation Clientèle",
    badge: "bg-[#f2a90f]/20 text-[#f2a90f]",
    slaProgress: 60,
  },
  {
    id: "#TK-003",
    titre: "Plateforme — Bugs / lenteurs",
    prio: "P2",
    sla: "1h 50m",
    status: "Ouvert",
    assigne: "DSI",
    badge: "bg-[#1f6f3a]/20 text-[#1f6f3a]",
    slaProgress: 45,
  },
  {
    id: "#TK-004",
    titre: "Dysfonctionnement d'un portail externe",
    prio: "P2",
    sla: "1h 12m",
    status: "Pris en charge",
    assigne: "Boldcode",
    badge: "bg-[#117259]/20 text-[#117259]",
    slaProgress: 25,
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de votre espace administrateur…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Tableau de bord Administrateur"
      subtitle={`Vue d'ensemble — ${new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-[20px] border border-[#f0d7c6] bg-white p-5 shadow-[0_16px_50px_rgba(0,0,0,0.08)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112]">{metric.label}</p>
              <p className={`text-4xl font-bold ${metric.tone}`}>{metric.value}</p>
              <p className="text-xs text-[#6b5446]">{metric.detail}</p>
            </article>
          ))}
        </div>

        <div className="rounded-[20px] border border-[#f0d7c6] bg-[#fff4c8] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.05)]">
          <p className="text-sm font-semibold text-[#c4620c]">Escalade automatique — 1 ticket(s) non ouvert(s) depuis +1h</p>
          <p className="text-xs text-[#6b5446]">Tickets concernés : #TK-001. Notifications envoyées automatiquement.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="rounded-full bg-[#1f851f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white">
              Renvoyer WhatsApp
            </button>
            <button className="rounded-full border border-[#2b1d10] bg-[#1b1b1b]/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2b1d10]">
              Renvoyer Email
            </button>
          </div>
        </div>

        <section className="rounded-[20px] border border-[#f0d7c6] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.05)]">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b86112]">Tickets actifs — SLA</p>
              <p className="text-sm text-[#6b5446]">4 ticket(s)</p>
            </div>
            <button className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f6a500]">Voir</button>
          </header>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.35em] text-[#8a7c6c]">
                <tr>
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Titre</th>
                  <th className="pb-3">Prio</th>
                  <th className="pb-3">SLA</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Assigné</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs text-[#2b1d10]">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-[#f3ece2]">
                    <td className="py-4 font-semibold text-[#2b1d10]">{ticket.id}</td>
                    <td className="py-4">{ticket.titre}</td>
                    <td className="py-4">
                      <span className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${ticket.badge}`}>
                        {ticket.prio}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-[#e0d6cd]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#c42d1f] to-[#f29f6a]"
                            style={{ width: `${ticket.slaProgress}%` }}
                          />
                        </div>
                        <span className="text-[0.7rem] text-[#6b5446]">{ticket.sla}</span>
                      </div>
                    </td>
                    <td className="py-4 text-[0.8rem] text-[#6b5446]">{ticket.status}</td>
                    <td className="py-4">{ticket.assigne}</td>
                    <td className="py-4 text-right">
                      <button className="rounded-full bg-[#fcb712] px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#2b1d10] shadow-[0_10px_30px_rgba(252,183,18,0.35)]">
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[20px] border border-[#f0d7c6] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.05)]">
            <header className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b86112]">Tickets par statut</p>
              <p className="text-xs text-[#6b5446]">Répartition</p>
            </header>
            <div className="flex items-center justify-center">
              <div className="relative h-36 w-36">
                <div className="absolute inset-0 rounded-full border-4 border-[#e5e5e5]"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#c42d1f] border-r-[#f2a90f] border-b-[#1f6f3a] border-l-[#504c5a]"></div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-[#c42d1f]"></span>P1 Critique
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-[#f2a90f]"></span>P2 Majeur
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-[#1f6f3a]"></span>P3 Mineur
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-[#504c5a]"></span>Résolu
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#f0d7c6] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.05)]">
            <header className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#b86112]">Tickets par priorité</p>
              <p className="text-xs text-[#6b5446]">Derniers 7 jours</p>
            </header>
            <div className="space-y-6">
              {[
                { label: "P1 Critique", value: 2, color: "#d63b35" },
                { label: "P2 Majeur", value: 3, color: "#f2a90f" },
                { label: "P3 Mineur", value: 1, color: "#1f6f3a" },
              ].map((serie) => (
                <div key={serie.label} className="flex items-center gap-3">
                  <div className="h-24 w-full rounded-[16px] bg-[#f4f2ef]">
                    <div
                      className="h-full rounded-[16px]"
                      style={{
                        width: `${serie.value * 20}%`,
                        backgroundColor: serie.color,
                        boxShadow: `0 10px 35px ${serie.color}80`,
                      }}
                    />
                  </div>
                  <div className="w-28 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-[#6b5446]">{serie.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
