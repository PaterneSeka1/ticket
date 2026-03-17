"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/DashboardShell";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { getRedirectRouteForRole } from "../lib/api";

const cards = [
  {
    title: "Piloter vos équipes",
    description:
      "Visualisez les tickets par direction et repérez immédiatement les incidents bloquants.",
    action: "Voir les équipes",
  },
  {
    title: "Actions rapides",
    description:
      "Créez un ticket, assignez un responsable ou partagez un statut en quelques clics.",
    action: "Créer un ticket",
  },
  {
    title: "Suivi des KPI",
    description:
      "Gardez un œil sur les délais moyens de traitement et les tickets en retard.",
    action: "Consulter les KPIs",
  },
  {
    title: "Communications",
    description:
      "Diffuser une annonce ou relancer vos collaborateurs sans quitter le tableau de bord.",
    action: "Envoyer une mise à jour",
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
      subtitle="Gérez les équipes, arbitrez les priorités et gardez la main sur chaque ticket."
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
