"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { createCategory } from "@/api/tickets";
import type { CreateCategoryPayload } from "@/api/tickets";
import { useServiceTypes } from "@/app/dashboard/hooks/useServiceTypes";

interface CategoryCreateFormProps {
  onSuccess?: () => void;
}

export function CategoryCreateForm({ onSuccess }: CategoryCreateFormProps) {
  const [libelle, setLibelle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState("");
  const { serviceTypes, loading: loadingServiceTypes, error: serviceTypesError } =
    useServiceTypes();
  const currentServiceTypeId = selectedServiceTypeId || serviceTypes[0]?.id || "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    toast.dismiss();

    const payload: CreateCategoryPayload = {
      name: libelle.trim(),
      serviceTypeId: currentServiceTypeId,
      description: description.trim() || undefined,
      isActive,
    };

    try {
      await createCategory(payload);
      setStatus("idle");
      toast.success("Catégorie créée avec succès.");
      setLibelle("");
      setDescription("");
      setIsActive(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setStatus("error");
      toast.error(err instanceof Error ? err.message : "Impossible de créer la catégorie.");
    }
  };

  return (
    <form
      className="space-y-6 rounded-[32px] border border-[#f0d7c6] bg-white/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.05)]"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b86112]">Créer une catégorie</p>
        <p className="text-sm text-[#6b5446]">Ajoutez un libellé qui sera disponible pour les tickets.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
          Libellé *
          <input
            value={libelle}
            onChange={(event) => setLibelle(event.target.value)}
            required
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          />
        </label>
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
          Domaine de service *
          <select
            value={currentServiceTypeId}
            onChange={(event) => setSelectedServiceTypeId(event.target.value)}
            disabled={loadingServiceTypes}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
            required
          >
            <option value="" disabled>
              {loadingServiceTypes ? "Chargement..." : "Sélectionnez un domaine"}
            </option>
            {serviceTypes.map((serviceType) => (
              <option key={serviceType.id} value={serviceType.id}>
                {serviceType.name}
              </option>
            ))}
          </select>
          {serviceTypesError && (
            <p className="text-[0.6rem] text-[#c42d1f]">{serviceTypesError}</p>
          )}
        </label>
      </div>
      <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
        />
      </label>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="category-active"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 rounded border border-[#e2dbd1]"
        />
        <label htmlFor="category-active" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
          Activer la catégorie
        </label>
      </div>
      <button
        type="submit"
        disabled={
          status === "loading" ||
          loadingServiceTypes ||
          !currentServiceTypeId
        }
        className="rounded-full bg-gradient-to-r from-[#d9731d] to-[#bb5b0f] px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_15px_40px_rgba(217,115,29,0.35)] disabled:opacity-60"
      >
        {status === "loading" ? "En cours..." : "Créer la catégorie"}
      </button>
    </form>
  );
}
