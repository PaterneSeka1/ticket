"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import type { Ticket } from "@/api/types";
import { ApiError } from "@/api/client";
import { changeTicketStatus } from "@/api/tickets";
import type { ResolutionResponsible } from "@/api/resolution";
import { fetchResolutionResponsibles } from "@/api/resolution";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import {
  formatDateTime,
  formatDuration,
  getSlaProgress,
  getSlaTone,
  priorityLabels,
  statusLabels,
  typeLabels,
} from "@/app/dashboard/lib/ticket-formatters";

interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
  onTicketUpdated?: (ticket: Ticket) => void;
}

const resolveTicketNumber = (ticket: Ticket) => ticket.ticketNumber ?? ticket.code ?? ticket.id;
const resolveTicketCategory = (ticket: Ticket) => ticket.category?.name ?? ticket.category?.libelle ?? "—";
const resolveTicketTitle = (ticket: Ticket) => ticket.title ?? resolveTicketCategory(ticket);
const resolveTicketType = (ticket: Ticket) => {
  if (ticket.type) return ticket.type;
  const scope = ticket.category?.incidentType?.scope;
  if (scope === "EXTERNE") return "DEMANDE";
  if (scope === "INTERNE") return "INCIDENT";
  return undefined;
};
const resolveEmitterName = (ticket: Ticket) => {
  const source = ticket.emitter ?? ticket.createdBy ?? undefined;
  if (!source) return "—";
  return `${source.prenom ?? ""} ${source.nom ?? ""}`.trim() || "—";
};
const resolveAssigneeName = (ticket: Ticket) => {
  if (ticket.assignedResponsible) {
    return `${ticket.assignedResponsible.firstName} ${ticket.assignedResponsible.lastName}`.trim() || "—";
  }
  if (ticket.receivedBy) {
    return `${ticket.receivedBy.prenom ?? ""} ${ticket.receivedBy.nom ?? ""}`.trim() || "—";
  }
  return ticket.assignedService ?? "—";
};

type TimelineEntry = {
  id: string;
  label: string;
  meta?: string;
  createdAt: string;
  comment?: string | null;
};

