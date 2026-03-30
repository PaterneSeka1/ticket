"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";

const slaRows = [
  { priority: "P1", prise: "30 min", resolution: "4h" },
  { priority: "P2", prise: "2h", resolution: "8h" },
  { priority: "P3", prise: "24h", resolution: "72h" },
];

const alertRows = [
  {
    key: "autoRule",
    label: "Règle automatique",
    description: "Toutes les 10mn → alerte dashboard. Après 2h → Email + WhatsApp aux responsables.",
    enabled: true,
    highlighted: true,
  },
  { key: "notif", label: "Notif. toutes les 10mn (non ouvert)", enabled: true },
  { key: "email", label: "Email escalade après 2h", enabled: true },
  { key: "whatsapp", label: "WhatsApp escalade après 2h", enabled: true },
  { key: "weeklyReport", label: "Rapport hebdo auto (lundi 08h)", enabled: false },
];

const services = ["DSI", "Boldcode", "Direction Opérations", "Relation Clientèle", "Autres"];

const workflowStatuses = [
  { status: "recu", label: "Reçu" },
  { status: "ouvert", label: "Ouvert" },
  { status: "nonouvert", label: "Non ouvert" },
  { status: "pris", label: "Pris en charge" },
  { status: "encours", label: "En cours de résolution" },
  { status: "resolu", label: "Résolu" },
  { status: "ajourne", label: "Ajourné" },
  { status: "ferme", label: "Fermé" },
  { status: "abandonne", label: "Abandonné" },
];

export default function AdminConfigurationPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const [alerts, setAlerts] = useState(() =>
    Object.fromEntries(alertRows.map((row) => [row.key, row.enabled])),
  );

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  const toggleAlert = (key: string) => {
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const summary = useMemo(
    () => ({
      servicesCount: services.length,
      statusesCount: workflowStatuses.length,
    }),
    [],
  );

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de la configuration…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} title="Configuration" subtitle="SLA, alertes, services et workflow">
      <div className="space-y-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="rounded-[24px] border border-[#e5e1dc] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">SLA par priorité</p>
              <p className="text-sm text-[#2b1d10]">Ajustez les engagements de prise en charge et de résolution.</p>
            </div>
            <div className="mt-6 overflow-hidden rounded-[20px] border border-[#ebe6df] bg-[#f3f3f2]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#9a928a]">
                <span>Priorité</span>
                <span>Prise en charge</span>
                <span>Résolution</span>
              </div>
              <div className="space-y-4 px-6 py-4">
                {slaRows.map((row) => (
                  <div
                    key={row.priority}
                    className="flex items-center justify-between gap-6 rounded-[14px] bg-white px-4 py-3 text-sm text-[#2b1d10] shadow-[0_6px_20px_rgba(15,20,10,0.08)]"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <span
                        className={`inline-flex h-8 w-16 items-center justify-center rounded-full text-[0.7rem] font-bold uppercase ${
                          row.priority === "P1"
                            ? "bg-[#fde8e5] text-[#d73b2f]"
                            : row.priority === "P2"
                            ? "bg-[#fffad8] text-[#d69007]"
                            : "bg-[#e6f5ec] text-[#2f8f58]"
                        }`}
                      >
                        {row.priority}
                      </span>
                    </div>
                    <span className="w-32 text-center font-semibold text-[#f73b35]" role="status">
                      {row.prise}
                    </span>
                    <span className="w-32 text-center font-semibold text-[#434343]">{row.resolution}</span>
                    <button className="rounded-full border border-[#dcd5ce] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#4b3e32] transition hover:border-[#f0a31c] hover:text-[#f0a31c]">
                      Modifier
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e5e1dc] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">Alertes & Escalades</p>
              <p className="text-sm text-[#2b1d10]">Paramétrez les relances automatiques et notifications.</p>
            </div>
            <div className="mt-6 space-y-4">
              {alertRows.map((row) => (
                <div
                  key={row.key}
                  className={`rounded-[20px] border px-4 py-3 shadow-sm transition ${
                    row.highlighted
                      ? "border-[#f4d58d] bg-[#fff6df]"
                      : "border-[#e4e1d8] bg-[#fdfdfd]"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#2b1d10]">{row.label}</p>
                      {!row.highlighted && (
                        <button
                          type="button"
                          onClick={() => toggleAlert(row.key)}
                          className={`h-6 w-12 rounded-full border transition ${
                            alerts[row.key]
                              ? "border-[#f0b429] bg-[#f9c846]"
                              : "border-[#c6c0b6] bg-white"
                          }`}
                          aria-pressed={alerts[row.key]}
                        >
                          <span
                            className={`block h-full w-5 rounded-full bg-white transition ${
                              alerts[row.key] ? "translate-x-[1.5rem]" : "translate-x-[0.25rem]"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    {row.description && (
                      <p className="text-xs text-[#6e6559]">{row.description}</p>
                    )}
                  </div>
                  {row.highlighted && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-[#8c7b60]">
                        Automatique
                      </span>
                      <div className="flex items-center gap-2">
                        {["Notif", "Email", "WhatsApp"].map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-[#f1c676] px-2 py-0.5 text-[0.6rem] font-semibold text-[#b46205]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[24px] border border-[#e5e1dc] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">
                  Services assignataires
                </p>
                <p className="text-sm text-[#2b1d10]">{summary.servicesCount} services actifs</p>
              </div>
              <button className="rounded-full bg-[#f0c34c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2b1d10] shadow-[0_10px_20px_rgba(240,195,76,0.45)]">
                + Ajouter
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {services.map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[18px] border border-[#e7e3db] bg-[#fdfbf6] px-4 py-3 text-sm text-[#2b1d10]"
                >
                  <span>{label}</span>
                  <div className="flex items-center gap-2">
                    <button className="rounded-full border border-[#d6cfc5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#4b3e32]">
                      Éditer
                    </button>
                    <button className="rounded-full border border-[#d6cfc5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#4b3e32]">
                      Suppr.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e5e1dc] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">Statuts du workflow</p>
              <p className="text-sm text-[#2b1d10]">
                {summary.statusesCount} statuts suivis par le workflow.
              </p>
            </div>
            <div className="mt-5 overflow-hidden rounded-[20px] border border-[#ebe6df] bg-[#f7f7f5]">
              <div className="grid grid-cols-[1fr_1fr] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#a79f92]">
                <span>Statut</span>
                <span>Label</span>
              </div>
              <div className="space-y-2 px-6 py-4">
                {workflowStatuses.map((row) => (
                  <div
                    key={row.status}
                    className="flex items-center justify-between rounded-[16px] bg-white px-4 py-2 text-sm text-[#2b1d10] shadow-[0_3px_12px_rgba(19,19,19,0.05)]"
                  >
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                      {row.status}
                    </span>
                    <span className="text-[0.9rem] font-semibold text-[#1b1b1b]">{row.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
