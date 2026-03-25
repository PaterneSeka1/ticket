"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { UserManagementPanel } from "../../components/UserManagementPanel";

export default function AdminUsersPage() {
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
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-[#eee7df] bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#7f6d60]">
            Préparation de la gestion des utilisateurs…
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
    >
      <UserManagementPanel />
    </DashboardShell>
  );
}
