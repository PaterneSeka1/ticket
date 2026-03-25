"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { UserForm } from "@/app/dashboard/components/UserForm";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";

export default function UserCreationPage() {
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
          <p className="text-sm text-[var(--vdm-muted)]">Préparation du formulaire…</p>
        </div>
      </div>
    );
  }

  const listRoute =
    user.role === "SUPER_ADMIN" ? "/dashboard/super-admin/users" : "/dashboard/admin/users";

  return (
    <DashboardShell
      user={user}
      title="Créer un utilisateur"
      subtitle="Ajoutez un collaborateur en définissant ses droits et son profil."
    >
      <div className="space-y-4">
        <UserForm onSuccess={() => router.push(listRoute)} />
        <Link
          href={listRoute}
          className="inline-flex items-center justify-center rounded-full border border-[#c6b6a9] px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#2b1d10]"
        >
          Retour à la liste
        </Link>
      </div>
    </DashboardShell>
  );
}
