"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/components/DashboardShell";
import { useCurrentUser } from "@/app/dashboard/hooks/useCurrentUser";
import { getRedirectRouteForRole } from "@/app/dashboard/lib/api";
import { createCategory } from "@/api/tickets";
import type { TicketType } from "@/api/types";

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

  useEffect(() => {
    if (status !== "ready" || !user) return;
    if (user.role !== "SUPER_ADMIN") {
      router.replace(getRedirectRouteForRole(user.role));
    }
  }, [router, status, user]);

  const typeCardClasses = (cardType: TicketType) =>
    cn(
      "rounded-[14px] border px-3 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition",
      type === cardType ? "border-[#f3b342] bg-[#fff7df]" : "border-[#ede9e0] bg-white",
    );

  const isSubmitDisabled = isSubmitting || !name.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;
    setIsSubmitting(true);
    try {
      await createCategory({
        libelle: name.trim(),
        type,
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

  return (
    <DashboardShell
      user={user}
      title="Créer une catégorie"
      subtitle="Même style que la création d’un ticket, mais pour la gestion des catégories."
    >
      <div className="space-y-5">
        <section className="rounded-[16px] border border-[#e0dbd4] bg-white p-4 shadow-[0_0_20px_rgba(0,0,0,0.05)]">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">Type de catégorie</p>
            <p className="text-sm text-[#2b1d10]">Choisissez l’orientation des tickets associés.</p>
          </header>
          <div className="grid gap-3 md:grid-cols-2">
            {ticketTypes.map((option) => (
              <button
                type="button"
                key={option.id}
                className={typeCardClasses(option.id)}
                onClick={() => setType(option.id)}
              >
                <p className="text-lg font-semibold text-[#2b1d10]">{option.label}</p>
                <p className="mt-2 text-sm text-[#5c554b]">{option.description}</p>
              </button>
            ))}
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="rounded-[16px] border border-[#e0dbd4] bg-white p-4 shadow-[0_0_20px_rgba(0,0,0,0.05)] space-y-4"
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a6f5f]">Libellé</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-[12px] border border-[#d6d2c8] bg-[#fdfdfd] px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
              placeholder="Nom de la catégorie (ex. Application mobile)"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a6f5f]">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-[12px] border border-[#d6d2c8] bg-[#fdfdfd] px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
              placeholder="Expliquez à quoi sert cette catégorie."
            />
          </div>

          <div className="flex items-center justify-between rounded-[18px] border border-[#ede9e0] bg-[#f9f7f2] px-5 py-3">
            <div>
              <p className="text-sm font-semibold text-[#2b1d10]">Activer la catégorie</p>
              <p className="text-xs uppercase tracking-[0.3em] text-[#8a8373]">Les tickets peuvent être associés immédiatement.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((prev) => !prev)}
              className={`h-6 w-12 rounded-full border transition ${isActive ? "border-[#f0b429] bg-[#f8de6f]" : "border-[#c6c0b6] bg-white"}`}
              aria-pressed={isActive}
            >
              <span
                className={`block h-full w-5 rounded-full bg-white transition ${isActive ? "translate-x-[1.5rem]" : "translate-x-[0.25rem]"}`}
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 rounded-[12px] border border-transparent bg-[#f0c34c] px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#2b1d10] transition disabled:opacity-50"
            >
              {isSubmitting ? "Création…" : "Créer la catégorie"}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setName("");
                setDescription("");
                setType("INCIDENT");
                setIsActive(true);
              }}
              className="flex-1 rounded-[12px] border border-[#d6d2c8] bg-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#4b3e32] transition disabled:opacity-50"
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
