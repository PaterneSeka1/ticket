"use client";

import { useEffect } from "react";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { SlaConfigurationManager } from "@/app/dashboard/components/SlaConfigurationManager";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";

// const alertRows = [
//   {
//     key: "autoRule",
//     label: "Règle automatique",
//     description: "Toutes les 10mn → alerte dashboard. Après 2h → Email + WhatsApp aux responsables.",
//     enabled: true,
//     highlighted: true,
//   },
//   { key: "notif", label: "Notif. toutes les 10mn (non ouvert)", enabled: true },
//   { key: "email", label: "Email escalade après 2h", enabled: true },
//   { key: "whatsapp", label: "WhatsApp escalade après 2h", enabled: true },
//   { key: "weeklyReport", label: "Rapport hebdo auto (lundi 08h)", enabled: false },
// ];

// const services = ["DSI", "Boldcode", "Direction Opérations", "Relation Clientèle", "Autres"];

// const workflowStatuses = [
//   { status: "recu", label: "Reçu" },
//   { status: "ouvert", label: "Ouvert" },
//   { status: "nonouvert", label: "Non ouvert" },
//   { status: "pris", label: "Pris en charge" },
//   { status: "encours", label: "En cours de résolution" },
//   { status: "resolu", label: "Résolu" },
//   { status: "ajourne", label: "Ajourné" },
//   { status: "ferme", label: "Fermé" },
//   { status: "abandonne", label: "Abandonné" },
// ];

export default function SuperAdminConfigurationPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  // const [alerts, setAlerts] = useState(() =>
  //   Object.fromEntries(alertRows.map((row) => [row.key, row.enabled])),
  // );

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
    <DashboardShell user={user} title="Configuration" subtitle="SLA, alertes, services et workflow">
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-1 2xl:grid-cols-1">
          <SlaConfigurationManager />
        </div>
      </div>
    </DashboardShell>
  );
}
