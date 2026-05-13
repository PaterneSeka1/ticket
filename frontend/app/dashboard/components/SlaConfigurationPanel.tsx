"use client";

import { useMemo } from "react";
import type { SlaPolicy, TicketPriority } from "@/api/types";
import { formatDuration, priorityLabels } from "@/app/dashboard/lib/ticket-formatters";

const SLA_PRIORITIES: TicketPriority[] = ["CRITICAL", "HIGH", "MEDIUM"];

type Props = {
  policies: SlaPolicy[];
  loading: boolean;
  error?: string | null;
  onEdit: (policy: SlaPolicy) => void;
};

export function SlaConfigurationPanel({ policies, loading, error, onEdit }: Props) {
  const displayPolicies: SlaPolicy[] = useMemo(() => {
    return SLA_PRIORITIES.map((priority) => {
      const existing = policies.find((policy) => policy.priority === priority);
      return (
        existing ?? {
          priority,
          responseMinutes: 0,
          resolutionMinutes: 0,
          isActive: false,
        }
      );
    });
  }, [policies]);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#eee3d6] bg-white">
      <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
        <p className="text-sm font-semibold text-[#2b1d10]">SLA par priorité</p>
      </div>

      <div className="px-5 py-4">
        {/* Header row */}
        <div className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Priorité</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Prise en charge</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Résolution</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Action</span>
        </div>

        {loading ? (
          <div className="rounded-[12px] border border-[#eee3d6] bg-white px-4 py-6 text-center text-sm text-[#6e6559]">
            Chargement des engagements...
          </div>
        ) : (
          <div className="space-y-2">
            {displayPolicies.map((policy) => {
              const badge = priorityLabels[policy.priority];
              return (
                <div
                  key={policy.priority}
                  className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 rounded-[12px] border border-[#eee3d6] bg-white px-4 py-3"
                >
                  <span
                    className={`inline-flex h-7 w-12 items-center justify-center rounded-full text-[0.65rem] font-bold uppercase ${badge.tone}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-sm font-semibold text-[#e07b1a]">
                    {formatDuration(policy.responseMinutes)}
                  </span>
                  <span className="text-sm font-semibold text-[#2b1d10]">
                    {formatDuration(policy.resolutionMinutes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(policy)}
                    className="inline-flex h-8 items-center rounded-[10px] border border-[#d8cabc] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
                  >
                    Modifier
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#c42d1f]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
