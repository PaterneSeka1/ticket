"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/DashboardShell";
import { getRedirectRouteForRole } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { AdminDashboardContent } from "../admin/page";

export default function ReaderDashboardPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "READER") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation du tableau de bord…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell user={user} title="Tableau de bord" subtitle="Aperçu global — lecture seule">
      <AdminDashboardContent />
    </DashboardShell>
  );
}
