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
    <div className="space-y-6">
      <section
        id="sla"
        className="overflow-hidden rounded-[14px] border border-[#e8e1d8] bg-white shadow-[0_12px_30px_rgba(24,24,24,0.05)]"
      >
        <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
          <p className="text-[12px] font-semibold text-[#2f2f33]">SLA par priorité</p>
          <p className="mt-1 text-[12px] text-[#7b6655]">
            Ajustez les délais de prise en charge et de résolution.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_120px] gap-4 rounded-[12px] border border-[#eee3d6] bg-[#fffaf5] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765] md:grid">
            <span>Priorité</span>
            <span className="text-center">Prise en charge</span>
            <span className="text-center">Résolution</span>
            <span className="text-right">Action</span>
          </div>

          {loading ? (
            <div className="rounded-[12px] border border-[#eee3d6] bg-white px-4 py-6 text-center text-sm text-[#6e6559]">
              Chargement des engagements...
            </div>
          ) : (
            displayPolicies.map((policy) => {
              const badge = priorityLabels[policy.priority];
              return (
                <div
                  key={policy.priority}
                  className="rounded-[14px] border border-[#eee3d6] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(17,17,17,0.06)] md:px-4 md:py-3"
                >
                  <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_120px] md:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-8 w-16 items-center justify-center rounded-full text-[0.7rem] font-bold uppercase ${badge.tone}`}
                      >
                        {badge.label}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] ${
                          policy.isActive
                            ? "bg-[#e6f5ec] text-[#1f6f3a]"
                            : "bg-[#fde8e5] text-[#a42c1d]"
                        }`}
                      >
                        {policy.isActive ? "Actif" : "Désactivé"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between md:justify-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765] md:hidden">
                        Prise en charge
                      </span>
                      <span className="text-sm font-semibold text-[#2b1d10]">
                        {formatDuration(policy.responseMinutes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between md:justify-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765] md:hidden">
                        Résolution
                      </span>
                      <span className="text-sm font-semibold text-[#2b1d10]">
                        {formatDuration(policy.resolutionMinutes)}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onEdit(policy)}
                        className="inline-flex h-9 items-center rounded-[10px] border border-[#d8cabc] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#faf6f1]"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {error && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c42d1f]">
              {error}
            </p>
          )}
        </div>
      </section>

      <section
        id="assignataires"
        className="overflow-hidden rounded-[14px] border border-[#e8e1d8] bg-white shadow-[0_12px_30px_rgba(24,24,24,0.05)]"
      >
        <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
          <p className="text-[12px] font-semibold text-[#2f2f33]">Services assignataires</p>
          <p className="mt-1 text-[12px] text-[#7b6655]">
            Déclarez qui pourra être choisi lors de l’assignation d’un ticket.
          </p>
        </div>

        <div className="grid gap-6 px-5 py-5 lg:grid-cols-2 lg:items-start">
          <article className="rounded-[14px] border border-[#eee3d6] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b6655]">
              Ajouter un responsable
            </p>
            <p className="mt-1 text-[12px] text-[#5f4d3f]">
              Les admins pourront ensuite l’assigner depuis le détail d’un ticket.
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleResponsibleCreate}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
                    Prénom <span className="text-[#d92d20]">*</span>
                  </span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Ex : Delphine"
                    className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
                    Nom <span className="text-[#d92d20]">*</span>
                  </span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Ex : Bernard"
                    className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="contact@vedem.com"
                    className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
                    Téléphone
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
                  Rôle / responsabilité
                </span>
                <input
                  type="text"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Ex : Responsable opérations"
                  className="h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]"
                />
              </label>

              <label className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
                <input
                  type="checkbox"
                  checked={isExternal}
                  onChange={(event) => setIsExternal(event.target.checked)}
                  className="h-4 w-4 rounded border border-[#c6b6a9] accent-[#fdbf12]"
                />
                Externe au groupe
              </label>

              <div className="flex flex-col gap-2 border-t border-[#eef0f2] pt-4">
                <button
                  type="submit"
                  disabled={creatingResponsible}
                  className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#fdbf12] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] transition hover:bg-[#f4b400] disabled:opacity-60"
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

          <article className="rounded-[14px] border border-[#eee3d6] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b6655]">
                  Responsables déclarés
                </p>
                <p className="mt-1 text-[12px] text-[#5f4d3f]">{responsibleSummary}</p>
              </div>
              <span className="rounded-full border border-[#d6cfc5] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-[#2b1d10]">
                {responsibles.length || 0}
              </span>
            </div>

            <div className="mt-4 space-y-3">
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
                    className="rounded-[12px] border border-[#eee3d6] bg-[#fffaf5] px-4 py-3 text-sm text-[#2b1d10]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[#2b1d10]">
                          {responsible.firstName} {responsible.lastName}
                        </h3>
                        {responsible.role ? (
                          <p className="mt-1 text-[11px] text-[#7b6655]">{responsible.role}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7b6655]">
                        {responsible.isExternal ? "Externe" : "Interne"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[#5f4d3f]">
                      {responsible.email ? <span>Email: {responsible.email}</span> : null}
                      {responsible.phone ? <span>Téléphone: {responsible.phone}</span> : null}
                    </div>

                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b7765]">
                      Ajouté le {formatResponsibleTimeline(responsible.createdAt)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
