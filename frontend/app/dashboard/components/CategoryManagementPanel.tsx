"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CategoryCreateForm } from "./CategoryCreateForm";
import { deleteCategory, fetchCategories, updateCategory } from "@/api/tickets";
import type { TicketCategory, TicketType } from "@/api/types";

const ticketTypeOptions: TicketType[] = ["INCIDENT", "DEMANDE"];

export function CategoryManagementPanel() {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Omit<TicketCategory, "id"> | null>(null);
  const [isActing, setIsActing] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les catégories.");
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
      type: category.type,
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
        libelle: editValues.libelle.trim(),
        type: editValues.type,
        description: editValues.description.trim() || undefined,
        isActive: editValues.isActive,
      });
      toast.success("Catégorie mise à jour.");
      await loadCategories();
      cancelEditing();
    } catch (err) {
    toast.error(err instanceof Error ? err.message : "Impossible de mettre à jour la catégorie.");
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette catégorie ?")) {
      return;
    }
    setIsActing(true);
    try {
      await deleteCategory(id);
      toast.success("Catégorie supprimée.");
      await loadCategories();
      if (editingId === id) cancelEditing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de supprimer la catégorie.");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="space-y-8">
      <CategoryCreateForm onSuccess={loadCategories} />
      <div className="space-y-4 rounded-[32px] border border-[#f0d7c6] bg-white/70 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.04)]">
        <header className="border-b border-[#f1e6dd] pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112]">Liste des catégories</p>
          <p className="text-sm text-[#6b5446]">Activez, modifiez ou supprimez un libellé de ticket.</p>
        </header>
        {loading && <p className="text-sm text-[#6b5446]">Chargement des catégories…</p>}
        <div className="space-y-4">
          {categories.map((category) => {
            const isEditing = editingId === category.id;
            return (
              <div key={category.id} className="rounded-[20px] border border-[#f1e6dd] bg-[#fffdf7] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                {isEditing && editValues ? (
                  <div className="space-y-3">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                        Libellé
                        <input
                          value={editValues.libelle}
                          onChange={(event) => setEditValues({ ...editValues, libelle: event.target.value })}
                          className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                        />
                      </label>
                      <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                        Type
                        <select
                          value={editValues.type}
                          onChange={(event) => setEditValues({ ...editValues, type: event.target.value as TicketType })}
                          className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                        >
                          {ticketTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option === "INCIDENT" ? "Incident interne" : "Réclamation client"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                      Description
                      <textarea
                        value={editValues.description}
                        onChange={(event) => setEditValues({ ...editValues, description: event.target.value })}
                        rows={3}
                        className="w-full rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                      />
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                        <input
                          type="checkbox"
                          checked={editValues.isActive}
                          onChange={(event) => setEditValues({ ...editValues, isActive: event.target.checked })}
                          className="h-4 w-4 rounded border border-[#e2dbd1]"
                        />
                        Activer la catégorie
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={handleUpdate}
                        className="rounded-full bg-gradient-to-r from-[#d9731d] to-[#bb5b0f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
                      >
                        {isActing ? "Enregistrement…" : "Enregistrer"}
                      </button>
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={cancelEditing}
                        className="rounded-full border border-[#c6b6a9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2b1d10]"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#2b1d10]">{category.libelle}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#6b5446]">
                          {category.type === "INCIDENT" ? "Incident interne" : "Réclamation client"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(category)}
                          className="rounded-full border border-[#d6c5b4] px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#2b1d10]"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleDelete(category.id)}
                          className="rounded-full border border-[#c42d1f] bg-[#c42d1f]/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#c42d1f]"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#6b5446]">{category.description || "Aucune description fournie."}</p>
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${
                        category.isActive ? "bg-[#e6f4ed] text-[#1f6f3a]" : "bg-[#fde8e7] text-[#c42d1f]"
                      }`}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!categories.length && !loading && <p className="text-sm text-[#6b5446]">Aucune catégorie disponible.</p>}
      </div>
    </div>
  );
}
