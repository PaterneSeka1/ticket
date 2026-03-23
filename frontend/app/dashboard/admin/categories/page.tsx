"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { CategoryManagementPanel } from "../../components/CategoryManagementPanel";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de la gestion des catégories…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Créer une catégorie"
      subtitle="Définissez les nouvelles catégories que la DSI peut associer aux tickets."
    >
      <CategoryManagementPanel />
    </DashboardShell>
  );
}
