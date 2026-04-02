"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { Ticket } from "@/api/types";
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
}

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const timelineEntries = useMemo(
    () => [...(ticket.timeline ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [ticket.timeline],
  );

  const slaProgress = getSlaProgress(ticket);
  const slaTone = getSlaTone(slaProgress);
  const priorityInfo = priorityLabels[ticket.priority] ?? priorityLabels.LOW;
  const statusInfo = statusLabels[ticket.status] ?? statusLabels.RECU;
  const typeLabel = typeLabels[ticket.type];
  const emitterName = ticket.emitter ? `${ticket.emitter.prenom} ${ticket.emitter.nom}` : "—";
  const receivedByName = ticket.receivedBy
    ? `${ticket.receivedBy.prenom} ${ticket.receivedBy.nom}`
    : "—";
  const facts = [
    { label: "Service assigné", value: ticket.assignedService ?? "—" },
    { label: "Catégorie", value: ticket.category.libelle },
    { label: "Émetteur", value: emitterName },
    { label: "Reçu par", value: receivedByName },
    { label: "Client", value: ticket.clientName ?? "—" },
    { label: "Produit", value: ticket.product ?? "—" },
    { label: "Pièce jointe", value: ticket.attachmentName ?? "—" },
    {
      label: "Commentaires",
      value: ticket.comments.length
        ? `${ticket.comments.length} commentaire(s)`
        : "Aucun commentaire",
    },
  ];

  const dateFacts = [
    { label: "Détecté le", value: formatDateTime(ticket.detectedAt) },
    { label: "Reçu le", value: formatDateTime(ticket.receivedAt) },
    { label: "Résolu le", value: formatDateTime(ticket.resolvedAt) },
  ];

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
            <span className="text-sm font-semibold text-[#7b6655]">{ticket.code}</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#23160c]">{ticket.description}</h2>
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
                        <p className="text-[12px] text-[#7b6655]">
                          {event.actorName} • {event.type}
                        </p>
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
