"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import type { Ticket, TicketPriority, TicketStatus } from "@/api/types";
import { ApiError } from "@/api/client";
import { changeTicketStatus, createTicketComment, updateTicket } from "@/api/tickets";
import { fetchResolutionResponsibles, type ResolutionResponsible } from "@/api/resolution";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import {
  formatDateTime,
  formatDuration,
  getSlaProgress,
  getSlaTone,
  priorityLabels,
  statusLabels,
} from "@/app/dashboard/lib/ticket-formatters";

interface TicketDetailModalProps {
  ticket: Ticket;
  onClose: () => void;
  onTicketUpdated?: (ticket: Ticket) => void;
  initialView?: "assign" | null;
}

const resolveTicketNumber = (t: Ticket) => t.ticketNumber ?? t.code ?? t.id;
const resolveTicketCategory = (t: Ticket) => t.category?.name ?? t.category?.libelle ?? "—";
const resolveEmitterName = (t: Ticket) => {
  const src = t.emitter ?? t.createdBy ?? undefined;
  if (!src) return "—";
  return `${src.prenom ?? ""} ${src.nom ?? ""}`.trim() || "—";
};
const resolveTicketType = (t: Ticket) => {
  if (t.type) return t.type;
  const scope = t.category?.serviceType?.scope;
  if (scope === "EXTERNE") return "DEMANDE";
  if (scope === "INTERNE") return "INTERNE";
  return undefined;
};

const PRIORITY_ORDER: TicketPriority[] = ["CRITICAL", "HIGH", "MEDIUM"];

const PRIO_ACTIVE: Record<TicketPriority, string> = {
  CRITICAL: "bg-[#dc2626] text-white border-[#dc2626]",
  HIGH:     "bg-[#e07b1a] text-white border-[#e07b1a]",
  MEDIUM:   "bg-[#16a34a] text-white border-[#16a34a]",
};

const PRIO_INACTIVE: Record<TicketPriority, string> = {
  CRITICAL: "bg-transparent text-[#dc2626] border-[#dc2626]",
  HIGH:     "bg-transparent text-[#e07b1a] border-[#e07b1a]",
  MEDIUM:   "bg-transparent text-[#16a34a] border-[#16a34a]",
};

const ALL_STATUSES = Object.keys(statusLabels) as TicketStatus[];

function dotColor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("résolu") || l.includes("fermé") || l.includes("clôturé")) return "bg-[#16a34a]";
  if (l.includes("alerte") || l.includes("non ouvert") || l.includes("abandonné")) return "bg-[#dc2626]";
  if (l.includes("escalade")) return "bg-[#b45309]";
  return "bg-[#e07b1a]";
}

