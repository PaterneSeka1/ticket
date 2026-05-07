"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ApiError } from "@/api/client";
import {
  createConcernedProduct,
  deleteConcernedProduct,
  fetchConcernedProducts,
  updateConcernedProduct,
} from "@/api/products";
import type { ConcernedProduct } from "@/api/types";

type ProductDraft = {
  name: string;
  description: string;
};

const emptyDraft: ProductDraft = {
  name: "",
  description: "",
};

export function ProductConfigurationManager() {
  const [products, setProducts] = useState<ConcernedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [editingProduct, setEditingProduct] = useState<ConcernedProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConcernedProducts();
      setProducts(data);
    } catch {
      setError("Impossible de charger les produits concernés.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingProduct(null);
  };

  const handleEdit = (product: ConcernedProduct) => {
    setEditingProduct(product);
    setDraft({
      name: product.name,
      description: product.description ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = draft.name.trim();
    const description = draft.description.trim();
    if (!name) {
      toast.error("Le nom du produit est requis.");
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        const updated = await updateConcernedProduct(editingProduct.id, {
          name,
          description,
        });
        setProducts((current) =>
          current.map((product) => (product.id === updated.id ? updated : product)),
        );
        toast.success("Produit mis à jour.");
      } else {
        const created = await createConcernedProduct({ name, description });
        setProducts((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast.success("Produit ajouté.");
      }
      resetDraft();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Impossible d’enregistrer le produit.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: ConcernedProduct) => {
    const confirmed = window.confirm(`Supprimer le produit "${product.name}" ?`);
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      await deleteConcernedProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (editingProduct?.id === product.id) {
        resetDraft();
      }
      toast.success("Produit supprimé.");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Impossible de supprimer le produit.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section
      id="produits"
      className="rounded-[18px] border border-[#eee3d6] bg-white p-5 shadow-[0_12px_30px_rgba(24,24,24,0.05)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b87731]">
            Produits concernés
          </p>
          <p className="mt-1 text-sm text-[#5f4d3f]">
            {products.length} produit(s) disponible(s) pour les réclamations client.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <label>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
            Nom du produit
          </span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ex: Portail client"
            className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition placeholder:text-[#a89b8e] focus:border-[#d5a15c]"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
            Description
          </span>
          <input
            type="text"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Optionnel"
            className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition placeholder:text-[#a89b8e] focus:border-[#d5a15c]"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#fdbf12] px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#2b1d10] transition hover:bg-[#f4b400] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingProduct ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{saving ? "Enregistrement..." : editingProduct ? "Enregistrer" : "Ajouter"}</span>
          </button>

          {editingProduct ? (
            <button
              type="button"
              onClick={resetDraft}
              title="Annuler la modification"
              aria-label="Annuler la modification du produit"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-[#d8dce2] bg-white text-[#6b7280] transition hover:bg-[#fafafa]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-5 overflow-hidden rounded-[8px] border border-[#e5e7eb]">
        {loading ? (
          <p className="px-4 py-6 text-sm text-[#7a695a]">Chargement des produits…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm font-medium text-[#b42318]">{error}</p>
        ) : products.length ? (
          products.map((product) => (
            <div
              key={product.id}
              className="flex min-h-12 items-center justify-between gap-3 border-t border-[#eef0f2] px-4 py-3 first:border-t-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2b1d10]">{product.name}</p>
                {product.description ? (
                  <p className="truncate text-xs text-[#7a695a]">{product.description}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleEdit(product)}
                  title="Modifier le produit"
                  aria-label={`Modifier ${product.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#4b5563] transition hover:bg-[#f3f4f6]"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(product)}
                  disabled={deletingId === product.id}
                  title="Supprimer le produit"
                  aria-label={`Supprimer ${product.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#b42318] transition hover:bg-[#fff1ef] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-sm text-[#7a695a]">Aucun produit configuré.</p>
        )}
      </div>
    </section>
  );
}
