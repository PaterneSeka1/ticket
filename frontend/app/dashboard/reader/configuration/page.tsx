"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { PageSkeleton } from "../../components/PageSkeleton";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { fetchSlaPolicies, type SlaPolicy } from "@/api/sla";
import { fetchResolutionResponsibles, type ResolutionResponsible } from "@/api/resolution";
import { fetchServices } from "@/api/services";
import type { Service } from "@/api/types";

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "P1 — Critique",
  HIGH: "P2 — Majeur",
  MEDIUM: "P3 — Mineur",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#d63b35",
  HIGH: "#f4a300",
  MEDIUM: "#20b16a",
};

export default function ReaderConfigurationPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  const [slaPolicies, setSlaPolicies] = useState<SlaPolicy[]>([]);
  const [responsibles, setResponsibles] = useState<ResolutionResponsible[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "READER") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  useEffect(() => {
    if (status !== "ready" || user?.role !== "READER") return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [sla, resp, svcs] = await Promise.all([
          fetchSlaPolicies(),
          fetchResolutionResponsibles(),
          fetchServices(),
        ]);
        if (!cancelled) {
          setSlaPolicies(sla);
          setResponsibles(resp);
          setServices(svcs);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [status, user]);

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation de la configuration…" />;
  }

  return (
    <DashboardShell user={user} title="Configuration" subtitle="Aperçu de la configuration système — lecture seule">
      <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
        <span className="text-[13px]">👁️</span>
        <p className="text-[12px] font-medium text-[#92400e]">Mode lecture seule — vous pouvez consulter la configuration mais ne pouvez pas la modifier.</p>
      </div>

      <div className="space-y-6">

        {/* SLA Policies */}
        <section className="rounded-[20px] border border-[#e8e0d4] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
          <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#a89880]">Politiques SLA</p>
          <p className="mb-4 text-sm font-medium text-[#4a3b28]">Délais de résolution par priorité</p>
          {loading ? (
            <p className="text-[13px] text-[#b89070]">Chargement…</p>
          ) : slaPolicies.length === 0 ? (
            <p className="text-[13px] text-[#b89070]">Aucune politique SLA configurée.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {slaPolicies.map((policy) => (
                <div key={policy.priority} className="rounded-[14px] border border-[#e8e0d4] bg-[#faf6f0] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[policy.priority] ?? "#999" }} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a6542]">
                      {PRIORITY_LABELS[policy.priority] ?? policy.priority}
                    </p>
                  </div>
                  <div className="space-y-1 text-[12px] text-[#5a4e40]">
                    <div className="flex items-center justify-between">
                      <span>Délai réponse</span>
                      <span className="font-semibold">{Math.round(policy.responseMinutes / 60)}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Délai résolution</span>
                      <span className="font-semibold">{Math.round(policy.resolutionMinutes / 60)}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Statut</span>
                      <span className={`font-semibold ${policy.isActive ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
                        {policy.isActive ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Resolution Responsibles */}
        <section className="rounded-[20px] border border-[#e8e0d4] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
          <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#a89880]">Responsables de résolution</p>
          <p className="mb-4 text-sm font-medium text-[#4a3b28]">Contacts assignés pour la résolution des tickets</p>
          {loading ? (
            <p className="text-[13px] text-[#b89070]">Chargement…</p>
          ) : responsibles.length === 0 ? (
            <p className="text-[13px] text-[#b89070]">Aucun responsable configuré.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {responsibles.map((r) => (
                <div key={r.id} className="flex items-start gap-3 rounded-[12px] border border-[#f0ece4] bg-[#faf6f0] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0e6d2] text-[12px] font-bold text-[#7a5a30]">
                    {r.firstName?.[0]?.toUpperCase() ?? "R"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#2b1d10]">{r.firstName} {r.lastName}</p>
                    {r.email && <p className="truncate text-[11px] text-[#8a7e6e]">{r.email}</p>}
                    {r.phone && <p className="text-[11px] text-[#8a7e6e]">{r.phone}</p>}
                    {r.role && <p className="text-[11px] text-[#a89880]">{r.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Services */}
        <section className="rounded-[20px] border border-[#e8e0d4] bg-white p-5 shadow-[0_4px_18px_rgba(0,0,0,0.06)]">
          <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#a89880]">Services</p>
          <p className="mb-4 text-sm font-medium text-[#4a3b28]">Services disponibles dans le système</p>
          {loading ? (
            <p className="text-[13px] text-[#b89070]">Chargement…</p>
          ) : services.length === 0 ? (
            <p className="text-[13px] text-[#b89070]">Aucun service configuré.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {services.map((svc) => (
                <span key={svc.id} className="rounded-full border border-[#e8e0d4] bg-[#faf6f0] px-3 py-1.5 text-[12px] font-medium text-[#4a3b28]">
                  {svc.name}
                </span>
              ))}
            </div>
          )}
        </section>

      </div>
    </DashboardShell>
  );
}
