"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { createTicket, fetchCategories } from "@/api/tickets";
import type { CreateTicketPayload } from "@/api/tickets";
import type { TicketCategory, TicketPriority, TicketType } from "@/api/types";
import { useCurrentUser } from "../hooks/useCurrentUser";

const incidentTypes = [
  { id: "INTERNE", label: "Incident interne" },
  { id: "CLIENT", label: "Réclamation client" },
];

const priorityLevels = [
  { id: "P1", label: "P1 – Critique", tone: "border-[#c42d1f] bg-[#c42d1f]/10 text-[#c42d1f]" },
  { id: "P2", label: "P2 – Majeur", tone: "border-[#f2a90f] bg-[#f2a90f]/10 text-[#f2a90f]" },
  { id: "P3", label: "P3 – Mineur", tone: "border-[#21a166] bg-[#21a166]/10 text-[#21a166]" },
];

const productOptions = ["Plateforme 360", "Portail client", "API interne", "Application mobile"];

type IncidentSelection = "INTERNE" | "CLIENT";
const incidentTypeMap: Record<IncidentSelection, TicketType> = {
  INTERNE: "INCIDENT",
  CLIENT: "DEMANDE",
};

const priorityMap: Record<string, TicketPriority> = {
  P1: "CRITIQUE",
  P2: "HAUT",
  P3: "MOYEN",
};

