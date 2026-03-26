import type { Ticket, TicketPriority, TicketStatus } from "@/api/types";

export const statusLabels: Record<TicketStatus, { label: string; color: string }> = {
  RECU: { label: "Reçu", color: "bg-[#ffe9d6] text-[#c4620c]" },
  EN_COURS: { label: "En cours de résolution", color: "bg-[#fff6e0] text-[#c4620c]" },
  AJOURNE: { label: "Ajourné", color: "bg-[#f0ecff] text-[#5a3db7]" },
  RESOLU: { label: "Résolu", color: "bg-[#e8f6eb] text-[#1f6f3a]" },
  ABANDONNE: { label: "Abandonné", color: "bg-[#fde8e7] text-[#c42d1f]" },
  FERME: { label: "Fermé", color: "bg-[#f0f0f0] text-[#6b6b6b]" },
  OUVERT: { label: "Ouvert", color: "bg-[#fff7ea] text-[#a36807]" },
  PRIS: { label: "Pris en charge", color: "bg-[#eef5ff] text-[#1f4bbf]" },
};

export const priorityLabels: Record<TicketPriority, { label: string; tone: string }> = {
  CRITIQUE: { label: "P1", tone: "bg-[#fee2e0] text-[#c42d1f]" },
  HAUT: { label: "P2", tone: "bg-[#fff1d6] text-[#d9731d]" },
  MOYEN: { label: "P3", tone: "bg-[#e8f6eb] text-[#1f6f3a]" },
  BAS: { label: "P4", tone: "bg-[#eef5ff] text-[#1f4bbf]" },
};

export const typeLabels: Record<Ticket["type"], string> = {
  INCIDENT: "Interne",
  DEMANDE: "Client",
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const formatDuration = (minutes?: number | null) => {
  if (minutes === undefined || minutes === null) return "—";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const parts: string[] = [];

  if (hours) parts.push(`${hours}h`);
  if (remainder || !parts.length) parts.push(`${remainder}m`);

  return parts.join(" ");
};

export const getSlaProgress = (ticket: Ticket) => {
  if (!ticket.slaMaxMinutes) return 0;
  const consumed = ticket.waitMinutes ?? 0;
  return Math.min(100, Math.round((consumed / ticket.slaMaxMinutes) * 100));
};

export const getSlaTone = (progress: number) => {
  if (progress >= 85) {
    return {
      text: "text-[#c42d1f]",
      bar: "from-[#d92d20] to-[#ff8a65]",
      track: "bg-[#fbe4df]",
    };
  }

  if (progress >= 55) {
    return {
      text: "text-[#b45309]",
      bar: "from-[#f59e0b] to-[#facc15]",
      track: "bg-[#fff1d6]",
    };
  }

  return {
    text: "text-[#15803d]",
    bar: "from-[#22c55e] to-[#86efac]",
    track: "bg-[#e6f6ea]",
  };
};
