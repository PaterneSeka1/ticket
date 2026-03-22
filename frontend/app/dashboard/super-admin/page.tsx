"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/DashboardShell";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { getRedirectRouteForRole } from "../lib/api";

const cards = [
  {
    title: "Vue directionnelle",
    description:
      "Supervisez chaque direction et suivez la progression des tickets sensibles à l’échelle de toute l’entreprise.",
    action: "Consulter les directions",
  },
];

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [status, user, router]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de votre espace Super-Admin…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Tableau de bord Super administrateur"
      subtitle="Orchestrez les accès, les rapports et les alertes critiques sur l’ensemble de la plateforme."
    >
      {cards.map((card) => (
        <article
          key={card.title}
          className="space-y-3 rounded-[24px] border border-[#f3cfa3] bg-white/60 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
        >
          <h2 className="text-lg font-semibold text-[var(--vdm-dark)]">{card.title}</h2>
          <p className="text-sm text-[var(--vdm-muted)]">{card.description}</p>
          <button className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--vdm-primary)]">
            {card.action}
          </button>
        </article>
      ))}
    </DashboardShell>
  );
}