export default function NewTicketPage() {
  const { user, status } = useCurrentUser();
  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentSelection>(
    incidentTypes[0].id as IncidentSelection,
  );
  const [selectedPriority, setSelectedPriority] = useState(priorityLevels[1].id);
  const now = new Date();
  const initialDate = now.toISOString().slice(0, 10);
  const initialTime = now.toISOString().slice(11, 16);
  const [detectionDate, setDetectionDate] = useState(initialDate);
  const [detectionTime, setDetectionTime] = useState(initialTime);
  const [description, setDescription] = useState("");
  const [serviceDirection, setServiceDirection] = useState("Direction des Services Informatiques");
  const [clientName, setClientName] = useState("");
  const [product, setProduct] = useState("");
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [categoryStatus, setCategoryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedInternalCategoryId, setSelectedInternalCategoryId] = useState<string>();
  const [selectedReclamationCategoryId, setSelectedReclamationCategoryId] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    setCategoryStatus("loading");
    fetchCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
        setCategoryStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setCategoryStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const incidentCategories = useMemo(
    () => categories.filter((category) => category.type === "INCIDENT" && category.isActive),
    [categories],
  );
  const reclamationCategories = useMemo(
    () => categories.filter((category) => category.type === "DEMANDE" && category.isActive),
    [categories],
  );

  useEffect(() => {
    if (incidentCategories.length && !selectedInternalCategoryId) {
      setSelectedInternalCategoryId(incidentCategories[0].id);
    }
  }, [incidentCategories, selectedInternalCategoryId]);

  useEffect(() => {
    if (reclamationCategories.length && !selectedReclamationCategoryId) {
      setSelectedReclamationCategoryId(reclamationCategories[0].id);
    }
  }, [reclamationCategories, selectedReclamationCategoryId]);

  useEffect(() => {
    if (selectedIncidentType === "INTERNE") {
      setClientName("");
      setProduct("");
    }
  }, [selectedIncidentType]);

  const ticketId = useMemo(() => `TK-${Math.floor(100 + Math.random() * 900)}`, []);
  const ticketType = incidentTypeMap[selectedIncidentType];
  const selectedCategoryId = ticketType === "INCIDENT" ? selectedInternalCategoryId : selectedReclamationCategoryId;

  const detectedAt = useMemo(() => {
    if (!detectionDate || !detectionTime) return undefined;
    const parsed = new Date(`${detectionDate}T${detectionTime}`);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toISOString();
  }, [detectionDate, detectionTime]);

  const isSubmitDisabled =
    isSubmitting || !selectedCategoryId || categoryStatus === "loading" || categoryStatus === "error";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCategoryId || !user) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload: CreateTicketPayload = {
        type: ticketType,
        priority: priorityMap[selectedPriority],
        categoryId: selectedCategoryId,
        description,
        assignedService: user.service ?? undefined,
        detectedAt,
      };
      if (selectedIncidentType === "CLIENT") {
        if (clientName.trim()) {
          payload.clientName = clientName.trim();
        }
        if (product) {
          payload.product = product;
        }
      }
      await createTicket(payload);
      setFeedback({ type: "success", message: "Ticket créé avec succès." });
      setDescription("");
      setClientName("");
      setProduct("");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Impossible de créer le ticket.";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">Préparation du formulaire de ticket…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff8ef] via-[#fff1e6] to-[#f2e1d0] text-[#2b1d10]">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:px-10">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112]">
            Formulaire de déclaration d’incident
          </p>
          <h1 className="text-3xl font-semibold">Nouveau ticket</h1>
          <p className="text-sm text-[#6b5446]">Déclarez un incident ou une réclamation client en quelques étapes.</p>
        </header>

        <section className="space-y-6 rounded-[32px] border border-[#f0d7c6] bg-[#fffdf7] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#b86112]">Nouvelle déclaration</p>
            <p className="text-sm text-[#6b5446]">Fiche d’incident structurée pour la DSI et la relation client.</p>
          </div>
          {feedback && (
            <div
              className={`rounded-[20px] border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] ${
                feedback.type === "success"
                  ? "bg-[#e6f4ed] text-[#1f6f3a] border-[#b3e0c9]"
                  : "bg-[#fde8e7] text-[#c42d1f] border-[#f9c1bf]"
              }`}
            >
              {feedback.message}
            </div>
          )}
          <form className="space-y-6 text-[#2b1d10]" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                ID TICKET (AUTO)
                <input
                  type="text"
                  value={ticketId}
                  readOnly
                  className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm font-semibold text-[#2b1d10] opacity-60"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                DATE DE DÉTECTION *
                <input
                  type="date"
                  value={detectionDate}
                  onChange={(event) => setDetectionDate(event.target.value)}
                  className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                HEURE DE DÉTECTION *
                <input
                  type="time"
                  value={detectionTime}
                  onChange={(event) => setDetectionTime(event.target.value)}
                  className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                NOM DU DEMANDEUR *
                <input
                  type="text"
                  value={`${user.prenom} ${user.nom}`}
                  readOnly
                  className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10] opacity-70"
                />
              </label>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                MATRICULE
                <input
                  type="text"
                  value={user.matricule}
                  readOnly
                  className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10] opacity-70"
                />
              </label>
            </div>

            <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
              SERVICE / DIRECTION *
              <input
                type="text"
                value={serviceDirection}
                onChange={(event) => setServiceDirection(event.target.value)}
                className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
              />
            </label>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6b5446]">TYPE D’INCIDENT *</p>
              <div className="flex flex-wrap gap-3">
                {incidentTypes.map((type) => {
                  const selected = selectedIncidentType === type.id;
                  return (
                    <button
                      type="button"
                      key={type.id}
                      onClick={() => setSelectedIncidentType(type.id)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                        selected
                          ? "border-[#2b1d10] bg-[#2b1d10] text-white"
                          : "border-[#cdc4ba] bg-white text-[#2b1d10]"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

          {selectedIncidentType === "INTERNE" ? (
            <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
              CATÉGORIE INTERNE *
              <select
                value={selectedInternalCategoryId ?? ""}
                onChange={(event) => setSelectedInternalCategoryId(event.target.value)}
                disabled={categoryStatus !== "idle" || incidentCategories.length === 0}
                className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
              >
                <option value="" disabled>
                  {categoryStatus === "loading"
                    ? "Chargement…"
                    : categoryStatus === "error"
                    ? "Impossible de charger les catégories"
                    : incidentCategories.length
                    ? "-- Sélectionner --"
                    : "Aucune catégorie disponible"}
                </option>
                {incidentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.libelle}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                  NOM DU CLIENT *
                  <input
                    type="text"
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Entreprise cliente"
                    className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                  />
                </label>
                <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                  PRODUIT CONCERNÉ *
                  <select
                    value={product}
                    onChange={(event) => setProduct(event.target.value)}
                    className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                  >
                    <option value="">-- Sélectionner --</option>
                    {productOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
                NATURE DE LA RÉCLAMATION *
                <select
                  value={selectedReclamationCategoryId ?? ""}
                  onChange={(event) => setSelectedReclamationCategoryId(event.target.value)}
                  disabled={categoryStatus !== "idle" || reclamationCategories.length === 0}
                  className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                >
                  <option value="" disabled>
                    {categoryStatus === "loading"
                      ? "Chargement…"
                      : categoryStatus === "error"
                      ? "Impossible de charger les catégories"
                      : reclamationCategories.length
                      ? "-- Sélectionner --"
                      : "Aucune catégorie disponible"}
                  </option>
                  {reclamationCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.libelle}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6b5446]">NIVEAU DE PRIORITÉ *</p>
            <div className="flex flex-wrap gap-3">
              {priorityLevels.map((level) => {
                const selected = selectedPriority === level.id;
                return (
                  <button
                    type="button"
                    key={level.id}
                    onClick={() => setSelectedPriority(level.id)}
                    className={`rounded-[18px] border px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${selected ? level.tone : "border-[#cdc4ba] bg-white text-[#2b1d10]"}`}
                  >
                    {level.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
            DESCRIPTION DÉTAILLÉE *
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Décrivez l'incident. Incluez messages d'erreur, logs, étapes de reproduction…"
              className="w-full rounded-[18px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
            />
          </label>

          <div className="rounded-[18px] border border-dashed border-[#d3c7ba] bg-[#fffaf5] px-5 py-8 text-center text-sm font-semibold uppercase tracking-[0.3em] text-[#7a6b5d]">
            <p>Glissez un fichier ou <span className="text-[#d9731d]">cliquez pour parcourir</span></p>
            <p className="text-xs font-normal uppercase tracking-[0.2em] text-[#b09a88]">JPG, PNG, PDF — 10 Mo max</p>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-full border border-[#c6b6a9] px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2b1d10]"
              onClick={() => {
                setDescription("");
                setClientName("");
                setProduct("");
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`rounded-full px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_15px_40px_rgba(217,115,29,0.35)] transition ${
                isSubmitDisabled
                  ? "from-[#f6c292] to-[#f7c294] opacity-60"
                  : "bg-gradient-to-r from-[#d9731d] to-[#bb5b0f]"
              }`}
            >
              {isSubmitting ? "Envoi..." : "Envoyer le ticket"}
            </button>
          </div>
        </form>
      </section>
    </main>
  </div>
);
}
