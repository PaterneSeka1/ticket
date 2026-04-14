"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { createCategory } from "@/api/tickets";
import type { TicketType } from "@/api/types";
import { useIncidentTypes } from "@/app/dashboard/hooks/useIncidentTypes";

const ticketTypes: Array<{ id: TicketType; label: string; description: string }> = [
  {
    id: "INCIDENT",
    label: "Incident",
    description: "Catégorie liée aux incidents internes et technologiques.",
  },
  {
    id: "DEMANDE",
    label: "Réclamation / demande",
    description: "Catégorie utilisée pour les demandes orientées client ou métier.",
  },
];

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export default function SuperAdminCategoryCreatePage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();
  const [name, setName] = useState("");
  const [type, setType] = useState<TicketType>("INCIDENT");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIncidentTypeId, setSelectedIncidentTypeId] = useState("");
  const {
    incidentTypes,
    loading: loadingIncidentTypes,
    error: incidentTypesError,
  } = useIncidentTypes();
  const findIncidentTypeId = useCallback(
    (ticketType: TicketType) => {
      const incidentType = incidentTypes.find((item) =>
        ticketType === "INCIDENT" ? item.scope === "INTERNE" : item.scope === "EXTERNE",
      );
      return incidentType?.id ?? "";
    },
    [incidentTypes],
  );

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  useEffect(() => {
    if (!selectedIncidentTypeId) {
      setSelectedIncidentTypeId(findIncidentTypeId(type));
    }
  }, [findIncidentTypeId, selectedIncidentTypeId, type]);

  const isSubmitDisabled =
    isSubmitting ||
    !name.trim() ||
    !selectedIncidentTypeId ||
    loadingIncidentTypes;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;
    setIsSubmitting(true);
    try {
      await createCategory({
        name: name.trim(),
        incidentTypeId: selectedIncidentTypeId,
        description: description.trim() || undefined,
        isActive,
      });
      toast.success("Catégorie créée avec succès.");
      router.replace("/dashboard/super-admin/categories");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de créer la catégorie.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation de la création de catégorie…</p>
        </div>
      </div>
    );
  }

  const labelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]";
  const inputClass =
    "h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition placeholder:text-[#a89b8e] focus:border-[#d5a15c]";
  const textareaClass =
    "w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#2b1d10] outline-none transition placeholder:text-[#a89b8e] focus:border-[#d5a15c]";

  return (
    <DashboardShell
      user={user}
      title="Créer une catégorie"
      subtitle="Ajoutez un libellé qui sera disponible lors de la création d’un ticket."
    >
      <section className="overflow-hidden rounded-[14px] border border-[#e8e1d8] bg-white shadow-[0_12px_30px_rgba(24,24,24,0.05)]">
        <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
          <p className="text-[12px] font-semibold text-[#2f2f33]">Création de catégorie</p>
        </div>

        <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
          <div>
            <p className={labelClass}>
              Type de catégorie <span className="text-[#d92d20]">*</span>
            </p>
            <p className="text-[12px] text-[#7b6655]">
              {ticketTypes.find((item) => item.id === type)?.description ?? "Choisissez l’orientation des tickets associés."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ticketTypes.map((option) => {
                const selected = type === option.id;
                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => {
                      setType(option.id);
                      setSelectedIncidentTypeId(findIncidentTypeId(option.id));
                    }}
                    className={cn(
                      "inline-flex h-9 items-center rounded-[8px] border px-4 text-[11px] font-semibold uppercase tracking-[0.04em] transition",
                      selected
                        ? "border-[#d8dce2] bg-[#e9edf3] text-[#364152]"
                        : "border-[#e3e5e8] bg-white text-[#4f4f55] hover:bg-[#fafafa]",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {incidentTypesError && (
              <p className="mt-2 text-xs text-[#c42d1f]">{incidentTypesError}</p>
            )}
          </div>

          <label>
            <span className={labelClass}>
              Libellé <span className="text-[#d92d20]">*</span>
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Nom de la catégorie (ex. Application mobile)"
              required
            />
          </label>

          <label>
            <span className={labelClass}>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={textareaClass}
              placeholder="Expliquez à quoi sert cette catégorie."
            />
          </label>

          <div className="flex items-center justify-between rounded-[12px] border border-[#e7ddd2] bg-[#fffaf5] px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
                Catégorie active
              </p>
              <p className="text-[12px] text-[#7b6655]">
                Les tickets peuvent être associés immédiatement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((prev) => !prev)}
              className={cn(
                "h-6 w-12 rounded-full border transition",
                isActive ? "border-[#f0b429] bg-[#f8de6f]" : "border-[#c6c0b6] bg-white",
              )}
              aria-pressed={isActive}
            >
              <span
                className={cn(
                  "block h-full w-5 rounded-full bg-white transition",
                  isActive ? "translate-x-[1.5rem]" : "translate-x-[0.25rem]",
                )}
              />
            </button>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef0f2] pt-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setName("");
                setDescription("");
                setType("INCIDENT");
                setIsActive(true);
                setSelectedIncidentTypeId(findIncidentTypeId("INCIDENT"));
              }}
              className="inline-flex h-10 items-center rounded-[8px] border border-[#d8dce2] bg-white px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#fafafa] disabled:opacity-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={cn(
                "inline-flex h-10 items-center rounded-[8px] px-4 text-[11px] font-semibold text-[#2b1d10] transition",
                isSubmitDisabled
                  ? "cursor-not-allowed bg-[#ffe6a6] opacity-60"
                  : "bg-[#fdbf12] hover:bg-[#f4b400]",
              )}
            >
              {isSubmitting ? "Création…" : "Créer la catégorie"}
            </button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}
