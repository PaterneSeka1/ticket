"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../components/DashboardShell";
import { getRedirectRouteForRole } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { PageSkeleton } from "../../components/PageSkeleton";
import { CategoryManagementPanel } from "../../components/CategoryManagementPanel";
import { createCategory } from "@/api/tickets";
import type { TicketType } from "@/api/types";
import { useServiceTypes } from "@/app/dashboard/hooks/useServiceTypes";

const ticketTypes: Array<{ id: TicketType; label: string; description: string }> = [
  {
    id: "INTERNE",
    label: "Demande interne",
    description: "Catégorie liée aux demandes internes et opérationnelles.",
  },
  {
    id: "DEMANDE",
    label: "Réclamation / demande",
    description: "Catégorie utilisée pour les demandes orientées client ou métier.",
  },
];

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function SuperAdminCategoriesPage() {
  const router = useRouter();
  const { user, status } = useCurrentUser();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [name, setName] = useState("");
  const [type, setType] = useState<TicketType>("INTERNE");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState("");
  const {
    serviceTypes,
    loading: loadingServiceTypes,
    error: serviceTypesError,
  } = useServiceTypes();

  const findServiceTypeId = useCallback(
    (ticketType: TicketType) => {
      const serviceType = serviceTypes.find((item) =>
        ticketType === "INTERNE" ? item.scope === "INTERNE" : item.scope === "EXTERNE",
      );
      return serviceType?.id ?? "";
    },
    [serviceTypes],
  );

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  useEffect(() => {
    if (!selectedServiceTypeId) {
      setSelectedServiceTypeId(findServiceTypeId(type));
    }
  }, [findServiceTypeId, selectedServiceTypeId, type]);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setType("INTERNE");
    setIsActive(true);
    setSelectedServiceTypeId(findServiceTypeId("INTERNE"));
  }, [findServiceTypeId]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const isSubmitDisabled =
    isSubmitting || !name.trim() || !selectedServiceTypeId || loadingServiceTypes;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;
    setIsSubmitting(true);
    try {
      await createCategory({
        name: name.trim(),
        serviceTypeId: selectedServiceTypeId,
        description: description.trim() || undefined,
        isActive,
      });
      toast.success("Catégorie créée avec succès.");
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de créer la catégorie.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready" || !user) {
    return <PageSkeleton message="Préparation de la gestion des catégories…" />;
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
      title="Catégories – Super-admin"
      subtitle="Animez la stratégie des catégories à l'échelle du groupe."
    >
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-10 items-center rounded-[10px] bg-[#fdbf12] px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#f4b400]"
        >
          + Créer une catégorie
        </button>
      </div>

      <CategoryManagementPanel key={refreshKey} showCreateForm={false} />

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-[14px] border border-[#e8e1d8] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between rounded-t-[14px] border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
              <div>
                <p className="text-[12px] font-semibold text-[#2f2f33]">Nouvelle catégorie</p>
                <p className="text-[11px] text-[#8a8176]">
                  Ajoutez un libellé disponible lors de la création d'un ticket.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-[8px] border border-[#ddd7ce] px-2.5 py-1 text-sm text-[#352b23] transition hover:bg-[#faf8f5] disabled:opacity-50"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
              <div>
                <p className={labelClass}>
                  Type de catégorie <span className="text-[#d92d20]">*</span>
                </p>
                <p className="text-[12px] text-[#7b6655]">
                  {ticketTypes.find((item) => item.id === type)?.description ??
                    "Choisissez l'orientation des tickets associés."}
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
                          setSelectedServiceTypeId(findServiceTypeId(option.id));
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
                {serviceTypesError && (
                  <p className="mt-2 text-xs text-[#c42d1f]">{serviceTypesError}</p>
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
                  onClick={closeModal}
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
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
