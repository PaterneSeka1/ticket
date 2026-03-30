"use client";

import type { ChangeEvent } from "react";
import type { SlaPolicy, TicketPriority } from "@/api/types";
import { formatDuration, priorityLabels } from "@/app/dashboard/lib/ticket-formatters";

type Props = {
  open: boolean;
  policy: SlaPolicy | null;
  values: {
    responseMinutes: number;
    resolutionMinutes: number;
    isActive: boolean;
  };
  saving: boolean;
  error: string | null;
  onChange: (field: keyof Props["values"], value: number | boolean) => void;
  onSave: () => void;
  onClose: () => void;
};

const labelMap: Record<TicketPriority, string> = {
  CRITIQUE: "P1",
  HAUT: "P2",
  MOYEN: "P3",
  BAS: "P4",
};

export function SlaPolicyModal({
  open,
  policy,
  values,
  saving,
  error,
  onChange,
  onSave,
  onClose,
}: Props) {
  if (!open || !policy) {
    return null;
  }

  const handleNumberChange = (field: keyof Omit<Props["values"], "isActive">) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = event.target.valueAsNumber;
      onChange(field, Number.isNaN(parsed) ? 0 : parsed);
    };

  const handleToggle = () => {
    onChange("isActive", !values.isActive);
  };

  const badgeTone = priorityLabels[policy.priority];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">Modifier le SLA</p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-8 w-16 items-center justify-center rounded-full text-[0.7rem] font-bold uppercase ${badgeTone.tone}`}>
                {labelMap[policy.priority]}
              </span>
              <span className="text-sm font-semibold text-[#2b1d10]">{formatDuration(values.resolutionMinutes)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6f6b64]">
            Fermer
          </button>
        </div>

        <div className="mt-6 space-y-4 rounded-[20px] border border-[#ebe6df] bg-[#f3f3f2] p-4">
          <label className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-[#9a928a]">Prise en charge</label>
          <input
            type="number"
            min={0}
            value={values.responseMinutes}
            onChange={handleNumberChange("responseMinutes")}
            className="w-full rounded-[12px] border border-[#e2dcd2] bg-white px-3 py-2 text-sm font-semibold text-[#2b1d10]"
          />
          <label className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-[#9a928a]">Résolution</label>
          <input
            type="number"
            min={0}
            value={values.resolutionMinutes}
            onChange={handleNumberChange("resolutionMinutes")}
            className="w-full rounded-[12px] border border-[#e2dcd2] bg-white px-3 py-2 text-sm font-semibold text-[#2b1d10]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-[#9a928a]">Statut</span>
            <button
              type="button"
              onClick={handleToggle}
              className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.34em] ${
                values.isActive ? "bg-[#e6f5ec] text-[#1f6f3a]" : "bg-[#fde8e5] text-[#a42c1d]"
              }`}
            >
              {values.isActive ? "Actif" : "Désactivé"}
            </button>
          </div>
        </div>

        {error && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#c42d1f]">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#d6cfc5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#4b3e32]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-[#f0a31c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
