"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { PageSkeleton } from "../../components/PageSkeleton";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { UserManagementPanel } from "../../components/UserManagementPanel";

export default function ReaderUsersPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "READER") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation des utilisateurs…" />;
  }

  return (
    <DashboardShell
      user={user}
      title="Utilisateurs"
      subtitle="Aperçu global des profils — lecture seule"
    >
      <UserManagementPanel />
    </DashboardShell>
  );
}
