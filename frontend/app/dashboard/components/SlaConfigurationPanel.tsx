"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { SlaPolicy, TicketPriority } from "@/api/types";
import type { ResolutionResponsible } from "@/api/resolution";
import { createResolutionResponsible, fetchResolutionResponsibles } from "@/api/resolution";
import { ApiError } from "@/api/client";
import { formatDuration, priorityLabels } from "@/app/dashboard/lib/ticket-formatters";

const SLA_PRIORITIES: TicketPriority[] = ["CRITICAL", "HIGH", "MEDIUM"];

type Props = {
  policies: SlaPolicy[];
  loading: boolean;
  error?: string | null;
  onEdit: (policy: SlaPolicy) => void;
};

export function SlaConfigurationPanel({ policies, loading, error, onEdit }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [isExternal, setIsExternal] = useState(false);
  const [responsibles, setResponsibles] = useState<ResolutionResponsible[]>([]);
  const [loadingResponsibles, setLoadingResponsibles] = useState(true);
  const [responsiblesError, setResponsiblesError] = useState<string | null>(null);
  const [creatingResponsible, setCreatingResponsible] = useState(false);
  const [responsibleStatus, setResponsibleStatus] = useState<string | null>(null);
  const [responsibleFormError, setResponsibleFormError] = useState<string | null>(null);

  const loadResponsibles = async () => {
    setLoadingResponsibles(true);
    setResponsiblesError(null);
    try {
      const data = await fetchResolutionResponsibles();
      setResponsibles(data);
    } catch {
      setResponsiblesError("Impossible de charger les responsables.");
    } finally {
      setLoadingResponsibles(false);
    }
  };

  useEffect(() => {
    void loadResponsibles();
  }, []);

  const displayPolicies: SlaPolicy[] = useMemo(() => {
    return SLA_PRIORITIES.map((priority) => {
      const existing = policies.find((policy) => policy.priority === priority);
      return (
        existing ?? {
          priority,
          responseMinutes: 0,
          resolutionMinutes: 0,
          isActive: false,
        }
      );
    });
  }, [policies]);

  const handleResponsibleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResponsibleStatus(null);
    setResponsibleFormError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setResponsibleFormError("Nom et prénom du responsable sont requis.");
      return;
    }

    setCreatingResponsible(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: role.trim() || undefined,
        isExternal,
      };
      const created = await createResolutionResponsible(payload);
      setResponsibles((prev) => [created, ...prev]);
      setResponsibleStatus(`Responsable ${created.firstName} ${created.lastName} ajouté.`);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setRole("");
      setIsExternal(false);
    } catch (error) {
      const message =
        error instanceof ApiError && error.message
          ? error.message
          : "Impossible de créer le responsable pour le moment.";
      setResponsibleFormError(message);
    } finally {
      setCreatingResponsible(false);
    }
  };

  const responsibleSummary = useMemo(() => {
    if (loadingResponsibles) {
      return "Chargement des responsables...";
    }
    const count = responsibles.length;
    if (count === 0) {
      return "Aucun responsable enregistré.";
    }
    return `${count} responsable${count > 1 ? "s" : ""} prêt${count > 1 ? "s" : ""} à recevoir les tickets.`;
  }, [loadingResponsibles, responsibles.length]);

  const formatResponsibleTimeline = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <section className="rounded-[24px] border border-[#e5e1dc] bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">
          SLA par priorité
        </p>
        <p className="text-sm text-[#2b1d10]">Ajustez les engagements de prise en charge et de résolution.</p>
      </div>
      <div className="mt-6 overflow-hidden rounded-[20px] border border-[#ebe6df] bg-[#f3f3f2]">
        <div className="grid grid-cols-1 gap-2 border-b border-[#ece7df] px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#9a928a] sm:grid-cols-[1.5fr_1fr_1fr] sm:gap-4 sm:px-6">
          <span>Priorité</span>
          <span className="sm:text-center">Prise en charge</span>
          <span className="sm:text-center">Résolution</span>
        </div>
        <div className="space-y-4 px-6 py-4">
          {loading ? (
            <div className="rounded-[14px] border border-[#e5e1dc] bg-white px-4 py-6 text-center text-sm text-[#6e6559] shadow-[0_6px_20px_rgba(15,20,10,0.08)]">
              Chargement des engagements...
            </div>
          ) : (
            displayPolicies.map((policy) => {
              const badge = priorityLabels[policy.priority];
              return (
                <div
                  key={policy.priority}
                  className="flex flex-col gap-3 rounded-[14px] bg-white px-4 py-4 text-sm text-[#2b1d10] shadow-[0_6px_20px_rgba(15,20,10,0.08)] sm:flex-row sm:items-center sm:py-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-8 w-16 items-center justify-center rounded-full text-[0.7rem] font-bold uppercase ${badge.tone}`}
                      >
                        {badge.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] ${
                          policy.isActive ? "bg-[#e6f5ec] text-[#1f6f3a]" : "bg-[#fde8e5] text-[#a42c1d]"
                        }`}
                      >
                        {policy.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-2 gap-4 text-sm font-semibold sm:grid-cols-2 sm:text-center">
                    <div className="flex flex-col gap-1 text-[#f73b35]">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#9a928a]">
                        Prise en charge
                      </span>
                      <span>{formatDuration(policy.responseMinutes)}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-[#434343]">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#9a928a]">
                        Résolution
                      </span>
                      <span>{formatDuration(policy.resolutionMinutes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end sm:justify-start">
                    <button
                      type="button"
                      onClick={() => onEdit(policy)}
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
          <p className="px-6 pb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#c42d1f]">{error}</p>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">Services assignataires</p>
          <p className="text-sm text-[#2b1d10]">
            Déclarez les équipes ou responsables qui pourront recevoir les tickets une fois envoyés par les admins.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="space-y-4 rounded-[20px] border border-[#ebe6df] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">Créer un service</p>
              <p className="text-sm text-[#2b1d10]">Ce formulaire permet de définir un nouveau responsable ou équipe de résolution.</p>
            </div>
            <form className="space-y-6" onSubmit={handleResponsibleCreate}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                  Prénom *
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Ex : Delphine"
                    className="rounded-lg border border-[#e4e1d8] bg-white px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                  Nom *
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Ex : Bernard"
                    className="rounded-lg border border-[#e4e1d8] bg-white px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="contact@vedem.com"
                    className="rounded-lg border border-[#e4e1d8] bg-white px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                  Téléphone
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="rounded-lg border border-[#e4e1d8] bg-white px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                Rôle ou responsabilité
                <input
                  type="text"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Ex : Responsable opérations"
                  className="rounded-lg border border-[#e4e1d8] bg-white px-3 py-2 text-sm text-[#2b1d10] outline-none transition focus:border-[#f0a31c]"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                <input
                  type="checkbox"
                  checked={isExternal}
                  onChange={(event) => setIsExternal(event.target.checked)}
                  className="h-4 w-4 rounded border border-[#dcd5ce] accent-[#f0c34c]"
                />
                Externe au groupe
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={creatingResponsible}
                  className="inline-flex items-center justify-center rounded-full bg-[#f0c34c] px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2b1d10] transition hover:bg-[#e0b242] disabled:opacity-60"
                >
                  {creatingResponsible ? "Création..." : "Créer le responsable"}
                </button>
                {responsibleFormError && (
                  <p className="text-sm text-[#c42d1f]">{responsibleFormError}</p>
                )}
                {responsibleStatus && (
                  <p className="text-sm text-[#2b1d10]">{responsibleStatus}</p>
                )}
              </div>
            </form>
          </article>

          <article className="rounded-[20px] border border-[#ebe6df] bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7c6f60]">Services déclarés</p>
                <p className="text-sm text-[#2b1d10]">{responsibleSummary}</p>
              </div>
              <span className="rounded-full border border-[#d6cfc5] px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-[#2b1d10]">
                {responsibles.length || 0}
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {loadingResponsibles ? (
                <p className="text-sm text-[#6e6559]">Chargement des responsables...</p>
              ) : responsiblesError ? (
                <p className="text-sm text-[#c42d1f]">{responsiblesError}</p>
              ) : responsibles.length === 0 ? (
                <p className="text-sm text-[#6e6559]">Ajoutez un responsable pour qu’il apparaisse ici.</p>
              ) : (
                responsibles.map((responsible) => (
                  <article
                    key={responsible.id}
                    className="rounded-[16px] border border-[#ebe6df] bg-[#fbfaf8] px-4 py-3 text-sm text-[#2b1d10]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[#2b1d10]">
                          {responsible.firstName} {responsible.lastName}
                        </h3>
                        {responsible.role && (
                          <p className="text-xs uppercase tracking-[0.2em] text-[#7c6f60]">{responsible.role}</p>
                        )}
                      </div>
                      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-[#7c6f60]">
                        {responsible.isExternal ? "Externe" : "Interne"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[0.75rem] text-[#4b3e32]">
                      {responsible.email && <span>Email: {responsible.email}</span>}
                      {responsible.phone && <span>Téléphone: {responsible.phone}</span>}
                    </div>
                    <p className="mt-2 text-[0.65rem] uppercase tracking-[0.2em] text-[#9a928a]">
                      Ajouté le {formatResponsibleTimeline(responsible.createdAt)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