function dotShadow(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("résolu") || l.includes("fermé") || l.includes("clôturé")) return "0 0 0 1px #16a34a";
  if (l.includes("alerte") || l.includes("non ouvert") || l.includes("abandonné")) return "0 0 0 1px #dc2626";
  if (l.includes("escalade")) return "0 0 0 1px #b45309";
  return "0 0 0 1px #e07b1a";
}

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
  const isAdmin  = !!user && ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  const isClosed = ["RESOLVED", "RESOLU", "UNRESOLVED", "FERME", "CLOSED"].includes(ticket.status);
  const canEdit   = isAdmin && !isClosed;
  const canComment = !!user && !isClosed;

  const [localPriority, setLocalPriority]           = useState<TicketPriority>(ticket.priority);
  const [localStatus, setLocalStatus]               = useState<TicketStatus>(ticket.status);
  const [newComment, setNewComment]                 = useState("");
  const [isSaving, setIsSaving]                     = useState(false);
  const [responsibles, setResponsibles]             = useState<ResolutionResponsible[]>([]);
  const [responsiblesLoading, setResponsiblesLoading] = useState(false);
  const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
  const [isAssigning, setIsAssigning]               = useState(false);

  const canAssign = isAdmin && ticket.status === "PENDING_ASSIGNMENT";

  useEffect(() => {
    setLocalPriority(ticket.priority);
    setLocalStatus(ticket.status);
    setNewComment("");
    setSelectedResponsibleId("");
  }, [ticket.id, ticket.priority, ticket.status]);

  useEffect(() => {
    if (!canAssign) return;
    setResponsiblesLoading(true);
    fetchResolutionResponsibles()
      .then((data) => setResponsibles(data.filter((r) => r.isActive)))
      .catch(() => setResponsibles([]))
      .finally(() => setResponsiblesLoading(false));
  }, [canAssign]);

  const resolveStatusLabel = (s?: string | null) =>
    s ? (statusLabels[s as TicketStatus]?.label ?? s) : "—";

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (ticket.statusHistory?.length) {
      return [...ticket.statusHistory]
        .map((e) => ({
          id: e.id,
          label: `${resolveStatusLabel(e.fromStatus)} → ${resolveStatusLabel(e.toStatus)}`,
          meta: e.changedBy
            ? `${e.changedBy.prenom ?? ""} ${e.changedBy.nom ?? ""}`.trim()
            : undefined,
          createdAt: e.createdAt,
          comment: e.comment ?? null,
        }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return [...(ticket.timeline ?? [])]
      .map((e) => ({
        id: e.id,
        label: e.label,
        meta: `${e.actorName} • ${e.type}`,
        createdAt: e.createdAt,
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [ticket.statusHistory, ticket.timeline]);

  const slaProgress = getSlaProgress(ticket);
  const slaTone     = getSlaTone(slaProgress);
  const emitterName = resolveEmitterName(ticket);
  const type        = resolveTicketType(ticket);
  const typeEmoji   = type === "INTERNE" ? "🏢" : type === "DEMANDE" ? "🤝" : "";
  const statusInfo  = statusLabels[ticket.status] ?? { label: ticket.status, color: "" };

  const existingComments = ticket.comments ?? [];

  const handleSave = async () => {
    let updated: Ticket = ticket;
    let changed = false;
    setIsSaving(true);

    try {
      if (isAdmin && localPriority !== ticket.priority) {
        updated = await updateTicket(ticket.id, { priority: localPriority });
        changed = true;
      }

      if (isAdmin && localStatus !== ticket.status) {
        updated = await changeTicketStatus(ticket.id, {
          status: localStatus,
          resolutionComment: newComment.trim() || undefined,
        });
        changed = true;
      }

      if (newComment.trim() && localStatus === ticket.status) {
        await createTicketComment(ticket.id, { content: newComment.trim() });
        changed = true;
      }

      if (changed) {
        onTicketUpdated?.(updated);
        toast.success("Ticket #" + resolveTicketNumber(ticket) + " mis à jour.");
      } else {
        toast("Aucune modification.", { icon: "ℹ️" });
      }
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Impossible d'enregistrer les modifications.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  const handleAssign = async () => {
    if (!selectedResponsibleId) {
      toast.error("Veuillez sélectionner un responsable.");
      return;
    }
    setIsAssigning(true);
    try {
      const updated = await changeTicketStatus(ticket.id, {
        status: "ASSIGNED",
        assignedResponsibleId: selectedResponsibleId,
      });
      onTicketUpdated?.(updated);
      toast.success("Ticket #" + resolveTicketNumber(ticket) + " assigné.");
      onClose();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Impossible d'assigner le ticket.";
      toast.error(msg);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(80,30,5,0.28)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[700px] max-h-[88vh] overflow-y-auto rounded-[18px] bg-white border border-[#f5d8b8] p-6"
        style={{ boxShadow: "0 4px 28px rgba(160,90,20,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[#eee3d6] p-1.5 text-[#7b6655] hover:bg-[#fff3e6] transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div>
          <h3 className="text-[17px] font-[800] text-[#3b1f08]">
            Ticket #{resolveTicketNumber(ticket)}
          </h3>
          <p className="mt-[3px] text-[13px] text-[#6b4423]">
            {resolveTicketCategory(ticket)} | {priorityLabels[ticket.priority]?.label ?? ticket.priority} | {statusInfo.label}
          </p>
        </div>

        {/* Separator */}
        <div className="my-[11px] h-px bg-[#f5d8b8]" />

        {/* SLA */}
        {(ticket.waitMinutes ?? 0) > 0 && (
          <div className="mb-[13px] rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-[13px] py-[10px]">
            <p className="mb-[5px] text-[10px] font-[700] uppercase tracking-[.7px] text-[#9a3412]">
              ⏱ SLA
            </p>
            <div className="flex items-center gap-[7px]">
              <div className={`h-[6px] flex-1 overflow-hidden rounded-[3px] ${slaTone.track}`}>
                <div
                  className={`h-full rounded-[3px] bg-gradient-to-r ${slaTone.bar}`}
                  style={{ width: `${slaProgress}%` }}
                />
              </div>
              <span className={`whitespace-nowrap font-mono text-[11px] font-[600] ${slaTone.text}`}>
                {formatDuration(ticket.waitMinutes ?? ticket.slaMaxMinutes)}
                {slaProgress >= 100 && (
                  <span className="ml-1 inline-flex animate-pulse rounded-full bg-[#fee2e2] px-[7px] py-[2px] text-[10px] font-[700] text-[#dc2626]">
                    🔴
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="mb-[14px] grid grid-cols-2 gap-[13px]">
          <div>
            <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#b89070]">Émetteur</p>
            <p className="mt-[3px] text-[13px] font-[600] text-[#3b1f08]">{emitterName}</p>
          </div>
          <div>
            <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#b89070]">Date Création</p>
            <p className="mt-[3px] text-[13px] font-[600] text-[#3b1f08]">{formatDateTime(ticket.createdAt)}</p>
          </div>
          <div>
            <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#b89070]">Catégorie</p>
            <p className="mt-[3px] text-[13px] font-[600] text-[#3b1f08]">
              {typeEmoji && <span className="mr-1">{typeEmoji}</span>}
              {resolveTicketCategory(ticket)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#b89070]">Date Détection</p>
            <p className="mt-[3px] text-[13px] font-[600] text-[#3b1f08]">{formatDateTime(ticket.detectedAt ?? ticket.createdAt)}</p>
          </div>
          {ticket.clientName && (
            <div>
              <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#b89070]">Client</p>
              <p className="mt-[3px] text-[13px] font-[600] text-[#3b1f08]">{ticket.clientName}</p>
            </div>
          )}
          {ticket.product && (
            <div>
              <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#b89070]">Produit</p>
              <p className="mt-[3px] text-[13px] font-[600] text-[#3b1f08]">{ticket.product}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#b89070]">Description</p>
            <p className="mt-[3px] whitespace-pre-wrap text-[13px] leading-[1.5] text-[#3b1f08]">
              {ticket.description}
            </p>
          </div>
        </div>

        {/* Admin controls */}
        {canEdit && (
          <>
            <div className="my-[15px] h-px bg-[#f5d8b8]" />

            {/* Priority */}
            <div className="mb-[13px]">
              <div className="mb-[6px] flex items-center gap-[8px]">
                <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#6b4423]">Priorité</p>
                <span className="inline-flex items-center rounded-full bg-[#fff0dc] px-[9px] py-[2px] text-[9px] font-[700] uppercase tracking-[.7px] text-[#e07b1a]">
                  Admin
                </span>
              </div>
              <div className="flex flex-wrap gap-[9px]">
                {PRIORITY_ORDER.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setLocalPriority(p)}
                    className={`cursor-pointer rounded-[20px] border-2 px-[16px] py-[7px] text-[12px] font-[700] transition ${
                      localPriority === p ? PRIO_ACTIVE[p] : PRIO_INACTIVE[p]
                    }`}
                  >
                    {priorityLabels[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignment — only shown when ticket awaits assignment */}
            {canAssign && (
              <div className="mb-[13px] rounded-[12px] border border-[#f5d8b8] bg-[#fffaf5] px-[14px] py-[14px]">
                <div className="mb-[8px] flex items-center gap-[8px]">
                  <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#6b4423]">Assigner le responsable</p>
                  <span className="inline-flex items-center rounded-full bg-[#fff0dc] px-[9px] py-[2px] text-[9px] font-[700] uppercase tracking-[.7px] text-[#e07b1a]">
                    Admin
                  </span>
                </div>
                {responsiblesLoading ? (
                  <p className="text-[13px] text-[#b89070]">Chargement des responsables…</p>
                ) : (
                  <>
                    <select
                      value={selectedResponsibleId}
                      onChange={(e) => setSelectedResponsibleId(e.target.value)}
                      className="w-full cursor-pointer rounded-[10px] border border-[#f5d8b8] bg-white px-[13px] py-[10px] text-[13px] text-[#3b1f08] outline-none transition focus:border-[#e07b1a]"
                    >
                      <option value="">— Sélectionner un responsable —</option>
                      {responsibles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.firstName} {r.lastName}
                          {r.role ? ` · ${r.role}` : ""}
                          {r.isExternal ? " (Externe)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={isAssigning || !selectedResponsibleId}
                      className="mt-[10px] cursor-pointer rounded-[9px] border-none bg-[#f9b800] px-[18px] py-[8px] text-[13px] font-[600] text-[#352300] shadow-[0_4px_12px_rgba(249,184,0,0.25)] transition hover:bg-[#f2aa00] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAssigning ? "Assignation…" : "✅ Assigner"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Service assigné */}
            <div className="mb-[13px]">
              <div className="mb-[6px] flex items-center gap-[8px]">
                <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#6b4423]">Service Assigné</p>
                <span className="inline-flex items-center rounded-full bg-[#fff0dc] px-[9px] py-[2px] text-[9px] font-[700] uppercase tracking-[.7px] text-[#e07b1a]">
                  Admin
                </span>
              </div>
              <select
                disabled
                defaultValue={ticket.assignedService ?? ""}
                className="w-full cursor-not-allowed rounded-[10px] border border-[#f5d8b8] bg-[#fffaf5] px-[13px] py-[10px] text-[13px] text-[#3b1f08] opacity-80 outline-none"
              >
                <option value="">{ticket.assignedService ?? "— Non assigné —"}</option>
              </select>
            </div>

            {/* Statut */}
            <div className="mb-[13px]">
              <div className="mb-[6px] flex items-center gap-[8px]">
                <p className="text-[10px] font-[700] uppercase tracking-[.7px] text-[#6b4423]">Statut</p>
                <span className="inline-flex items-center rounded-full bg-[#fff0dc] px-[9px] py-[2px] text-[9px] font-[700] uppercase tracking-[.7px] text-[#e07b1a]">
                  Admin
                </span>
              </div>
              <select
                value={localStatus}
                onChange={(e) => setLocalStatus(e.target.value as TicketStatus)}
                className="w-full cursor-pointer rounded-[10px] border border-[#f5d8b8] bg-[#fffaf5] px-[13px] py-[10px] text-[13px] text-[#3b1f08] outline-none transition focus:border-[#e07b1a]"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]?.label ?? s}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Separator */}
        <div className="my-[15px] h-px bg-[#f5d8b8]" />

        {/* Timeline */}
        <p className="mb-[9px] text-[10px] font-[700] uppercase tracking-[.9px] text-[#b89070]">
          📋 Historique & Traçabilité
        </p>
        <div className="border-l-2 border-[#f5d8b8] pl-[13px]">
          {timelineEntries.length === 0 ? (
            <p className="text-[13px] text-[#b89070]">Aucun événement enregistré.</p>
          ) : (
            timelineEntries.map((event) => (
              <div key={event.id} className="relative pb-[13px] pl-[13px]">
                <span
                  className={`absolute left-[-6px] top-[5px] h-[9px] w-[9px] rounded-full border-2 border-white ${dotColor(event.label)}`}
                  style={{ boxShadow: dotShadow(event.label) }}
                />
                <p className="font-mono text-[10px] text-[#b89070]">{formatDateTime(event.createdAt)}</p>
                <p className="mt-[2px] text-[12px] leading-[1.4] text-[#3b1f08]">{event.label}</p>
                {event.meta && <p className="mt-[1px] text-[10px] text-[#b89070]">{event.meta}</p>}
                {event.comment && <p className="mt-[1px] text-[11px] italic text-[#7b6655]">{event.comment}</p>}
              </div>
            ))
          )}
        </div>

        {/* Separator */}
        <div className="my-[15px] h-px bg-[#f5d8b8]" />

        {/* Comments */}
        <p className="mb-[9px] text-[10px] font-[700] uppercase tracking-[.9px] text-[#b89070]">
          💬 Commentaires
        </p>
        {existingComments.length === 0 ? (
          <p className="mb-[9px] text-[13px] text-[#b89070]">Aucun commentaire.</p>
        ) : (
          existingComments.map((c, i) => (
            <div
              key={i}
              className="mb-[9px] rounded-[10px] border border-[#f5d8b8] bg-[#fff3e6] px-[13px] py-[11px]"
            >
              <div className="mb-[4px] flex justify-between text-[11px] text-[#b89070]">
                <span>{(c as any).author ?? (c as any).by ?? "—"}</span>
                <span>{formatDateTime((c as any).createdAt ?? (c as any).at)}</span>
              </div>
              <p className="text-[13px] text-[#3b1f08]">{(c as any).content ?? (c as any).txt}</p>
            </div>
          ))
        )}

        {canComment ? (
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ajouter un commentaire ou note de suivi…"
            rows={3}
            className="mt-[10px] w-full resize-y rounded-[10px] border border-[#f5d8b8] bg-[#fffaf5] px-[13px] py-[10px] font-[inherit] text-[13px] text-[#3b1f08] outline-none transition focus:border-[#e07b1a]"
          />
        ) : isClosed ? (
          <p className="mt-[8px] rounded-[10px] border border-[#f5d8b8] bg-[#fff3e6] px-[13px] py-[10px] text-[12px] text-[#b89070]">
            🔒 Les commentaires sont désactivés — ticket {statusInfo.label.toLowerCase()}.
          </p>
        ) : null}

        {/* Footer */}
        {isClosed && (
          <p className="mt-[12px] rounded-[10px] border border-[#f5d8b8] bg-[#fff3e6] px-[13px] py-[10px] text-[12px] text-[#b89070]">
            🔒 Ce ticket est <strong>{statusInfo.label.toLowerCase()}</strong> — aucune modification n'est possible.
          </p>
        )}
        <div className="mt-[16px] flex justify-end gap-[9px]">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[9px] border border-[#f5d8b8] bg-transparent px-[18px] py-[8px] text-[13px] font-[600] text-[#6b4423] transition hover:border-[#e07b1a] hover:text-[#e07b1a]"
          >
            Fermer
          </button>
          {!isClosed && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="cursor-pointer rounded-[9px] border-none bg-[#f9b800] px-[18px] py-[8px] text-[13px] font-[600] text-[#352300] shadow-[0_8px_16px_rgba(249,184,0,0.25)] transition hover:bg-[#f2aa00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Enregistrement…" : "💾 Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
