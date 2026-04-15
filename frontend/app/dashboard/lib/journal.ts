"use client";

import type { Ticket, TicketActor, TicketComment, TicketStatusLog } from "@/api/types";
import { statusLabels } from "@/app/dashboard/lib/ticket-formatters";

export type JournalEventType = "CREATE" | "STATUS_CHANGE" | "COMMENT";

export type TicketJournalEntry = {
  id: string;
  type: JournalEventType;
  createdAt: string;
  label: string;
  details?: string;
  actorName: string;
  ticketId: string;
  ticketCode: string;
  ticketCategory: string;
};

const formatActorName = (actor?: TicketActor | null) => {
  if (!actor) return "Utilisateur inconnu";
  const full = `${actor.prenom ?? ""} ${actor.nom ?? ""}`.trim();
  return full || actor.email || actor.matricule || "Utilisateur inconnu";
};

const resolveTicketCode = (ticket: Ticket) => ticket.ticketNumber ?? ticket.code ?? ticket.id;

const resolveTicketCategory = (ticket: Ticket) =>
  ticket.category?.name ?? ticket.category?.libelle ?? "—";

const formatStatusLabel = (status?: string | null) => {
  if (!status) return "—";
  const known = statusLabels[status as keyof typeof statusLabels]?.label;
  return known ?? status;
};

const normalize = (value: string) => value.trim().toLowerCase();

export function toDateInputValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const isSameLocalDate = (isoTimestamp: string, yyyyMmDd: string) => {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return false;
  return toDateInputValue(parsed) === yyyyMmDd;
};

const statusChangeEntry = (ticket: Ticket, log: TicketStatusLog): TicketJournalEntry => {
  const from = formatStatusLabel(log.fromStatus);
  const to = formatStatusLabel(log.toStatus);
  const label = log.fromStatus ? `Statut: ${from} → ${to}` : `Statut: ${to}`;

  return {
    id: log.id,
    type: "STATUS_CHANGE",
    createdAt: log.createdAt,
    label,
    details: log.comment ?? undefined,
    actorName: formatActorName(log.changedBy),
    ticketId: ticket.id,
    ticketCode: resolveTicketCode(ticket),
    ticketCategory: resolveTicketCategory(ticket),
  };
};

const commentEntry = (ticket: Ticket, comment: TicketComment): TicketJournalEntry => ({
  id: comment.id,
  type: "COMMENT",
  createdAt: comment.createdAt,
  label: "Commentaire ajouté",
  details: comment.content,
  actorName: formatActorName(comment.author),
  ticketId: ticket.id,
  ticketCode: resolveTicketCode(ticket),
  ticketCategory: resolveTicketCategory(ticket),
});

export function buildTicketJournalEntries(ticket: Ticket): TicketJournalEntry[] {
  const entries: TicketJournalEntry[] = [];

  entries.push({
    id: `${ticket.id}-create`,
    type: "CREATE",
    createdAt: ticket.createdAt,
    label: "Ticket créé",
    details: ticket.title ?? ticket.description ?? undefined,
    actorName: formatActorName(ticket.createdBy ?? ticket.emitter),
    ticketId: ticket.id,
    ticketCode: resolveTicketCode(ticket),
    ticketCategory: resolveTicketCategory(ticket),
  });

  (ticket.statusHistory ?? []).forEach((log) => entries.push(statusChangeEntry(ticket, log)));
  (ticket.comments ?? []).forEach((comment) => entries.push(commentEntry(ticket, comment)));

  return entries;
}

export function filterJournalEntries(
  entries: TicketJournalEntry[],
  options: { type?: JournalEventType | "TOUS"; search?: string; date?: string },
) {
  const selectedType = options.type ?? "TOUS";
  const query = normalize(options.search ?? "");
  const date = options.date?.trim();

  return entries.filter((entry) => {
    if (selectedType !== "TOUS" && entry.type !== selectedType) return false;
    if (date && !isSameLocalDate(entry.createdAt, date)) return false;
    if (!query) return true;

    const haystack = normalize(
      [
        entry.label,
        entry.details ?? "",
        entry.actorName,
        entry.ticketCode,
        entry.ticketCategory,
      ].join(" "),
    );
    return haystack.includes(query);
  });
}
