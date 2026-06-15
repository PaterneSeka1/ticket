"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/DashboardShell";
import { getRedirectRouteForRole } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { PageSkeleton } from "../components/PageSkeleton";
import { AdminDashboardContent } from "../admin/page";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation du tableau de bord…" />;
  }

  return (
    <DashboardShell user={user} title="Tableau de bord super-admin" subtitle="Vision globale des tickets">
      <AdminDashboardContent />
    </DashboardShell>
  );
}
