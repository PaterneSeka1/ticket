"use client";

import type { SlaPolicy, TicketPriority } from "@/api/types";
import { formatDuration, priorityLabels } from "@/app/dashboard/lib/ticket-formatters";

type Props = {
  policies: SlaPolicy[];
  loading: boolean;
  error?: string | null;
  onEdit: (policy: SlaPolicy) => void;
};

const fallbackPriorities: TicketPriority[] = ["CRITIQUE", "HAUT", "MOYEN", "BAS"];

export function SlaConfigurationPanel({ policies, loading, error, onEdit }: Props) {
  return (
    <section className="rounded-[24px] border border-[#e5e1dc] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">SLA par priorité</p>
        <p className="text-sm text-[#2b1d10]">Ajustez les engagements de prise en charge et de résolution.</p>
      </div>
      <div className="mt-6 overflow-hidden rounded-[20px] border border-[#ebe6df] bg-[#f3f3f2]">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#9a928a]">
          <span>Priorité</span>
          <span>Prise en charge</span>
          <span>Résolution</span>
        </div>
        <div className="space-y-4 px-6 py-4">
          {loading ? (
            <div className="rounded-[14px] border border-[#e5e1dc] bg-white px-4 py-6 text-center text-sm text-[#6e6559] shadow-[0_6px_20px_rgba(15,20,10,0.08)]">
              Chargement des engagements...
            </div>
          ) : (
            (policies.length ? policies : fallbackPriorities.map((priority) => ({
              priority,
              responseMinutes: 0,
              resolutionMinutes: 0,
              isActive: false,
            })) as SlaPolicy[]).map((policy) => {
              const badge = priorityLabels[policy.priority];
              return (
                <div
                  key={policy.priority}
                  className="flex items-center justify-between gap-6 rounded-[14px] bg-white px-4 py-3 text-sm text-[#2b1d10] shadow-[0_6px_20px_rgba(15,20,10,0.08)]"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-8 w-16 items-center justify-center rounded-full text-[0.7rem] font-bold uppercase ${badge.tone}`}
                      >
                        {badge.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] ${
                          policy.isActive ? 'bg-[#e6f5ec] text-[#1f6f3a]' : 'bg-[#fde8e5] text-[#a42c1d]'
                        }`}
                      >
                        {policy.isActive ? 'Actif' : 'Désactivé'}
                      </span>
                    </div>
                  </div>
                  <div className="w-32 text-center font-semibold text-[#f73b35]">
                    {formatDuration(policy.responseMinutes)}
                  </div>
                  <div className="w-32 text-center font-semibold text-[#434343]">
                    {formatDuration(policy.resolutionMinutes)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(policy)}
                      className="rounded-full border border-[#dcd5ce] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#4b3e32] transition hover:border-[#f0a31c] hover:text-[#f0a31c]"
                    >
                      Modifier
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {error && (
          <p className="px-6 pb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#c42d1f]">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