export function TicketDetailModal({
  ticket,
  onClose,
  onTicketUpdated,
}: TicketDetailModalProps) {
  const { user } = useCurrentUser();
  const canAssign =
    !!user && ["ADMIN", "SUPER_ADMIN"].includes(user.role) && ticket.status === "PENDING_ASSIGNMENT";

  const [responsibles, setResponsibles] = useState<ResolutionResponsible[]>([]);
  const [responsiblesLoading, setResponsiblesLoading] = useState(false);
  const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (!canAssign) return;
    let cancelled = false;
    setResponsiblesLoading(true);
    fetchResolutionResponsibles()
      .then((data) => {
        if (cancelled) return;
        const active = data.filter((item) => item.isActive);
        setResponsibles(active);
        setSelectedResponsibleId(active[0]?.id ?? "");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setResponsibles([]);
          setSelectedResponsibleId("");
        }
      })
      .finally(() => {
        if (!cancelled) setResponsiblesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (ticket.statusHistory?.length) {
      return [...ticket.statusHistory]
        .map((entry) => ({
          id: entry.id,
          label: `${entry.fromStatus ?? "—"} → ${entry.toStatus}`,
          meta: entry.changedBy ? `${entry.changedBy.prenom ?? ""} ${entry.changedBy.nom ?? ""}`.trim() : undefined,
          createdAt: entry.createdAt,
          comment: entry.comment ?? null,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return [...(ticket.timeline ?? [])]
      .map((event) => ({
        id: event.id,
        label: event.label,
        meta: `${event.actorName} • ${event.type}`,
        createdAt: event.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ticket.statusHistory, ticket.timeline]);

  const slaProgress = getSlaProgress(ticket);
  const slaTone = getSlaTone(slaProgress);
  const priorityInfo = priorityLabels[ticket.priority] ?? priorityLabels.LOW;
  const statusInfo =
    statusLabels[ticket.status] ??
    statusLabels.RECU ?? { label: ticket.status, color: "bg-[#f0f0f0] text-[#6b6b6b]" };
  const type = resolveTicketType(ticket);
  const typeLabel = type ? typeLabels[type] : "—";
  const emitterName = resolveEmitterName(ticket);
  const receivedByName = ticket.receivedBy
    ? `${ticket.receivedBy.prenom ?? ""} ${ticket.receivedBy.nom ?? ""}`.trim() || "—"
    : "—";
  const assigneeName = resolveAssigneeName(ticket);
  const commentsCount = (ticket.comments ?? []).length;

  const facts = [
    { label: "Assigné à", value: assigneeName },
    { label: "Catégorie", value: resolveTicketCategory(ticket) },
    { label: "Émetteur", value: emitterName },
    { label: "Reçu par", value: receivedByName },
    { label: "Client", value: ticket.clientName ?? "—" },
    { label: "Produit", value: ticket.product ?? "—" },
    { label: "Pièce jointe", value: ticket.attachmentName ?? "—" },
    {
      label: "Commentaires",
      value: commentsCount
        ? `${commentsCount} commentaire(s)`
        : "Aucun commentaire",
    },
  ];

  const dateFacts = [
    { label: "Détecté le", value: formatDateTime(ticket.detectedAt) },
    { label: "Reçu le", value: formatDateTime(ticket.receivedAt) },
    { label: "Résolu le", value: formatDateTime(ticket.resolvedAt) },
  ];

  const handleAssign = async () => {
    if (!selectedResponsibleId) {
      toast.error("Sélectionnez un responsable.");
      return;
    }

    setIsAssigning(true);
    try {
      const updated = await changeTicketStatus(ticket.id, {
        status: "ASSIGNED",
        assignedResponsibleId: selectedResponsibleId,
      });
      onTicketUpdated?.(updated);
      toast.success("Ticket assigné.");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Impossible d’assigner le ticket.";
      toast.error(message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_30px_60px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[#e6e6e6] p-2 text-[#2b1d10]"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b87731]">Ticket</span>
            <span className="text-sm font-semibold text-[#7b6655]">{resolveTicketNumber(ticket)}</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#23160c]">{resolveTicketTitle(ticket)}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className="inline-flex rounded-full border border-[#e5e1db] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
              {typeLabel}
            </span>
            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${priorityInfo.tone}`}>
              {priorityInfo.label}
            </span>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#f1e5d7] bg-[#fffdfb] p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Description</p>
              <p className="mt-2 text-sm text-[#2b1d10] leading-relaxed">{ticket.description}</p>
            </div>

            {canAssign && (
              <div className="rounded-2xl border border-[#eee3d6] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#9c958a]">
                  Assignation
                </p>
                <p className="mt-2 text-[12px] text-[#7b6655]">
                  Choisissez un responsable puis validez l’assignation.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={selectedResponsibleId}
                    onChange={(event) => setSelectedResponsibleId(event.target.value)}
                    disabled={responsiblesLoading || isAssigning || !responsibles.length}
                    className="h-10 w-full rounded-[12px] border border-[#e7ddd2] bg-white px-3 text-sm text-[#2b1d10] focus:border-[#d29b55] focus:outline-none sm:flex-1"
                  >
                    {responsiblesLoading ? (
                      <option value="">Chargement…</option>
                    ) : responsibles.length ? (
                      responsibles.map((responsible) => (
                        <option key={responsible.id} value={responsible.id}>
                          {responsible.firstName} {responsible.lastName}
                        </option>
                      ))
                    ) : (
                      <option value="">Aucun responsable actif</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={responsiblesLoading || isAssigning || !selectedResponsibleId}
                    className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[#f9b800] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#352300] shadow-[0_10px_20px_rgba(249,184,0,0.18)] transition disabled:opacity-40"
                  >
                    {isAssigning ? "Assignation…" : "Assigner"}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#eee3d6] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#9c958a]">Timeline</p>
                <span className="text-xs font-semibold text-[#b87731]">{timelineEntries.length} étape(s)</span>
              </div>

              <div className="mt-3 space-y-3">
                {timelineEntries.length === 0 ? (
                  <p className="text-sm text-[#7b6655]">Aucun événement enregistré.</p>
                ) : (
                  timelineEntries.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-1 rounded-2xl border border-[#f1e5d7] bg-[#fffaf5] px-3 py-2 text-sm text-[#2b1d10] lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[#23160c]">{event.label}</p>
                        {event.meta ? (
                          <p className="text-[12px] text-[#7b6655]">{event.meta}</p>
                        ) : null}
                        {event.comment ? (
                          <p className="text-[12px] text-[#7b6655]">{event.comment}</p>
                        ) : null}
                      </div>
                      <span className="text-[12px] text-[#8a8176]">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#f1e5d7] bg-[#fffaf5] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9c958a]">Informations clés</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-xl border border-[#f1e5d7] bg-white px-3 py-2 text-[12px] text-[#5f4d3f]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#9c958a]">{fact.label}</p>
                    <p className="mt-1 font-semibold text-[#23160c]">{fact.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#f1e5d7] bg-white p-4">
              <div className="flex flex-col gap-2 text-[12px] text-[#5f4d3f]">
                {dateFacts.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#9c958a]">{item.label}</span>
                    <span className="font-semibold text-[#23160c]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#eee3d6] bg-[#fffaf5] p-4">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b87731]">
                <span>SLA actif</span>
                <span className={slaTone.text}>{formatDuration(ticket.waitMinutes ?? ticket.slaMaxMinutes)}</span>
              </div>
              <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${slaTone.track}`}>
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${slaTone.bar}`}
                  style={{ width: `${slaProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
