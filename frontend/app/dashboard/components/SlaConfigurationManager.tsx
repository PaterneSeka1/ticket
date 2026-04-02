"use client";

import { useEffect, useState } from "react";
import { fetchSlaPolicies, updateSlaPolicy } from "@/api/sla";
import type { SlaPolicy } from "@/api/types";
import { SlaConfigurationPanel } from "./SlaConfigurationPanel";
import { SlaPolicyModal } from "./SlaPolicyModal";

type SlaDraft = {
  responseMinutes: number;
  resolutionMinutes: number;
};

const createDraft = (policy: SlaPolicy): SlaDraft => ({
  responseMinutes: policy.responseMinutes,
  resolutionMinutes: policy.resolutionMinutes,
});

export function SlaConfigurationManager() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null);
  const [draft, setDraft] = useState<SlaDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadPolicies = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSlaPolicies();
        if (mounted) {
          setPolicies(data);
        }
      } catch {
        if (mounted) {
          setError("Impossible de charger les engagements SLA.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void loadPolicies();
    return () => {
      mounted = false;
    };
  }, []);

  const handleEdit = (policy: SlaPolicy) => {
    setEditingPolicy(policy);
    setDraft(createDraft(policy));
    setModalError(null);
  };

  const closeModal = () => {
    setEditingPolicy(null);
    setDraft(null);
    setModalError(null);
  };

  const updateDraftValue = (field: keyof SlaDraft, value: number) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const savePolicy = async () => {
    if (!editingPolicy || !draft) return;
    setSaving(true);
    setModalError(null);
    try {
      const updated = await updateSlaPolicy(editingPolicy.priority, {
        resolutionMinutes: draft.resolutionMinutes,
        responseMinutes: draft.responseMinutes,
      });
      setPolicies((prev) =>
        prev.map((policy) => (policy.priority === updated.priority ? updated : policy)),
      );
      setEditingPolicy(null);
      setDraft(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Impossible de sauvegarder les changements.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SlaConfigurationPanel
        policies={policies}
        loading={loading}
        error={error}
        onEdit={handleEdit}
      />
      <SlaPolicyModal
        open={Boolean(editingPolicy && draft)}
        policy={editingPolicy}
        values={draft ?? { responseMinutes: 0, resolutionMinutes: 0 }}
        saving={saving}
        error={modalError}
        onResponseChange={(value) => updateDraftValue("responseMinutes", value)}
        onResolutionChange={(value) => updateDraftValue("resolutionMinutes", value)}
        onSave={savePolicy}
        onClose={closeModal}
      />
    </>
  );
}
