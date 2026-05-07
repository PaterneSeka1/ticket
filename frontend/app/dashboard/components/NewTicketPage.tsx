"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { ApiError } from "@/api/client";
import { fetchConcernedProducts } from "@/api/products";
import { createTicket, fetchCategories } from "@/api/tickets";
import type { CreateTicketPayload } from "@/api/tickets";
import type { ConcernedProduct, TicketCategory, TicketPriority, TicketType } from "@/api/types";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePathname, useRouter } from "next/navigation";

type IncidentSelection = "INTERNE" | "CLIENT";

const incidentTypes: Array<{ id: IncidentSelection; label: string }> = [
  { id: "INTERNE", label: "Incident interne" },
  { id: "CLIENT", label: "Réclamation client" },
];

const priorityLevels = [
  {
    id: "P1",
    label: "P1 – Critique",
    activeTone: "border-[#d92d20] bg-[#fff1ef] text-[#d92d20]",
    dot: "bg-[#d92d20]",
  },
  {
    id: "P2",
    label: "P2 – Majeur",
    activeTone: "border-[#f59e0b] bg-[#fff7e8] text-[#c97a06]",
    dot: "bg-[#f59e0b]",
  },
  {
    id: "P3",
    label: "P3 – Mineur",
    activeTone: "border-[#16a34a] bg-[#effcf3] text-[#15803d]",
    dot: "bg-[#16a34a]",
  },
] as const;

const incidentTypeMap: Record<IncidentSelection, TicketType> = {
  INTERNE: "INCIDENT",
  CLIENT: "DEMANDE",
};

