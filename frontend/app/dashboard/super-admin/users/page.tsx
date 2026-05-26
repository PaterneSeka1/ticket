"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { UserManagementPanel } from "../../components/UserManagementPanel";
import { UserForm } from "../../components/UserForm";

export default function SuperAdminUsersPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);

  const handleCreateSuccess = useCallback(async () => {
    closeCreateModal();
    setRefreshKey((k) => k + 1);
  }, [closeCreateModal]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de la gestion des utilisateurs…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Gestion des utilisateurs – Super-admin"
      subtitle="Centralisez les profils et les droits du groupe."
    >
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex h-10 items-center rounded-[10px] bg-[#fdbf12] px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#f4b400]"
        >
          + Créer un utilisateur
        </button>
      </div>

      <UserManagementPanel key={refreshKey} />

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <UserForm
              onCancel={closeCreateModal}
              onSuccess={handleCreateSuccess}
            />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
