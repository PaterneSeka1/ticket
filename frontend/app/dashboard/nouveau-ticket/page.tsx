"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { getDashboardRouteForRole } from "@/app/dashboard/lib/roles";

export default function GlobalNewTicketRedirect() {
  const { user, status } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (status !== "ready") return;
    const baseRoute = getDashboardRouteForRole(user?.role);
    router.replace(`${baseRoute}/nouveau-ticket`);
  }, [status, user, router]);

  return (
    <div className="vdm-landing flex min-h-screen flex-col items-center justify-center px-4 text-[var(--vdm-dark)]">
      <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--vdm-primary)]">
          Ticketing Vedem
        </p>
        <h1 className="text-3xl font-semibold">Redirection…</h1>
        <p className="text-sm text-[var(--vdm-muted)]">Chargement de votre formulaire de ticket.</p>
      </div>
    </div>
  );
}
