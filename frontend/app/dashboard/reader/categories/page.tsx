"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { PageSkeleton } from "../../components/PageSkeleton";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { CategoryManagementPanel } from "../../components/CategoryManagementPanel";

export default function ReaderCategoriesPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "READER") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation des catégories…" />;
  }

  return (
    <DashboardShell
      user={user}
      title="Catégories"
      subtitle="Aperçu des catégories — lecture seule"
    >
      <CategoryManagementPanel showCreateForm={false} readOnly={true} />
    </DashboardShell>
  );
}
