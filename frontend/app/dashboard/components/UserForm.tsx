"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { createUser, getUserPassword, updateUser } from "@/api/users";
import { fetchDepartments } from "@/api/departments";
import { fetchServices } from "@/api/services";
import type { CreateUserPayload, UpdateUserPayload } from "@/api/users";
import type {
  AuthenticatedUser,
  Department,
  DsiTicketRole,
  Service,
  UserResponsibility,
  UserRole,
} from "@/api/types";

type DsiOption = DsiTicketRole | "";
const roleOptions: UserRole[] = ["SUPER_ADMIN", "ADMIN", "READER", "EMPLOYE"];
const dsiRoleOptions: Array<{ value: DsiOption; label: string }> = [
  { value: "", label: "Employé simple" },
  { value: "RESPONSABLE", label: "Responsable DSI" },
  { value: "CO_RESPONSABLE", label: "Co-Responsable DSI" },
];
const responsibilityOptions: Array<{ value: UserResponsibility; label: string }> = [
  { value: "EMPLOYE", label: "Employé simple" },
  { value: "RESPONSABLE", label: "Responsable" },
];
const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  READER: "Lecteur",
  EMPLOYE: "Employé",
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface FormState {
  prenom: string;
  nom: string;
  matricule: string;
  email: string;
  role: UserRole;
  departmentId: string;
  serviceId: string;
  password: string;
  confirmPassword: string;
  accessReport: boolean;
  exportReport: boolean;
  isActive: boolean;
  dsiTicketRole: DsiOption;
  accountResponsibility: UserResponsibility;
}

const initialFormState: FormState = {
  prenom: "",
  nom: "",
  matricule: "",
  email: "",
  role: "EMPLOYE",
  departmentId: "",
  serviceId: "",
  password: "",
  confirmPassword: "",
  accessReport: false,
  exportReport: false,
  isActive: true,
  dsiTicketRole: "",
  accountResponsibility: "EMPLOYE",
};

interface UserFormProps {
  initialUser?: AuthenticatedUser;
  onCancel?: () => void;
  onSuccess?: () => Promise<void> | void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#!";
  let pwd = "";
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export function UserForm({ initialUser, onCancel, onSuccess }: UserFormProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Edit-mode password states
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);
  const [expandComments, setExpandComments] = useState(false);

  const isEditMode = Boolean(initialUser);

  const labelClass =
    "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]";
  const inputClass =
    "h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition placeholder:text-[#a89b8e] focus:border-[#d5a15c]";
  const selectClass =
    "h-11 w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-sm text-[#2b1d10] outline-none transition focus:border-[#d5a15c]";

