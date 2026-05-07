"use client";

import { useEffect } from "react";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { ProductConfigurationManager } from "@/app/dashboard/components/ProductConfigurationManager";
import { SlaConfigurationManager } from "@/app/dashboard/components/SlaConfigurationManager";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function SuperAdminConfigurationPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

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
    <DashboardShell user={user} title="Configuration" subtitle="SLA, produits, services et workflow">
      <div className="grid gap-6 xl:grid-cols-[260px_1fr] xl:items-start">
        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="rounded-[18px] border border-[#f1e5d7] bg-[#fffaf5] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b87731]">
              Sections
            </p>
            <div className="mt-3 grid gap-2">
              <a
                href="#sla"
                className="rounded-[12px] border border-[#eee3d6] bg-white px-3 py-2 text-[12px] font-semibold text-[#2b1d10] transition hover:bg-[#fcfaf7]"
              >
                SLA par priorité
              </a>
              <a
                href="#produits"
                className="rounded-[12px] border border-[#eee3d6] bg-white px-3 py-2 text-[12px] font-semibold text-[#2b1d10] transition hover:bg-[#fcfaf7]"
              >
                Produits concernés
              </a>
              <a
                href="#assignataires"
                className="rounded-[12px] border border-[#eee3d6] bg-white px-3 py-2 text-[12px] font-semibold text-[#2b1d10] transition hover:bg-[#fcfaf7]"
              >
                Services assignataires
              </a>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#eee3d6] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b6655]">
              Conseils
            </p>
            <ul className="mt-3 space-y-2 text-[12px] text-[#5f4d3f]">
              <li>Gardez P1/P2 stricts pour réduire les escalades.</li>
              <li>Maintenez une liste courte de produits actifs.</li>
              <li>Ajoutez au moins un responsable actif avant d’assigner des tickets.</li>
              <li>Après modification SLA, vérifiez l’impact sur les tickets en cours.</li>
            </ul>
          </div>
        </aside>

        <main className={cn("space-y-6")}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[18px] border border-[#eee3d6] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">
                SLA
              </p>
              <p className="mt-1 text-sm font-semibold text-[#2b1d10]">
                Prise en charge & résolution
              </p>
              <p className="mt-1 text-[12px] text-[#7b6655]">
                Ajustez les délais par priorité.
              </p>
            </div>
            <div className="rounded-[18px] border border-[#eee3d6] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">
                Réclamations
              </p>
              <p className="mt-1 text-sm font-semibold text-[#2b1d10]">Produits concernés</p>
              <p className="mt-1 text-[12px] text-[#7b6655]">
                Centralisez les produits disponibles.
              </p>
            </div>
            <div className="rounded-[18px] border border-[#eee3d6] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">
                Assignation
              </p>
              <p className="mt-1 text-sm font-semibold text-[#2b1d10]">Responsables</p>
              <p className="mt-1 text-[12px] text-[#7b6655]">
                Déclarez qui peut recevoir des tickets.
              </p>
            </div>
            <div className="rounded-[18px] border border-[#f1e5d7] bg-[#fffaf5] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b87731]">
                Workflow
              </p>
              <p className="mt-1 text-sm font-semibold text-[#2b1d10]">Statuts & suivi</p>
              <p className="mt-1 text-[12px] text-[#7b6655]">
                Les transitions sont gérées côté serveur.
              </p>
            </div>
          </div>

          <ProductConfigurationManager />
          <SlaConfigurationManager />
        </main>
      </div>
    </DashboardShell>
  );
}