const priorityMap: Record<string, TicketPriority> = {
  P1: "CRITICAL",
  P2: "HIGH",
  P3: "MEDIUM",
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const getLocalDateValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalTimeValue = (date = new Date()) => {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
};

const buildDetectedAtValue = (date: string, time: string) => {
  if (!date || !time) return undefined;
  const detectedAt = new Date(`${date}T${time}`);
  return Number.isNaN(detectedAt.getTime()) ? undefined : detectedAt.toISOString();
};

export default function NewTicketPage() {
  const { user, status } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const myTicketsRoute = pathname?.replace(/\/nouveau-ticket$/, "/mes-tickets") ?? "/dashboard/employe/mes-tickets";

  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentSelection>("INTERNE");
  const [selectedPriority, setSelectedPriority] = useState("P2");

  const [detectionDate, setDetectionDate] = useState(() => getLocalDateValue());
  const [detectionTime, setDetectionTime] = useState(() => getLocalTimeValue());
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [configuredProducts, setConfiguredProducts] = useState<ConcernedProduct[]>([]);
  const [productStatus, setProductStatus] = useState<"idle" | "loading" | "error">("idle");

  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [categoryStatus, setCategoryStatus] = useState<"idle" | "loading" | "error">("idle");

  const [selectedInternalCategoryId, setSelectedInternalCategoryId] = useState<string>();
  const [selectedReclamationCategoryId, setSelectedReclamationCategoryId] = useState<string>();

  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canSelectConcernedProducts = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

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

  useEffect(() => {
    if (status !== "ready" || !canSelectConcernedProducts) {
      setConfiguredProducts([]);
      setProductStatus("idle");
      return;
    }

    let cancelled = false;
    setProductStatus("loading");

    fetchConcernedProducts()
      .then((data) => {
        if (cancelled) return;
        setConfiguredProducts(data.filter((item) => item.isActive));
        setProductStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setConfiguredProducts([]);
        setProductStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [canSelectConcernedProducts, status]);

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
      setProducts([]);
    }
  }, [selectedIncidentType]);

  useEffect(() => {
    const availableProductNames = new Set(configuredProducts.map((item) => item.name));
    setProducts((current) => current.filter((item) => availableProductNames.has(item)));
  }, [configuredProducts]);

  const ticketId = useMemo(() => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TK-${new Date().getFullYear()}-${random}`;
  }, []);

  const ticketType = incidentTypeMap[selectedIncidentType];
  const selectedCategoryId =
    ticketType === "INCIDENT" ? selectedInternalCategoryId : selectedReclamationCategoryId;

  const requiresClientFields = selectedIncidentType === "CLIENT";

  const isSubmitDisabled =
    isSubmitting ||
    !selectedCategoryId ||
    categoryStatus === "loading" ||
    categoryStatus === "error" ||
    (requiresClientFields && canSelectConcernedProducts && productStatus !== "idle") ||
    !title.trim() ||
    !description.trim() ||
    (requiresClientFields &&
      (!clientName.trim() ||
        (canSelectConcernedProducts && products.length === 0)));

  const handleReset = () => {
    setSelectedIncidentType("INTERNE");
    setSelectedPriority("P2");
    setDetectionDate(getLocalDateValue());
    setDetectionTime(getLocalTimeValue());
    setTitle("");
    setDescription("");
    setClientName("");
    setProducts([]);
    setAttachment(null);

    if (incidentCategories.length) {
      setSelectedInternalCategoryId(incidentCategories[0].id);
    }

    if (reclamationCategories.length) {
      setSelectedReclamationCategoryId(reclamationCategories[0].id);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleProduct = (productName: string) => {
    setProducts((current) =>
      current.includes(productName)
        ? current.filter((item) => item !== productName)
        : [...current, productName],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCategoryId || !user) return;

    if (!title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }

    if (!description.trim()) {
      toast.error("La description est requise.");
      return;
    }

    if (requiresClientFields) {
      if (!clientName.trim()) {
        toast.error("Le nom du client est requis.");
        return;
      }

      if (canSelectConcernedProducts && productStatus !== "idle") {
        toast.error("Les produits concernés ne sont pas disponibles.");
        return;
      }

      if (canSelectConcernedProducts && products.length === 0) {
        toast.error("Sélectionnez au moins un produit concerné.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const category = categories.find((item) => item.id === selectedCategoryId);
      if (!category) {
        toast.error("La catégorie sélectionnée est invalide.");
        return;
      }

      const payload: CreateTicketPayload = {
        title: title.trim(),
        description: description.trim(),
        priority: priorityMap[selectedPriority],
        categoryId: selectedCategoryId,
        incidentTypeId: category.incidentTypeId,
        detectedAt: buildDetectedAtValue(detectionDate, detectionTime),
        attachmentName: attachment?.name,
        ...(requiresClientFields
          ? {
              clientName: clientName.trim(),
            }
          : {}),
        ...(requiresClientFields && canSelectConcernedProducts
          ? {
              product: products[0],
              products,
            }
          : {}),
      };

      await createTicket(payload);

      toast.success("Ticket créé avec succès.");
      handleReset();
      router.push(myTicketsRoute);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Impossible de créer le ticket.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready" || !user) {
    return (
      <div className="vdm-landing flex min-h-screen items-center justify-center px-4 text-[var(--vdm-dark)]">
        <div className="vdm-card w-full max-w-sm rounded-[24px] p-8 text-center">
          <p className="text-sm text-[var(--vdm-muted)]">
            Préparation du formulaire de ticket…
          </p>
        </div>
      </div>
    );
  }

  const labelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]";
  const inputClass =
    "h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition placeholder:text-[#a89b8e] focus:border-[#d5a15c]";
  const readOnlyClass =
    "h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-[#fbfbfc] px-3 text-sm text-[#6b5446] outline-none";

  return (
    <div className="min-h-screen bg-[#f8f5f0] text-[#2b1d10]">
      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-6">
        <div className="mb-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#23160c]">
            Nouveau Ticket
          </h1>
          <p className="mt-1 text-sm text-[#7a695a]">
            Déclarez un incident ou une réclamation client.
          </p>
        </div>

        <section className="overflow-hidden rounded-[14px] border border-[#e8e1d8] bg-white shadow-[0_12px_30px_rgba(24,24,24,0.05)]">
          <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
            <p className="text-[12px] font-semibold text-[#2f2f33]">
              Formulaire de déclaration d&apos;incident
            </p>
          </div>

          <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 xl:grid-cols-4">
              <label>
                <span className={labelClass}>ID Ticket (auto)</span>
                <input type="text" value={ticketId} readOnly className={readOnlyClass} />
              </label>

              <label>
                <span className={labelClass}>
                  Date de détection <span className="text-[#d92d20]">*</span>
                </span>
                <input
                  type="date"
                  value={detectionDate}
                  onChange={(event) => setDetectionDate(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label>
                <span className={labelClass}>
                  Heure de détection <span className="text-[#d92d20]">*</span>
                </span>
                <input
                  type="time"
                  value={detectionTime}
                  onChange={(event) => setDetectionTime(event.target.value)}
                  className={inputClass}
                />
              </label>

          </div>

            <label>
              <span className={labelClass}>
                Titre du ticket <span className="text-[#d92d20]">*</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Sujet du ticket"
                className={inputClass}
              />
            </label>

            <div>
              <p className={labelClass}>
                Type d&apos;incident <span className="text-[#d92d20]">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {incidentTypes.map((type) => {
                  const selected = selectedIncidentType === type.id;

                  return (
                    <button
                      type="button"
                      key={type.id}
                      onClick={() => setSelectedIncidentType(type.id)}
                      className={cn(
                        "inline-flex h-9 items-center rounded-[8px] border px-4 text-[11px] font-semibold uppercase tracking-[0.04em] transition",
                        selected
                          ? "border-[#d8dce2] bg-[#e9edf3] text-[#364152]"
                          : "border-[#e3e5e8] bg-white text-[#4f4f55] hover:bg-[#fafafa]",
                      )}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedIncidentType === "INTERNE" ? (
              <div className="grid gap-4">
                <label>
                  <span className={labelClass}>
                    Catégorie interne <span className="text-[#d92d20]">*</span>
                  </span>
                  <select
                    value={selectedInternalCategoryId ?? ""}
                    onChange={(event) => setSelectedInternalCategoryId(event.target.value)}
                    disabled={categoryStatus !== "idle" || incidentCategories.length === 0}
                    className={inputClass}
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
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className={labelClass}>
                      Nom du client <span className="text-[#d92d20]">*</span>
                    </span>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      placeholder="Entreprise cliente"
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className={labelClass}>
                      Nature de la réclamation <span className="text-[#d92d20]">*</span>
                    </span>
                    <select
                      value={selectedReclamationCategoryId ?? ""}
                      onChange={(event) => setSelectedReclamationCategoryId(event.target.value)}
                      disabled={categoryStatus !== "idle" || reclamationCategories.length === 0}
                      className={inputClass}
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

                {canSelectConcernedProducts ? (
                  <div>
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className={labelClass}>
                          Produits concernés <span className="text-[#d92d20]">*</span>
                        </p>
                        <p className="text-xs text-[#7a695a]">
                          {products.length} produit(s) associé(s) à cette réclamation
                        </p>
                      </div>
                    </div>

                    {productStatus === "loading" ? (
                      <p className="rounded-[8px] border border-[#e5e7eb] bg-[#fbfcfe] px-3 py-3 text-sm text-[#7a695a]">
                        Chargement des produits…
                      </p>
                    ) : productStatus === "error" ? (
                      <p className="rounded-[8px] border border-[#ffd7d2] bg-[#fff6f5] px-3 py-3 text-sm font-medium text-[#b42318]">
                        Impossible de charger les produits concernés.
                      </p>
                    ) : configuredProducts.length ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {configuredProducts.map((item) => {
                          const checked = products.includes(item.name);

                          return (
                            <label
                              key={item.id}
                              className={cn(
                                "flex min-h-11 cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2 text-sm transition",
                                checked
                                  ? "border-[#d5a15c] bg-[#fff8e8] text-[#2b1d10]"
                                  : "border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#fbfcfe]",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(item.name)}
                                className="h-4 w-4 accent-[#fdbf12]"
                              />
                              <span className="min-w-0 truncate font-medium">{item.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[#8a7f73]">
                        Aucun produit configuré.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <p className={labelClass}>
                Niveau de priorité <span className="text-[#d92d20]">*</span>
              </p>
              <div className="flex flex-wrap gap-3">
                {priorityLevels.map((level) => {
                  const selected = selectedPriority === level.id;

                  return (
                    <button
                      type="button"
                      key={level.id}
                      onClick={() => setSelectedPriority(level.id)}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-[8px] border px-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition",
                        selected
                          ? level.activeTone
                          : "border-[#d8dce2] bg-white text-[#4b5563] hover:bg-[#fafafa]",
                      )}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", level.dot)} />
                      {level.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className={labelClass}>
                Description détaillée <span className="text-[#d92d20]">*</span>
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Décrivez l’incident. Incluez messages d’erreur, logs, étapes de reproduction…"
                className="w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#2b1d10] outline-none transition placeholder:text-[#a89b8e] focus:border-[#d5a15c]"
              />
            </label>

            <div>
              <span className={labelClass}>Pièce jointe</span>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAttachment(file);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#d7dbe2] bg-[#f7f9fc] px-4 py-8 text-sm text-[#6b7280] transition hover:bg-[#f3f6fb]"
              >
                <Upload className="h-4 w-4" />
                <span>Glissez un fichier ou cliquez pour parcourir</span>
              </button>

              {attachment ? (
                <div className="mt-3 flex items-center justify-between rounded-[8px] border border-[#e5e7eb] bg-[#fbfcfe] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#2b1d10]">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-[#7a695a]">
                      {(attachment.size / 1024 / 1024).toFixed(2)} Mo
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAttachment(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] text-[#6b7280] transition hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#8a7f73]">
                  JPG, PNG, PDF — 10 Mo max
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef0f2] pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-10 items-center rounded-[8px] border border-[#d8dce2] bg-white px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#fafafa]"
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
                {isSubmitting ? "Envoi..." : "Envoyer le ticket"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