  useEffect(() => {
    if (initialUser) {
      setFormState({
        prenom: initialUser.prenom,
        nom: initialUser.nom,
        matricule: initialUser.matricule,
        email: initialUser.email,
        role: initialUser.role,
        departmentId: initialUser.departmentId ?? initialUser.department?.id ?? "",
        serviceId: initialUser.serviceId ?? initialUser.service?.id ?? "",
        password: "",
        confirmPassword: "",
        accessReport: initialUser.accessReport,
        exportReport: initialUser.exportReport,
        isActive: initialUser.isActive,
        dsiTicketRole: initialUser.dsiTicketRole ?? "",
        accountResponsibility: initialUser.isResponsable ? "RESPONSABLE" : "EMPLOYE",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      setCurrentPassword(null);
      setShowCurrentPassword(false);
      return;
    }
    setFormState(initialFormState);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [initialUser]);

  // Fetch current password in edit mode
  useEffect(() => {
    if (!isEditMode || !initialUser) return;
    setPasswordLoading(true);
    getUserPassword(initialUser.id)
      .then(({ password }) => setCurrentPassword(password))
      .catch(() => setCurrentPassword(null))
      .finally(() => setPasswordLoading(false));
  }, [isEditMode, initialUser?.id]);

  useEffect(() => {
    let isMounted = true;
    const loadReferences = async () => {
      try {
        const [deptResponse, serviceResponse] = await Promise.all([
          fetchDepartments(),
          fetchServices(),
        ]);
        if (!isMounted) return;
        setDepartments(deptResponse);
        setServices(serviceResponse);
      } catch {
        toast.error("Impossible de charger les départements et services.");
      }
    };
    void loadReferences();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isEditMode) return;
    if (!departments.length) return;
    setFormState((state) =>
      state.departmentId ? state : { ...state, departmentId: departments[0].id },
    );
  }, [departments, isEditMode]);

  const servicesForSelectedDepartment = useMemo(
    () => services.filter((service) => service.departmentId === formState.departmentId),
    [services, formState.departmentId],
  );

  useEffect(() => {
    if (isEditMode) return;
    if (!servicesForSelectedDepartment.length) return;
    setFormState((state) =>
      state.serviceId ? state : { ...state, serviceId: servicesForSelectedDepartment[0].id },
    );
  }, [servicesForSelectedDepartment, isEditMode]);

  const handleDepartmentChange = (departmentId: string) => {
    const choices = services.filter((service) => service.departmentId === departmentId);
    setFormState((state) => ({
      ...state,
      departmentId,
      serviceId: choices.some((service) => service.id === state.serviceId)
        ? state.serviceId
        : "",
    }));
  };

  const handleReset = () => {
    if (isEditMode) return;
    setFormState(initialFormState);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.nom.trim() || !formState.prenom.trim() || !formState.email.trim()) {
      toast.error("Prénom, nom et email sont requis.");
      return;
    }
    if (!formState.matricule.trim()) {
      toast.error("Le matricule est obligatoire.");
      return;
    }
    if (!isEditMode && !formState.password) {
      toast.error("Le mot de passe est obligatoire pour créer un utilisateur.");
      return;
    }
    if (formState.password && formState.password !== formState.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    const payload: UpdateUserPayload = {
      nom: formState.nom.trim(),
      prenom: formState.prenom.trim(),
      email: formState.email.trim().toLowerCase(),
      matricule: formState.matricule.trim(),
      role: formState.role,
      departmentId: formState.departmentId || undefined,
      serviceId: formState.serviceId || undefined,
      isActive: formState.isActive,
    };
    if (formState.password) payload.passwordHash = formState.password;

    try {
      if (isEditMode && initialUser) {
        await updateUser(initialUser.id, payload);
        toast.success("Utilisateur mis à jour.");
      } else {
        await createUser(payload as CreateUserPayload);
        toast.success("Utilisateur créé.");
        setFormState(initialFormState);
        setShowPassword(false);
        setShowConfirmPassword(false);
      }
      if (onSuccess) await onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'enregistrer l'utilisateur.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── EDIT MODE ────────────────────────────────────────────────────────────
  if (isEditMode && initialUser) {
    const fullName = `${initialUser.nom} ${initialUser.prenom}`;

    return (
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e9ecef] bg-[#f3f5f8] px-6 py-4">
          <div>
            <p className="text-[15px] font-bold text-[#2b1d10]">Éditer — {fullName}</p>
            <p className="mt-[3px] text-[11px] text-[#7b6655]">
              Login : {roleLabels[initialUser.role]} | Créé le {formatDate(initialUser.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="ml-4 mt-0.5 rounded-full border border-[#e0d4c8] p-1.5 text-[#7b6655] hover:bg-[#fff3e6] transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <form className="flex-1 space-y-4 overflow-y-auto px-6 py-5" onSubmit={handleSubmit}>
          {/* PRÉNOM + NOM */}
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Prénom</span>
              <input
                value={formState.prenom}
                onChange={(e) => setFormState({ ...formState, prenom: e.target.value })}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Nom</span>
              <input
                value={formState.nom}
                onChange={(e) => setFormState({ ...formState, nom: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          {/* EMAIL + MATRICULE */}
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Email</span>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Matricule</span>
              <input
                value={formState.matricule}
                onChange={(e) => setFormState({ ...formState, matricule: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          {/* SERVICE + RÔLE */}
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Service</span>
              <select
                value={formState.serviceId}
                onChange={(e) => setFormState({ ...formState, serviceId: e.target.value })}
                className={selectClass}
              >
                <option value="">— Sélectionner —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Rôle</span>
              <select
                value={formState.role}
                onChange={(e) => setFormState({ ...formState, role: e.target.value as UserRole })}
                className={selectClass}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{roleLabels[r]}</option>
                ))}
              </select>
            </label>
          </div>

          {/* STATUT + ACCÈS RAPPORTS */}
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClass}>Statut</span>
              <select
                value={formState.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setFormState({ ...formState, isActive: e.target.value === "active" })
                }
                className={selectClass}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </label>
            <label>
              <span className={labelClass}>Accès rapports</span>
              <select
                value={formState.accessReport ? "oui" : "non"}
                onChange={(e) =>
                  setFormState({ ...formState, accessReport: e.target.value === "oui" })
                }
                className={selectClass}
              >
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
            </label>
          </div>

          {/* MOT DE PASSE ACTUEL */}
          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
              🔑 Mot de passe actuel
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  readOnly
                  type={showCurrentPassword ? "text" : "password"}
                  value={
                    passwordLoading
                      ? "Chargement…"
                      : (currentPassword ?? "—")
                  }
                  className="h-11 w-full rounded-[8px] border border-[#f0d080] bg-[#fef9e7] px-3 pr-11 font-mono text-sm text-[#7b4f00] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b8860b]"
                  disabled={passwordLoading || !currentPassword}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* NOUVEAU MOT DE PASSE */}
          <div>
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f5449]">
              📝 Nouveau mot de passe{" "}
              <span className="ml-1 text-[9px] font-medium normal-case tracking-normal text-[#8a8176]">
                (laisser vide pour ne pas changer)
              </span>
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formState.password}
                  onChange={(e) =>
                    setFormState({ ...formState, password: e.target.value, confirmPassword: e.target.value })
                  }
                  placeholder="Nouveau mot de passe…"
                  className={cn(inputClass, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa1ac]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pwd = generateRandomPassword();
                  setFormState((s) => ({ ...s, password: pwd, confirmPassword: pwd }));
                  setShowPassword(true);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-[11px] font-semibold text-[#5f5449] hover:bg-[#faf6f1] transition whitespace-nowrap"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Générer
              </button>
            </div>
          </div>

          {/* ACCÈS EXPORT CSV/PDF */}
          <label>
            <span className={labelClass}>Accès export CSV/PDF</span>
            <select
              value={formState.exportReport ? "oui" : "non"}
              onChange={(e) =>
                setFormState({ ...formState, exportReport: e.target.value === "oui" })
              }
              className={cn(selectClass, "max-w-[220px]")}
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </label>

          {/* HISTORIQUE & TRAÇABILITÉ */}
          <div className="rounded-[10px] border border-[#e9ecef]">
            <button
              type="button"
              onClick={() => setExpandHistory((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f5449] hover:bg-[#fafaf8] transition"
            >
              <span>📋 Historique &amp; Traçabilité</span>
              {expandHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandHistory && (
              <div className="border-t border-[#e9ecef] px-4 py-3 text-[13px] text-[#8a8176]">
                Aucun historique disponible.
              </div>
            )}
          </div>

          {/* COMMENTAIRES */}
          <div className="rounded-[10px] border border-[#e9ecef]">
            <button
              type="button"
              onClick={() => setExpandComments((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f5449] hover:bg-[#fafaf8] transition"
            >
              <span>💬 Commentaires</span>
              {expandComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandComments && (
              <div className="border-t border-[#e9ecef] px-4 py-3 text-[13px] text-[#8a8176]">
                Aucun commentaire.
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-[12px] text-[#1d4ed8]">
            ℹ️ Le mot de passe actuel est affiché en clair. Renseignez le champ &quot;Nouveau mot de
            passe&quot; uniquement si vous souhaitez le modifier.
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-[#eef0f2] pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 items-center rounded-[8px] border border-[#d8dce2] bg-white px-4 text-[11px] font-semibold text-[#2b1d10] transition hover:bg-[#fafafa]"
            >
              Fermer
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-[#f9b800] px-4 text-[11px] font-semibold text-[#352300] transition hover:bg-[#f2aa00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              💾 {isSubmitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── CREATE MODE ──────────────────────────────────────────────────────────
  const isSubmitDisabled = isSubmitting || !formState.password;
  return (
    <section className="overflow-hidden rounded-[14px] border border-[#e8e1d8] bg-white shadow-[0_12px_30px_rgba(24,24,24,0.05)]">
      <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
        <p className="text-[12px] font-semibold text-[#2f2f33]">Créer un utilisateur</p>
      </div>

      <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className={labelClass}>
              Matricule <span className="text-[#d92d20]">*</span>
            </span>
            <input
              value={formState.matricule}
              onChange={(e) => setFormState({ ...formState, matricule: e.target.value })}
              placeholder="MAT-XXXX"
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>
              Prénom <span className="text-[#d92d20]">*</span>
            </span>
            <input
              value={formState.prenom}
              onChange={(e) => setFormState({ ...formState, prenom: e.target.value })}
              className={inputClass}
            />
          </label>
          <label>
            <span className={labelClass}>
              Nom <span className="text-[#d92d20]">*</span>
            </span>
            <input
              value={formState.nom}
              onChange={(e) => setFormState({ ...formState, nom: e.target.value })}
              className={inputClass}
            />
          </label>
        </div>

        <label>
          <span className={labelClass}>
            Email professionnel <span className="text-[#d92d20]">*</span>
          </span>
          <input
            type="email"
            value={formState.email}
            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
            placeholder="prenom.nom@cie.ci"
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClass}>Direction</span>
            <select
              value={formState.departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className={selectClass}
              disabled={!departments.length}
            >
              <option value="">
                {departments.length ? "-- Sélectionner --" : "Chargement..."}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Service</span>
            <select
              value={formState.serviceId}
              onChange={(e) => setFormState({ ...formState, serviceId: e.target.value })}
              className={selectClass}
              disabled={!servicesForSelectedDepartment.length}
            >
              <option value="">
                {servicesForSelectedDepartment.length ? "-- Sélectionner --" : "Aucun service"}
              </option>
              {servicesForSelectedDepartment.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label>
            <span className={labelClass}>Rôle</span>
            <select
              value={formState.role}
              onChange={(e) => setFormState({ ...formState, role: e.target.value as UserRole })}
              className={selectClass}
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Type de compte</span>
            <select
              value={formState.accountResponsibility}
              onChange={(e) =>
                setFormState({ ...formState, accountResponsibility: e.target.value as UserResponsibility })
              }
              className={selectClass}
            >
              {responsibilityOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Profil DSI</span>
            <select
              value={formState.dsiTicketRole}
              onChange={(e) =>
                setFormState({ ...formState, dsiTicketRole: e.target.value as DsiOption })
              }
              className={selectClass}
            >
              {dsiRoleOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 pt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-[#c6b6a9]"
            />
            Compte actif
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className={labelClass}>
              Mot de passe <span className="text-[#d92d20]">*</span>
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formState.password}
                  onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                  placeholder="Min. 8 car. — maj, min, chiffre, symbole"
                  className={cn(inputClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa1ac]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pwd = generateRandomPassword();
                  setFormState((s) => ({ ...s, password: pwd, confirmPassword: pwd }));
                  setShowPassword(true);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-white px-3 text-[11px] font-semibold text-[#5f5449] hover:bg-[#faf6f1] transition whitespace-nowrap"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Générer
              </button>
            </div>
          </div>
          <label>
            <span className={labelClass}>
              Confirmer le mot de passe <span className="text-[#d92d20]">*</span>
            </span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formState.confirmPassword}
                onChange={(e) => setFormState({ ...formState, confirmPassword: e.target.value })}
                placeholder="Répéter le mot de passe"
                className={cn(inputClass, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa1ac]"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </button>
            </div>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
            <input
              type="checkbox"
              checked={formState.accessReport}
              onChange={(e) => setFormState({ ...formState, accessReport: e.target.checked })}
              className="h-4 w-4 rounded border-[#c6b6a9] hidden"
            />
            Accès aux rapports
          </label>
          <label className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10] hidden">
            <input
              type="checkbox"
              checked={formState.exportReport}
              onChange={(e) => setFormState({ ...formState, exportReport: e.target.checked })}
              className="h-4 w-4 rounded border-[#c6b6a9]"
            />
            Export CSV / PDF
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef0f2] pt-4">
          <button
            type="button"
            onClick={() => { if (onCancel) { onCancel(); } else { handleReset(); } }}
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
            {isSubmitting ? "Enregistrement..." : "Créer l'utilisateur"}
          </button>
        </div>
      </form>
    </section>
  );
}
