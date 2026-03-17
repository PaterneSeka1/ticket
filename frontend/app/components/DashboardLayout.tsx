"use client";

import { ReactNode, useMemo } from "react";
import { Activity, BarChart2, Bell, Layers, List, PlusCircle, Settings, Users } from "lucide-react";
import Link from "next/link";
import { logout } from "@/api/auth";
import { formatFullName } from "@/app/dashboard/lib/api";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";

const navSections = [
  {
    heading: "Principal",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: <Activity className="h-4 w-4" /> },
      { label: "Gestion tickets", href: "/dashboard", icon: <Layers className="h-4 w-4" /> },
      { label: "Nouveau ticket", href: "/dashboard", icon: <PlusCircle className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Administration",
    items: [
      { label: "Utilisateurs", href: "/dashboard/admin", icon: <Users className="h-4 w-4" /> },
      { label: "Configuration", href: "/dashboard/admin", icon: <Settings className="h-4 w-4" /> },
      { label: "Journal d'activité", href: "/dashboard/admin", icon: <List className="h-4 w-4" /> },
    ],
  },
  {
    heading: "Analyse",
    items: [{ label: "Rapports", href: "/dashboard/super-admin", icon: <BarChart2 className="h-4 w-4" /> }],
  },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();

  const formattedName = useMemo(() => {
    if (!user) return "Utilisateur";
    return formatFullName(user);
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return "VE";
    const parts = [user.prenom, user.nom].filter(Boolean);
    return (
      parts
        .map((part) => part?.[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "VE"
    );
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore errors, we still clear storage
    } finally {
      sessionStorage.removeItem("vdm_access_token");
      localStorage.removeItem("employee");
      window.location.href = "/login";
    }
  };

  const navContent = (
    <nav className="space-y-6">
      {navSections.map((section) => (
        <div key={section.heading} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b86112]">{section.heading}</p>
          <div className="flex flex-col gap-2">
          {section.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-[14px] px-3 py-2 text-sm font-semibold text-[#2b1d10] transition hover:bg-white hover:text-[#c45c08]"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-[#fff1e6] to-[#f2e1d0] text-[#2b1d10]">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/30 bg-gradient-to-r from-[#f3921a] to-[#d0670d] px-4 py-3 shadow-lg shadow-[#d0670d]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span className="text-sm font-semibold uppercase tracking-[0.35em] text-white">Ticketing Vedem v1.02</span>
          </div>
          <p className="text-[0.6rem] uppercase tracking-[0.5em] text-white/90">Plateforme ticketing</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="hidden lg:inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/30"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </button>
          <div className="hidden md:flex items-center gap-3 rounded-full bg-white/20 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#c4620c] font-semibold">
              {initials}
            </span>
            <span className="text-[0.7rem] font-semibold tracking-[0.2em]">{formattedName}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-white/70 bg-white/20 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-white/30"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="flex">
        <aside className="w-80 shrink-0 flex-col border-r border-[#e1c2a1] bg-gradient-to-b from-[#f4dfcd] via-[#efd2c0] to-[#e3c6b6] px-6 py-8 text-[#2b1d10] h-screen">
          <div className="flex items-center justify-between gap-3 pb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#de6f0c] to-[#c45c08] p-2 shadow-[0_12px_25px_rgba(0,0,0,0.3)]">
                <span className="text-lg font-semibold text-white">V</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[#b86112]">Ticketing Vedem</p>
                <p className="text-sm font-semibold text-[#2b1d10]">v1.02</p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">{navContent}</div>
          <div className="mt-6 border-t border-white/10 pt-6 text-[0.65rem] uppercase tracking-[0.3em] text-[#4f5660]">
            Ticketing Vedem v1.02 · © 2025
          </div>
        </aside>
        <main className="flex-1 px-4 py-8 lg:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
