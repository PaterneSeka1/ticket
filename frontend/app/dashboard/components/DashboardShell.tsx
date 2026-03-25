"use client";

import type { ReactNode } from "react";
import { formatFullName } from "../lib/api";
import type { AuthenticatedUser } from "../lib/api";

interface DashboardShellProps {
  user: AuthenticatedUser;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardShell({
  user,
  title,
  subtitle,
  children,
  className = "",
}: DashboardShellProps) {
  const sectionClasses = [
    "space-y-6 rounded-[32px] border border-[#f0d7c6] bg-white/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={sectionClasses}>
      <header className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b86112]">Ticketing Vedem</p>
        </div>
        {title && (
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-[#2b1d10]">{title}</h1>
            {subtitle && <p className="text-sm text-[#6b5446]">{subtitle}</p>}
          </div>
        )}
        <p className="text-xs text-[#a87c4a]">Connecté comme {formatFullName(user)}</p>
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
