"use client";

import { useEffect, useState } from "react";
import { fetchSlaPolicies, updateSlaPolicy } from "@/api/sla";
import type { SlaPolicy } from "@/api/types";
import { formatDuration, priorityLabels } from "@/app/dashboard/lib/ticket-formatters";
import { SlaPolicyModal } from "./SlaPolicyModal";

type SlaDraft = {
  responseMinutes: number;
  resolutionMinutes: number;
  isActive: boolean;
};

const emptyDraft: SlaDraft = {
  responseMinutes: 0,
  resolutionMinutes: 0,
  isActive: true,
};

const createEmptyDraft = (): SlaDraft => ({ ...emptyDraft });

export function SlaConfigurationPanel() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null);
  const [draft, setDraft] = useState<SlaDraft>(createEmptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSlaPolicies();
        if (mounted) {
          setPolicies(data);
        }
      } catch (err) {
        if (mounted) {
          setError("Impossible de charger les engagements SLA.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const startEditing = (policy: SlaPolicy) => {
    setDraft({
      responseMinutes: policy.responseMinutes,
      resolutionMinutes: policy.resolutionMinutes,
      isActive: policy.isActive,
    });
    setEditingPolicy(policy);
  };

  const cancelEditing = () => {
    setEditingPolicy(null);
    setDraft(createEmptyDraft());
    setError(null);
  };

  const handleSave = async () => {
    if (!editingPolicy) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSlaPolicy(editingPolicy.priority, {
        responseMinutes: draft.responseMinutes,
        resolutionMinutes: draft.resolutionMinutes,
        isActive: draft.isActive,
      });
      setPolicies((prev) =>
        prev.map((policy) => (policy.priority === updated.priority ? updated : policy)),
      );
      setEditingPolicy(null);
      setDraft(createEmptyDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder les changements.");
    } finally {
      setSaving(false);
    }
  };

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
            policies.map((policy) => {
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
                      onClick={() => startEditing(policy)}
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
      <SlaPolicyModal
        open={Boolean(editingPolicy)}
        policy={editingPolicy}
        values={draft}
        saving={saving}
        error={error}
        onChange={(field, value) => setDraft((prev) => ({ ...prev, [field]: value }))}
        onSave={handleSave}
        onClose={cancelEditing}
      />
    </section>
  );
}
