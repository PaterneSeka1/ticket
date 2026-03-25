"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart2,
  Bell,
  Layers,
  List,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Shield,
  Tag,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/api/auth";
import { formatFullName } from "@/app/dashboard/lib/api";
import { UserRole } from "@/app/dashboard/lib/roles";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { usePathname } from "next/navigation";

type NavSection = {
  heading: string;
  items: {
    label: string;
    href: string;
    icon: ReactNode;
  }[];
  roles?: UserRole[];
};

const roleRoutes: Record<UserRole, { tickets: string; newTicket: string; myTickets: string }> = {
  ADMIN: {
    tickets: "/dashboard/admin/tickets",
    newTicket: "/dashboard/admin/nouveau-ticket",
    myTickets: "/dashboard/admin/mes-tickets",
  },
  SUPER_ADMIN: {
    tickets: "/dashboard/super-admin/tickets",
    newTicket: "/dashboard/super-admin/nouveau-ticket",
    myTickets: "/dashboard/super-admin/mes-tickets",
  },
  USER: {
    tickets: "/dashboard/employe/mes-tickets",
    newTicket: "/dashboard/employe/nouveau-ticket",
    myTickets: "/dashboard/employe/mes-tickets",
  },
};

const buildNavSections = (
  routes: { tickets: string; newTicket: string; myTickets: string },
  includeAllTicketsLink: boolean,
) => {
  const principal: NavSection = {
    heading: "Principal",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: <Activity className="h-4 w-4" /> },
      { label: "Nouveau ticket", href: routes.newTicket, icon: <PlusCircle className="h-4 w-4" /> },
      { label: "Mes tickets", href: routes.myTickets, icon: <List className="h-4 w-4" /> },
      includeAllTicketsLink
        ? { label: "Tous les tickets", href: routes.tickets, icon: <Layers className="h-4 w-4" /> }
        : null,
    ].filter(Boolean) as NavSection["items"],
  };

  const administration: NavSection = {
    heading: "Administration",
    roles: ["ADMIN", "SUPER_ADMIN"],
    items: [
      { label: "Utilisateurs", href: "/dashboard/admin/users", icon: <Users className="h-4 w-4" /> },
      { label: "Créer un utilisateur", href: "/dashboard/users/create", icon: <UserPlus className="h-4 w-4" /> },
      { label: "Configuration", href: "/dashboard/admin", icon: <Settings className="h-4 w-4" /> },
      { label: "Journal d'activité", href: "/dashboard/admin", icon: <List className="h-4 w-4" /> },
      { label: "Catégories", href: "/dashboard/admin/categories", icon: <Tag className="h-4 w-4" /> },
    ],
  };

  const superAdminSection: NavSection = {
    heading: "Super-admin",
    roles: ["SUPER_ADMIN"],
    items: [
      { label: "Catégories", href: "/dashboard/super-admin/categories", icon: <Shield className="h-4 w-4" /> },
      { label: "Utilisateurs", href: "/dashboard/super-admin/users", icon: <Users className="h-4 w-4" /> },
      { label: "Créer un utilisateur", href: "/dashboard/users/create", icon: <UserPlus className="h-4 w-4" /> },
    ],
  };

  const analyse: NavSection = {
    heading: "Analyse",
    roles: ["SUPER_ADMIN"],
    items: [{ label: "Rapports", href: "/dashboard/super-admin", icon: <BarChart2 className="h-4 w-4" /> }],
  };

  return { principal, administration, superAdmin: superAdminSection, analyse };
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavMounted, setIsNavMounted] = useState(false);

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

  const currentRole = (user?.role as UserRole) ?? "USER";
  const currentSections = useMemo(() => {
    const includeAllTicketsLink = currentRole !== "USER";
    const sections = buildNavSections(roleRoutes[currentRole], includeAllTicketsLink);
    if (currentRole === "SUPER_ADMIN") {
      return [sections.principal, sections.administration, sections.superAdmin, sections.analyse];
    }
    if (currentRole === "ADMIN") {
      return [sections.principal, sections.administration];
    }
    return [sections.principal];
  }, [currentRole]);

  const visibleNavSections = useMemo(() => {
    if (!user) {
      return currentSections.filter((section) => !section.roles);
    }
    if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return currentSections;
    }
    return currentSections.filter((section) => !section.roles || section.roles.includes(user.role));
  }, [user, currentSections]);

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

  const renderNavContent = (onLinkClick?: () => void) => (
    <nav className="space-y-6">
      {visibleNavSections.map((section) => (
        <div
          key={section.heading}
          className="space-y-3 rounded-[20px] border border-white/20 bg-white/20 px-3 py-3 transition hover:border-white/70"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-600">{section.heading}</p>
          <div className="flex flex-col gap-2">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[14px] py-2 text-sm font-semibold px-3 transition ${
                    isActive ? "bg-[#f0c34c] text-black shadow-[0_10px_30px_rgba(0,0,0,0.08)]" : "text-[#2b1d10]"
                  }`}
                  onClick={() => onLinkClick?.()}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const closeMobileNav = () => setIsNavOpen(false);
  const openMobileNav = () => {
    setIsNavMounted(true);
    setIsNavOpen(true);
  };

  useEffect(() => {
    if (isNavOpen) {
      setIsNavMounted(true);
      return;
    }
    if (!isNavOpen && isNavMounted) {
      const timer = window.setTimeout(() => setIsNavMounted(false), 320);
      return () => clearTimeout(timer);
    }
  }, [isNavMounted, isNavOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-[#fff1e6] to-[#f2e1d0] text-[#2b1d10]">
      <div className="relative">
        <header className="sticky top-0 z-30 border-b-3 border-yellow-400 bg-gray-300/90 px-6 py-1 shadow-[0_10px_35px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Image src="/logo1.png" alt="Logo Ticketing Vedem" width={85} height={80} className="object-contain" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                className="lg:inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-2 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#2b1d10] shadow-[0_10px_25px_rgba(0,0,0,0.15)] transition hover:bg-white hover:cursor-pointer"
              >
                <Bell className="h-4 w-4" />
              </button>
              <div className="hidden lg:flex items-center gap-1 rounded-full bg-white px-2 py-2 text-xs uppercase tracking-[0.02em] text-[#2b1d10] shadow-[0_10px_15px_rgba(0,0,0,0.08)]">
                <span className="text-center flex h-5 w-8 items-center justify-center rounded-full bg-yellow-400 text-black font-semibold">{initials}</span>
                <span className="text-[0.7rem] font-bold tracking-[0.05em] text-[#4a3826]">{formattedName}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden lg:inline-flex items-center justify-center rounded-full border border-[#2b1d10] bg-[#fffdf2] p-2 text-[#2b1d10] transition hover:border-[#f8b24d] hover:bg-yellow-400/60 hover:cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="lg:hidden rounded-full border border-[#cfc8bd] bg-white/90 p-2 text-[#2b1d10] shadow-[0_4px_15px_rgba(0,0,0,0.12)] transition hover:bg-white"
              onClick={isNavOpen ? closeMobileNav : openMobileNav}
              aria-label="Afficher le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>
        {isNavMounted && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
                isNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
              onClick={closeMobileNav}
            />
            <aside
              className={`relative ml-auto flex h-full w-full max-w-xs flex-col gap-6 border-l border-[#e0d3c4] bg-white/95 px-6 py-6 shadow-[0_30px_100px_rgba(0,0,0,0.25)] transition-transform duration-300 ${
                isNavOpen ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <button
                type="button"
                className="self-end rounded-full border border-[#cfc8bd] bg-[#fffdf2] p-2"
                onClick={closeMobileNav}
                aria-label="Fermer le menu"
              >
                <X className="h-4 w-4 text-[#2b1d10]" />
              </button>
              <div className="flex-1 overflow-y-auto pr-1">{renderNavContent(closeMobileNav)}</div>
              <button
                type="button"
                onClick={() => {
                  closeMobileNav();
                  handleLogout();
                }}
                className="flex items-center justify-center rounded-full border border-[#cba87f] bg-[#fffdf2] p-2 text-[#c4620c] transition hover:border-[#f8b24d] hover:bg-[#ffedd6]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </aside>
          </div>
        )}
      </div>

      <div className="flex bg-white/90">
        <aside className="hidden h-screen flex-col border-r-2 border-yellow-400 bg-white px-6 py-6 text-[#2b1d10] lg:flex lg:w-70">
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">{renderNavContent()}</div>
        </aside>
        <main className="flex-1 px-4 py-2 lg:px-2">
          <div className="mx-auto w-full max-w-9xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
