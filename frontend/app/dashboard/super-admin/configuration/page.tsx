"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { SlaConfigurationManager } from "@/app/dashboard/components/SlaConfigurationManager";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { statusLabels } from "@/app/dashboard/lib/ticket-formatters";
import type { ResolutionResponsible } from "@/api/resolution";
import {
  createResolutionResponsible,
  deleteResolutionResponsible,
  fetchResolutionResponsibles,
  updateResolutionResponsible,
} from "@/api/resolution";
import { ApiError } from "@/api/client";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Toggle switch (pill ON/OFF — no external lib)
// ---------------------------------------------------------------------------
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-[#f59e0b]" : "bg-[#d1d5db]"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Alert toggles stored in localStorage
// ---------------------------------------------------------------------------
const ALERT_STORAGE_KEY = "vdm_alert_toggles";

const DEFAULT_ALERTS = {
  notif10min: true,
  emailEscalade: true,
  whatsappEscalade: true,
  rapportHebdo: false,
};

type AlertToggles = typeof DEFAULT_ALERTS;

function loadAlertToggles(): AlertToggles {
  if (typeof window === "undefined") return DEFAULT_ALERTS;
  try {
    const raw = localStorage.getItem(ALERT_STORAGE_KEY);
    if (!raw) return DEFAULT_ALERTS;
    return { ...DEFAULT_ALERTS, ...JSON.parse(raw) } as AlertToggles;
  } catch {
    return DEFAULT_ALERTS;
  }
}

// ---------------------------------------------------------------------------
// Services assignataires card (bottom-left)
// ---------------------------------------------------------------------------
function ServicesCard() {
  const [responsibles, setResponsibles] = useState<ResolutionResponsible[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Create form state
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const data = await fetchResolutionResponsibles();
      setResponsibles(data.filter((r) => r.isActive));
    } catch {
      toast.error("Impossible de charger les services assignataires.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newFirst.trim() || !newLast.trim()) {
      toast.error("Prénom et nom sont requis.");
      return;
    }
    setCreating(true);
    try {
      const created = await createResolutionResponsible({
        firstName: newFirst.trim(),
        lastName: newLast.trim(),
        email: newEmail.trim() || undefined,
      });
      setResponsibles((prev) => [created, ...prev]);
      toast.success(`${created.firstName} ${created.lastName} ajouté.`);
      setNewFirst("");
      setNewLast("");
      setNewEmail("");
      setShowAddForm(false);
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "Impossible de créer le service.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (r: ResolutionResponsible) => {
    setEditingId(r.id);
    setEditFirst(r.firstName ?? "");
    setEditLast(r.lastName ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFirst("");
    setEditLast("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editFirst.trim() || !editLast.trim()) {
      toast.error("Prénom et nom sont requis.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateResolutionResponsible(editingId, {
        firstName: editFirst.trim(),
        lastName: editLast.trim(),
      });
      setResponsibles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(`${updated.firstName} ${updated.lastName} mis à jour.`);
      cancelEdit();
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "Impossible de modifier le service.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: ResolutionResponsible) => {
    setDeletingId(r.id);
    try {
      try {
        await deleteResolutionResponsible(r.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          await updateResolutionResponsible(r.id, { isActive: false });
        } else {
          throw err;
        }
      }
      setResponsibles((prev) => prev.filter((item) => item.id !== r.id));
      toast.success(`${r.firstName} ${r.lastName} supprimé.`);
      if (editingId === r.id) cancelEdit();
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "Impossible de supprimer le service.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#eee3d6] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
        <p className="text-sm font-semibold text-[#2b1d10]">Services assignataires</p>
        <button
          type="button"
          onClick={() => {
            setShowAddForm((v) => !v);
            setEditingId(null);
          }}
          className="inline-flex h-8 items-center rounded-[10px] bg-[#fdbf12] px-3 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#f4b400]"
        >
          + Ajouter
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Inline add form */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-[12px] border border-[#eee3d6] bg-[#fffaf5] px-4 py-3 space-y-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">
              Nouveau service
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newFirst}
                onChange={(e) => setNewFirst(e.target.value)}
                placeholder="Prénom *"
                required
                className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
              />
              <input
                type="text"
                value={newLast}
                onChange={(e) => setNewLast(e.target.value)}
                placeholder="Nom *"
                required
                className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
              />
            </div>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (optionnel)"
              className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-8 items-center rounded-[10px] bg-[#fdbf12] px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#f4b400] disabled:opacity-60"
              >
                {creating ? "Création..." : "Créer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewFirst("");
                  setNewLast("");
                  setNewEmail("");
                }}
                className="inline-flex h-8 items-center rounded-[10px] border border-[#d8cabc] bg-white px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#faf6f1]"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {loadingList ? (
          <p className="py-4 text-center text-sm text-[#6e6559]">Chargement...</p>
        ) : responsibles.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#6e6559]">
            Aucun service enregistré. Cliquez "+ Ajouter" pour en créer un.
          </p>
        ) : (
          <div className="space-y-2">
            {responsibles.map((r) =>
              editingId === r.id ? (
                <div
                  key={r.id}
                  className="rounded-[12px] border border-[#eee3d6] bg-[#fffaf5] px-4 py-3 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={editFirst}
                      onChange={(e) => setEditFirst(e.target.value)}
                      placeholder="Prénom *"
                      className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
                    />
                    <input
                      value={editLast}
                      onChange={(e) => setEditLast(e.target.value)}
                      placeholder="Nom *"
                      className="h-9 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="inline-flex h-8 items-center rounded-[10px] bg-[#fdbf12] px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#f4b400] disabled:opacity-60"
                    >
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      className="inline-flex h-8 items-center rounded-[10px] border border-[#d8cabc] bg-white px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#faf6f1] disabled:opacity-60"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-[#eee3d6] bg-white px-4 py-3"
                >
                  <span className="text-sm font-semibold text-[#2b1d10]">
                    {r.firstName} {r.lastName}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="inline-flex h-7 items-center rounded-[8px] border border-[#d8cabc] bg-white px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
                    >
                      Éditer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="inline-flex h-7 items-center rounded-[8px] border border-[#f0c2bb] bg-white px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b42318] transition hover:bg-[#fff3f2] disabled:opacity-60"
                    >
                      {deletingId === r.id ? "..." : "Suppr."}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts card (top-right)
// ---------------------------------------------------------------------------
function AlertsCard() {
  const [toggles, setToggles] = useState<AlertToggles>(DEFAULT_ALERTS);

  useEffect(() => {
    setToggles(loadAlertToggles());
  }, []);

  const flip = (key: keyof AlertToggles) => {
    setToggles((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const rows: { key: keyof AlertToggles; label: string }[] = [
    { key: "notif10min", label: "🔔 Notif. toutes les 10mn (non ouvert)" },
    { key: "emailEscalade", label: "📧 Email escalade après 2h" },
    { key: "whatsappEscalade", label: "💬 WhatsApp escalade après 2h" },
    { key: "rapportHebdo", label: "📊 Rapport hebdo auto (lundi 08h)" },
  ];

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#eee3d6] bg-white">
      <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
        <p className="text-sm font-semibold text-[#2b1d10]">Alertes &amp; Escalades</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Info box */}
        <div className="rounded-[12px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
          🌐 Règle automatique : Toutes les 10mn → alerte dashboard. Après 2h → Email + WhatsApp aux responsables.
        </div>

        {/* Toggle rows */}
        <div className="space-y-3">
          {rows.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#2b1d10]">{label}</span>
              <Toggle on={toggles[key]} onToggle={() => flip(key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow statuses card (bottom-right)
// ---------------------------------------------------------------------------
function WorkflowCard() {
  const entries = useMemo(
    () => Object.entries(statusLabels) as [string, { label: string; color: string }][],
    []
  );

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#eee3d6] bg-white">
      <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
        <p className="text-sm font-semibold text-[#2b1d10]">Statuts du workflow</p>
      </div>

      <div className="px-5 py-4">
        {/* Header row */}
        <div className="mb-2 grid grid-cols-[1fr_1fr] gap-4 px-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Statut</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">Label</span>
        </div>

        <div className="space-y-2">
          {entries.map(([key, { label, color }]) => (
            <div
              key={key}
              className="grid grid-cols-[1fr_1fr] items-center gap-4 rounded-[12px] border border-[#eee3d6] bg-white px-4 py-2.5"
            >
              <code className="rounded-[6px] bg-[#f3f5f8] px-2 py-0.5 font-mono text-[11px] text-[#7b6655]">
                {key}
              </code>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${color}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SuperAdminConfigurationPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de la configuration…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      user={user}
      title="Configuration"
      subtitle="SLA, alertes, services et workflow"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top-left: SLA par priorité (via SlaConfigurationManager which renders SlaConfigurationPanel + modal) */}
        <SlaConfigurationManager />

        {/* Top-right: Alertes & Escalades */}
        <AlertsCard />

        {/* Bottom-left: Services assignataires */}
        <ServicesCard />

        {/* Bottom-right: Statuts du workflow */}
        <WorkflowCard />
      </div>
    </DashboardShell>
  );
}
