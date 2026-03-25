"use client";

import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useEffect } from "react";

export default function SuperAdminMesTicketsPage() {
  const { user, status } = useCurrentUser();
  const router = useRouter();

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
          <p className="text-sm text-[var(--vdm-muted)]">Chargement de vos tickets…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Mes tickets"
      subtitle="Suivez vos demandes critiques et vos assignations"
    >
      <p className="text-sm text-[#6b5446]">
        Cette page sera bientôt connectée aux données personnelles de chaque responsable.
      </p>
    </DashboardShell>
  );
}
