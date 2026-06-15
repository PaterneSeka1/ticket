"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { CategoryManagementPanel } from "../../components/CategoryManagementPanel";
import { PageSkeleton } from "../../components/PageSkeleton";

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
    return <PageSkeleton message="Préparation de la gestion des catégories…" />;
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
