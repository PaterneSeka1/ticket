"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Eye, EyeOff, Lock, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { createUser, updateUser } from "@/api/users";
import type { CreateUserPayload, UpdateUserPayload } from "@/api/users";
import type {
  AuthenticatedUser,
  DirectionType,
  DsiTicketRole,
  OperationService,
  UserResponsibility,
  UserRole,
} from "@/api/types";

type DirectionOption = DirectionType | "";
type ServiceOption = OperationService | "";
type DsiOption = DsiTicketRole | "";

const directionOptions: DirectionType[] = ["DAF", "DSI", "DO"];
const serviceOptions: OperationService[] = ["QUALITE", "OPERATIONS", "REPUTATION"];
const roleOptions: UserRole[] = ["SUPER_ADMIN", "ADMIN", "USER"];
const dsiRoleOptions: Array<{ value: DsiOption; label: string }> = [
  { value: "", label: "Employé simple" },
  { value: "RESPONSABLE", label: "Responsable DSI" },
  { value: "CO_RESPONSABLE", label: "Co-Responsable DSI" },
];

const responsibilityOptions: Array<{ value: UserResponsibility; label: string }> = [
  { value: "EMPLOYE", label: "Employé simple" },
  { value: "RESPONSABLE", label: "Responsable" },
];

const fieldLabelClasses = "text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]";

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`space-y-2 ${fieldLabelClasses} w-full min-w-0`}>
      <span>{label}</span>
      {children}
    </div>
  );
}

interface FormState {
  prenom: string;
  nom: string;
  matricule: string;
  email: string;
  role: UserRole;
  direction: DirectionOption;
  service: ServiceOption;
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
  role: "USER",
  direction: "",
  service: "",
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

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super-admin",
  ADMIN: "Admin",
  USER: "Utilisateur",
};

export function UserForm({ initialUser, onCancel, onSuccess }: UserFormProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEditMode = Boolean(initialUser);

  useEffect(() => {
    if (initialUser) {
      setFormState({
        prenom: initialUser.prenom,
        nom: initialUser.nom,
        matricule: initialUser.matricule,
        email: initialUser.email,
        role: initialUser.role,
        direction: initialUser.direction ?? "",
        service: initialUser.service ?? "",
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
      return;
    }
    setFormState(initialFormState);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [initialUser]);

  const handleDirectionChange = (directionValue: DirectionOption) => {
    setFormState((state) => ({
      ...state,
      direction: directionValue,
      service: directionValue === "DO" ? state.service : "",
    }));
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
      direction: formState.direction || undefined,
      service: formState.service || undefined,
      accessReport: formState.accessReport,
      exportReport: formState.exportReport,
      isActive: formState.isActive,
      dsiTicketRole: formState.dsiTicketRole || undefined,
      isResponsable: formState.accountResponsibility === "RESPONSABLE",
    };

    if (formState.password) {
      payload.passwordHash = formState.password;
    }

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
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer l'utilisateur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isEditMode ? "Mettre à jour un utilisateur" : "Créer un utilisateur";
  return (
    <form
      className="flex flex-col gap-5 rounded-[32px] border border-[#f0d7c6] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)]"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[#6b5446]">
        <UserPlus className="h-4 w-4 text-[#d9731d]" />
        <span>{title}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldGroup label="Matricule">
          <input
            value={formState.matricule}
            onChange={(event) => setFormState({ ...formState, matricule: event.target.value })}
            placeholder="MAT-XXXX"
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          />
        </FieldGroup>
        <FieldGroup label="Prénom">
          <input
            value={formState.prenom}
            onChange={(event) => setFormState({ ...formState, prenom: event.target.value })}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          />
        </FieldGroup>
        <FieldGroup label="Nom">
          <input
            value={formState.nom}
            onChange={(event) => setFormState({ ...formState, nom: event.target.value })}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          />
        </FieldGroup>
      </div>
      <FieldGroup label="Email professionnel">
        <input
          type="email"
          value={formState.email}
          onChange={(event) => setFormState({ ...formState, email: event.target.value })}
          placeholder="prenom.nom@cie.ci"
          className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
        />
      </FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldGroup label="Direction">
          <select
            value={formState.direction}
            onChange={(event) => handleDirectionChange(event.target.value as DirectionOption)}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          >
            <option value="">-- Sélectionner --</option>
            {directionOptions.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </FieldGroup>
        {formState.direction === "DO" ? (
          <FieldGroup label="Service">
            <select
              value={formState.service}
              onChange={(event) => setFormState({ ...formState, service: event.target.value as ServiceOption })}
              className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
            >
              <option value="">-- Sélectionner --</option>
              {serviceOptions.map((serviceOption) => (
                <option key={serviceOption} value={serviceOption}>
                  {serviceOption}
                </option>
              ))}
            </select>
          </FieldGroup>
        ) : (
          <div />
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <FieldGroup label="Rôle">
          <select
            value={formState.role}
            onChange={(event) => setFormState({ ...formState, role: event.target.value as UserRole })}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Type de compte">
          <select
            value={formState.accountResponsibility}
            onChange={(event) =>
              setFormState({
                ...formState,
                accountResponsibility: event.target.value as UserResponsibility,
              })
            }
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          >
            {responsibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Profil DSI">
          <select
            value={formState.dsiTicketRole}
            onChange={(event) => setFormState({ ...formState, dsiTicketRole: event.target.value as DsiOption })}
            className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
          >
            {dsiRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldGroup>
        <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
          <input
            type="checkbox"
            checked={formState.isActive}
            onChange={(event) => setFormState({ ...formState, isActive: event.target.checked })}
            className="h-4 w-4 rounded border-[#c6b6a9]"
          />
          Compte actif
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldGroup label={`Mot de passe ${isEditMode ? "(laisser vide pour conserver l'existant)" : "*"}`}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={formState.password}
              onChange={(event) => setFormState({ ...formState, password: event.target.value })}
              placeholder="Min. 8 car. — maj, min, chiffre, symbole"
              className="w-full rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b5a99a]"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FieldGroup>
        <FieldGroup label={`Confirmer le mot de passe ${isEditMode ? "(laisser vide pour conserver l'existant)" : "*"}`}>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={formState.confirmPassword}
              onChange={(event) => setFormState({ ...formState, confirmPassword: event.target.value })}
              placeholder="Répéter le mot de passe"
              className="w-full rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b5a99a]"
              aria-label={
                showConfirmPassword
                  ? "Masquer la confirmation du mot de passe"
                  : "Afficher la confirmation du mot de passe"
              }
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </button>
          </div>
        </FieldGroup>
      </div>
      <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
        <input
          type="checkbox"
          checked={formState.accessReport}
          onChange={(event) => setFormState({ ...formState, accessReport: event.target.checked })}
          className="h-4 w-4 rounded border-[#c6b6a9]"
        />
        Accès aux rapports
      </label>
      <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
        <input
          type="checkbox"
          checked={formState.exportReport}
          onChange={(event) => setFormState({ ...formState, exportReport: event.target.checked })}
          className="h-4 w-4 rounded border-[#c6b6a9]"
        />
        Export CSV / PDF
      </label>
      <div className="flex items-center justify-between gap-3">
        {isEditMode && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#c6b6a9] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2b1d10]"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d9731d] to-[#bb5b0f] px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_15px_40px_rgba(217,115,29,0.35)]"
        >
          <span>{isEditMode ? "Mettre à jour" : "+ Créer l'utilisateur"}</span>
        </button>
      </div>
    </form>
  );
}
