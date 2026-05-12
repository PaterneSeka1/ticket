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
  };
  saving: boolean;
  error: string | null;
  onResponseChange: (value: number) => void;
  onResolutionChange: (value: number) => void;
  onSave: () => void;
  onClose: () => void;
};

const labelMap: Record<TicketPriority, string> = {
  CRITICAL: "P1",
  HIGH:     "P2",
  MEDIUM:   "P3",
};

export function SlaPolicyModal({
  open,
  policy,
  values,
  saving,
  error,
  onResponseChange,
  onResolutionChange,
  onSave,
  onClose,
}: Props) {
  if (!open || !policy) {
    return null;
  }

  const handleResolutionChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = event.target.valueAsNumber;
    onResolutionChange(Number.isNaN(parsed) ? 0 : parsed);
  };

  const handleResponseChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = event.target.valueAsNumber;
    onResponseChange(Number.isNaN(parsed) ? 0 : parsed);
  };

  const badgeTone = priorityLabels[policy.priority];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[14px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[12px] font-semibold text-[#2f2f33]">Modifier le SLA</p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex h-8 w-16 items-center justify-center rounded-full text-[0.7rem] font-bold uppercase ${badgeTone.tone}`}
                >
                  {labelMap[policy.priority]}
                </span>
                <span className="text-[12px] font-semibold text-[#2b1d10]">
                  {formatDuration(values.responseMinutes)} • {formatDuration(values.resolutionMinutes)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-[10px] border border-[#d8cabc] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
                Prise en charge (min)
              </span>
              <input
                type="number"
                min={0}
                value={values.responseMinutes}
                onChange={handleResponseChange}
                className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
                Résolution (min)
              </span>
              <input
                type="number"
                min={0}
                value={values.resolutionMinutes}
                onChange={handleResolutionChange}
                className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
              />
            </label>
          </div>

          {error && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c42d1f]">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef0f2] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-[8px] border border-[#d8dce2] bg-white px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#fafafa]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-[8px] bg-[#fdbf12] px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#f4b400] disabled:opacity-60"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
