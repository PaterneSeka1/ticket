"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CategoryCreateForm } from "./CategoryCreateForm";
import { fetchCategories, updateCategory } from "@/api/tickets";
import type { TicketCategory, TicketType } from "@/api/types";
import { useIncidentTypes } from "@/app/dashboard/hooks/useIncidentTypes";

type EditableCategoryFields = {
  libelle: string;
  incidentTypeId: string;
  description: string;
  isActive: boolean;
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function getTypeLabel(type: TicketType) {
  return type === "INCIDENT" ? "Incident interne" : "Réclamation client";
}

function getTypeBadgeClass(type: TicketType) {
  return type === "INCIDENT"
    ? "bg-[#fff2df] text-[#b96d12]"
    : "bg-[#eaf6f0] text-[#1f7a58]";
}

function getStatusBadgeClass(isActive: boolean) {
  return isActive
    ? "bg-[#e8f5ec] text-[#257347]"
    : "bg-[#fdeaea] text-[#be3d33]";
}

interface CategoryManagementPanelProps {
  showCreateForm?: boolean;
}

export function CategoryManagementPanel({ showCreateForm = true }: CategoryManagementPanelProps) {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditableCategoryFields | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [categoryToDisable, setCategoryToDisable] = useState<TicketCategory | null>(null);
  const {
    incidentTypes,
    loading: loadingIncidentTypes,
    error: incidentTypesError,
  } = useIncidentTypes();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de charger les catégories."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const startEditing = (category: TicketCategory) => {
    setEditingId(category.id);
    setEditValues({
      libelle: category.libelle,
      incidentTypeId: category.incidentTypeId,
      description: category.description ?? "",
      isActive: category.isActive,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const handleUpdate = async () => {
    if (!editingId || !editValues) return;

    setIsActing(true);
    try {
      await updateCategory(editingId, {
        name: editValues.libelle.trim(),
        incidentTypeId: editValues.incidentTypeId,
        description: editValues.description.trim() || undefined,
        isActive: editValues.isActive,
      });
      toast.success("Catégorie mise à jour.");
      await loadCategories();
      cancelEditing();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de mettre à jour la catégorie."
      );
    } finally {
      setIsActing(false);
    }
  };

  const openDisableModal = (category: TicketCategory) => {
    setCategoryToDisable(category);
  };

  const closeDisableModal = () => {
    setCategoryToDisable(null);
  };

  const confirmDisableCategory = async () => {
    if (!categoryToDisable) return;

    setIsActing(true);
    try {
      await updateCategory(categoryToDisable.id, {
        name: categoryToDisable.libelle.trim(),
        incidentTypeId: categoryToDisable.incidentTypeId,
        description: categoryToDisable.description?.trim() || undefined,
        isActive: false,
      });
      toast.success("Catégorie désactivée.");
      await loadCategories();
      if (editingId === categoryToDisable.id) cancelEditing();
      closeDisableModal();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de désactiver la catégorie."
      );
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="space-y-4">
      {showCreateForm && <CategoryCreateForm onSuccess={loadCategories} />}

      <section className="rounded-[14px] border border-[#ebe6df] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(17,17,17,0.03)]">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f8b85]">
              Liste des catégories
            </p>
            <p className="mt-1 text-[11px] text-[#8a8176]">
              Activez, modifiez ou désactivez un libellé de ticket.
            </p>
          </div>

          <span className="rounded-full bg-[#f5f3ef] px-2.5 py-1 text-[10px] font-medium text-[#7d7469]">
            {loading ? "Chargement…" : `${categories.length} catégorie(s)`}
          </span>
        </header>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[12px] border border-[#f1ede8] bg-[#fcfbf9] px-4 py-4"
              >
                <div className="mb-2 h-4 w-40 animate-pulse rounded bg-[#efebe5]" />
                <div className="mb-2 h-3 w-28 animate-pulse rounded bg-[#f3efe9]" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-[#f3efe9]" />
              </div>
            ))}
          </div>
        ) : categories.length ? (
          <div className="space-y-3">
            {categories.map((category) => {
              const isEditing = editingId === category.id;

              return (
                <article
                  key={category.id}
                  className={cn(
                    "rounded-[12px] border px-4 py-4 transition",
                    isEditing
                      ? "border-[#ecd8b6] bg-[#fffdf8]"
                      : "border-[#f1ede8] bg-[#fcfbf9]"
                  )}
                >
                  {isEditing && editValues ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#241d16]">
                            Modifier la catégorie
                          </p>
                          <p className="text-[11px] text-[#8a8176]">
                            Mettez à jour les champs puis enregistrez.
                          </p>
                        </div>
                        <span className="rounded-full bg-[#fff3dd] px-2.5 py-1 text-[10px] font-semibold text-[#b26a0b]">
                          Édition
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f8b85]">
                            Libellé
                          </span>
                          <input
                            value={editValues.libelle}
                            onChange={(event) =>
                              setEditValues({
                                ...editValues,
                                libelle: event.target.value,
                              })
                            }
                            className="w-full rounded-[10px] border border-[#ded8d0] bg-white px-3 py-2.5 text-sm text-[#241d16] outline-none transition focus:border-[#e1b24f]"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f8b85]">
                            Type d’incident
                          </span>
                          <select
                            value={editValues.incidentTypeId}
                            onChange={(event) =>
                              setEditValues({
                                ...editValues,
                                incidentTypeId: event.target.value,
                              })
                            }
                            disabled={loadingIncidentTypes}
                            className="w-full rounded-[10px] border border-[#ded8d0] bg-white px-3 py-2.5 text-sm text-[#241d16] outline-none transition focus:border-[#e1b24f]"
                          >
                            <option value="" disabled>
                              {loadingIncidentTypes ? "Chargement..." : "Choisissez un type"}
                            </option>
                            {incidentTypes.map((incidentType) => (
                              <option key={incidentType.id} value={incidentType.id}>
                                {incidentType.name}
                              </option>
                            ))}
                          </select>
                          {incidentTypesError && (
                            <p className="text-[0.6rem] text-[#c42d1f]">{incidentTypesError}</p>
                          )}
                        </label>
                      </div>

                      <label className="block space-y-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f8b85]">
                          Description
                        </span>
                        <textarea
                          value={editValues.description}
                          onChange={(event) =>
                            setEditValues({
                              ...editValues,
                              description: event.target.value,
                            })
                          }
                          rows={3}
                          className="w-full rounded-[10px] border border-[#ded8d0] bg-white px-3 py-2.5 text-sm text-[#241d16] outline-none transition focus:border-[#e1b24f]"
                        />
                      </label>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#efeae3] bg-white px-3 py-3">
                        <div>
                          <p className="text-sm font-medium text-[#241d16]">
                            Activer la catégorie
                          </p>
                          <p className="text-[11px] text-[#8a8176]">
                            La catégorie sera disponible dans les tickets.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setEditValues({
                              ...editValues,
                              isActive: !editValues.isActive,
                            })
                          }
                          className={cn(
                            "relative h-7 w-14 rounded-full border transition",
                            editValues.isActive
                              ? "border-[#dfb14b] bg-[#f3d678]"
                              : "border-[#d8d2c9] bg-[#f2f1ee]"
                          )}
                          aria-pressed={editValues.isActive}
                        >
                          <span
                            className={cn(
                              "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition",
                              editValues.isActive ? "left-[31px]" : "left-[3px]"
                            )}
                          />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={handleUpdate}
                          className="rounded-[10px] bg-[#f4b227] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2b1d10] transition hover:brightness-105 disabled:opacity-50"
                        >
                          {isActing ? "Enregistrement…" : "Enregistrer"}
                        </button>

                        <button
                          type="button"
                          disabled={isActing}
                          onClick={cancelEditing}
                          className="rounded-[10px] border border-[#d9d3ca] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3e3127] transition hover:bg-[#faf8f5] disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-[#241d16]">
                            {category.libelle}
                          </h3>

                          <span
                            className={cn(
                              "rounded-full px-2 py-[4px] text-[10px] font-semibold",
                              getTypeBadgeClass(category.type)
                            )}
                          >
                            {getTypeLabel(category.type)}
                          </span>

                          <span
                            className={cn(
                              "rounded-full px-2 py-[4px] text-[10px] font-semibold",
                              getStatusBadgeClass(category.isActive)
                            )}
                          >
                            {category.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-2 text-[12px] leading-5 text-[#665c51]">
                          {category.description || "Aucune description fournie."}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(category)}
                          className="rounded-[10px] border border-[#d9d3ca] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2b1d10] transition hover:bg-[#faf8f5]"
                        >
                          Modifier
                        </button>

                        {category.isActive && (
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => openDisableModal(category)}
                            className="rounded-[10px] border border-[#efc9c6] bg-[#fff3f2] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#be3d33] transition hover:bg-[#ffeae8] disabled:opacity-50"
                          >
                            Désactiver
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-[#e6e0d8] bg-[#fcfbf9] px-4 py-8 text-center">
            <p className="text-sm text-[#665c51]">Aucune catégorie disponible.</p>
          </div>
        )}
      </section>

      {categoryToDisable && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-[14px] border border-[#ebe6df] bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c1463a]">
                  Désactivation
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[#241d16]">
                  {categoryToDisable.libelle}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeDisableModal}
                className="rounded-[10px] border border-[#ddd7ce] px-2.5 py-1 text-sm text-[#352b23] transition hover:bg-[#faf8f5]"
                aria-label="Fermer la confirmation"
              >
                ×
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#665c51]">
              Cette action masque la catégorie dans la sélection des tickets.
              Vous pourrez la réactiver plus tard en la modifiant.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDisableModal}
                className="rounded-[10px] border border-[#d9d3ca] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3e3127] transition hover:bg-[#faf8f5]"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmDisableCategory}
                disabled={isActing}
                className="rounded-[10px] bg-[#c74437] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#b2392d] disabled:opacity-50"
              >
                {isActing ? "Désactivation…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
