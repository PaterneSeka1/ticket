"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRedirectRouteForRole } from "./lib/api";
import { useCurrentUser } from "./hooks/useCurrentUser";

export default function DashboardHomePage() {
  const { user, status } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    const route = getRedirectRouteForRole(user.role);
    router.replace(route);
  }, [status, user, router]);

  return (
    <div className="vdm-landing flex min-h-screen flex-col items-center justify-center px-4 text-[var(--vdm-dark)]">
      <div className="vdm-card w-full max-w-md space-y-6 rounded-[32px] p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--vdm-primary)]">
          Ticketing Vedem
        </p>
        <h1 className="text-3xl font-semibold">Chargement de votre espace</h1>
        <p className="text-sm text-[var(--vdm-muted)]">
          Nous redirigeons automatiquement vers le tableau de bord adapté à votre rôle.
        </p>
        <div className="text-[var(--vdm-muted-strong)]">
          {status === "loading" && "Connexion sécurisée en cours…"}
          {status === "error" && "Impossible de récupérer votre session."}
        </div>
      </div>
    </div>
  );
}
