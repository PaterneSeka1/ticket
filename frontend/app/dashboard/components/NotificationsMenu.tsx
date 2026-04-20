"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useNotifications } from "@/app/dashboard/hooks/useNotifications";
import type { UserNotification } from "@/api/types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsMenu() {
  const router = useRouter();
  const { status, user } = useCurrentUser();
  const isReady = status === "ready";
  const { notifications, unreadCount, loading, refresh, removeNotification, markAllRead } =
    useNotifications(isReady, { limit: 12, pollMs: 15000 });

  const [open, setOpen] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<{
    url: string;
    title: string;
    description: string;
    confirmLabel: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const hasUnread = unreadCount > 0;
  const badgeLabel = useMemo(() => {
    if (!hasUnread) return null;
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [hasUnread, unreadCount]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!pendingRedirect) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!modalRef.current?.contains(target)) {
        setPendingRedirect(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [pendingRedirect]);

  useEffect(() => {
    if (!open && !pendingRedirect) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPendingRedirect(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pendingRedirect]);

  const resolveTicketAssignUrl = (notification: UserNotification) => {
    if (!notification.ticketId) return null;
    const base =
      user?.role === "SUPER_ADMIN" ? "/dashboard/super-admin/tickets" : "/dashboard/admin/tickets";
    const query = new URLSearchParams({
      ticketId: notification.ticketId,
      focus: "assign",
    });
    return `${base}?${query.toString()}`;
  };

  const resolveMyTicketsUrl = () => {
    if (user?.role === "SUPER_ADMIN") return "/dashboard/super-admin/mes-tickets";
    if (user?.role === "ADMIN") return "/dashboard/admin/mes-tickets";
    return "/dashboard/employe/mes-tickets";
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          void refresh();
        }}
        className="relative lg:inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/60 px-2 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#2b1d10] shadow-[0_10px_25px_rgba(0,0,0,0.15)] transition hover:bg-white hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-offset-2"
        aria-label="Afficher les notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-4 w-4" />
        {badgeLabel ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#d63b35] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[360px] max-w-[90vw] overflow-hidden rounded-[18px] border border-[#ead9c9] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#f1e6da] px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8b85]">
                Notifications
              </p>
              <p className="text-[11px] text-[#7d7267]">
                {hasUnread ? `${unreadCount} non lue(s)` : "Aucune non lue"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-2 rounded-full border border-[#ead9c9] bg-[#fffdfb] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition hover:bg-white hover:cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{loading ? "…" : "Actualiser"}</span>
              </button>
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={!hasUnread}
                className="inline-flex items-center gap-2 rounded-full border border-[#ead9c9] bg-[#fffdfb] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition disabled:opacity-40 enabled:hover:bg-white hover:cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Tout lire</span>
              </button>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length ? (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void removeNotification(item.id, !item.isRead);

                    if (item.type !== "TICKET_CREATED") return;
                    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
                    const url = isAdmin ? resolveTicketAssignUrl(item) : resolveMyTicketsUrl();
                    if (!url) return;

                    setOpen(false);
                    setPendingRedirect(
                      isAdmin
                        ? {
                            url,
                            title: "Aller à l’assignation ?",
                            description:
                              "Ce ticket vient d’être créé. Voulez-vous ouvrir la page pour l’assigner maintenant ?",
                            confirmLabel: "Ouvrir l’assignation",
                          }
                        : {
                            url,
                            title: "Voir vos tickets ?",
                            description:
                              "Votre ticket a été créé. Voulez-vous ouvrir la page de tous vos tickets ?",
                            confirmLabel: "Voir mes tickets",
                          },
                    );
                  }}
                  className={`w-full text-left px-4 py-3 transition hover:bg-[#fff5ec] hover:cursor-pointer ${
                    item.isRead ? "bg-white" : "bg-[#fffdf2]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[12px] font-semibold text-[#2b1d10]">{item.title}</p>
                      <p className="text-[11px] text-[#6b5446] line-clamp-2">{item.message}</p>
                    </div>
                    <p className="shrink-0 text-[10px] text-[#9a9187]">{formatDate(item.createdAt)}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-[12px] text-[#7d7267]">Aucune notification.</div>
            )}
          </div>
        </div>
      ) : null}
      {typeof document !== "undefined" && pendingRedirect
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={pendingRedirect.title}
              className="fixed inset-0 z-[9999] grid place-items-center p-4"
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              <div
                ref={modalRef}
                className="relative w-full max-w-[420px] overflow-hidden rounded-[20px] border border-[#ead9c9] bg-white shadow-[0_20px_70px_rgba(0,0,0,0.25)]"
              >
                <div className="border-b border-[#f1e6da] px-5 py-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8f8b85]">
                    Notification
                  </p>
                  <p className="mt-1 text-[16px] font-semibold text-[#2b1d10]">
                    {pendingRedirect.title}
                  </p>
                  <p className="mt-2 text-[12px] text-[#6b5446]">
                    {pendingRedirect.description}
                  </p>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPendingRedirect(null)}
                    className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#dcccbc] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const url = pendingRedirect.url;
                      setPendingRedirect(null);
                      router.push(url);
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[#f9b800] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#352300] shadow-[0_10px_20px_rgba(249,184,0,0.18)] transition hover:bg-[#f2aa00]"
                  >
                    {pendingRedirect.confirmLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
