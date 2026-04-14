"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { createUser, updateUser } from "@/api/users";
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

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super-admin",
  ADMIN: "Admin",
  READER: "Lecteur",
  EMPLOYE: "Employé",
};

export function UserForm({ initialUser, onCancel, onSuccess }: UserFormProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);

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
      return;
    }
    setFormState(initialFormState);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [initialUser]);

  useEffect(() => {
    let isMounted = true;
    const loadReferences = async () => {
      try {
        const [deptResponse, serviceResponse] = await Promise.all([fetchDepartments(), fetchServices()]);
        if (!isMounted) return;
        setDepartments(deptResponse);
        setServices(serviceResponse);
      } catch (error) {
        console.error(error);
        toast.error("Impossible de charger les départements et services.");
      }
    };
    void loadReferences();
    return () => {
      isMounted = false;
    };
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
      serviceId: choices.some((service) => service.id === state.serviceId) ? state.serviceId : "",
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

  const isSubmitDisabled = isSubmitting || (!isEditMode && !formState.password);
  return (
    <section className="overflow-hidden rounded-[14px] border border-[#e8e1d8] bg-white shadow-[0_12px_30px_rgba(24,24,24,0.05)]">
      <div className="border-b border-[#e9ecef] bg-[#f3f5f8] px-5 py-4">
        <p className="text-[12px] font-semibold text-[#2f2f33]">{title}</p>
      </div>

      <form className="space-y-5 px-5 py-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className={labelClass}>
              Matricule <span className="text-[#d92d20]">*</span>
            </span>
            <input
              value={formState.matricule}
              onChange={(event) => setFormState({ ...formState, matricule: event.target.value })}
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
              onChange={(event) => setFormState({ ...formState, prenom: event.target.value })}
              className={inputClass}
            />
          </label>

          <label>
            <span className={labelClass}>
              Nom <span className="text-[#d92d20]">*</span>
            </span>
            <input
              value={formState.nom}
              onChange={(event) => setFormState({ ...formState, nom: event.target.value })}
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
            onChange={(event) => setFormState({ ...formState, email: event.target.value })}
            placeholder="prenom.nom@cie.ci"
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClass}>Direction</span>
            <select
              value={formState.departmentId}
              onChange={(event) => handleDepartmentChange(event.target.value)}
              className={selectClass}
              disabled={!departments.length}
            >
              <option value="">
                {departments.length ? "-- Sélectionner --" : "Chargement..."}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>Service</span>
            <select
              value={formState.serviceId}
              onChange={(event) =>
                setFormState({ ...formState, serviceId: event.target.value })
              }
              className={selectClass}
              disabled={!servicesForSelectedDepartment.length}
            >
              <option value="">
                {servicesForSelectedDepartment.length
                  ? "-- Sélectionner --"
                  : "Aucun service"}
              </option>
              {servicesForSelectedDepartment.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label>
            <span className={labelClass}>Rôle</span>
            <select
              value={formState.role}
              onChange={(event) =>
                setFormState({
                  ...formState,
                  role: event.target.value as UserRole,
                })
              }
              className={selectClass}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>Type de compte</span>
            <select
              value={formState.accountResponsibility}
              onChange={(event) =>
                setFormState({
                  ...formState,
                  accountResponsibility: event.target.value as UserResponsibility,
                })
              }
              className={selectClass}
            >
              {responsibilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelClass}>Profil DSI</span>
            <select
              value={formState.dsiTicketRole}
              onChange={(event) =>
                setFormState({
                  ...formState,
                  dsiTicketRole: event.target.value as DsiOption,
                })
              }
              className={selectClass}
            >
              {dsiRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 pt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) =>
                setFormState({ ...formState, isActive: event.target.checked })
              }
              className="h-4 w-4 rounded border-[#c6b6a9]"
            />
            Compte actif
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClass}>
              Mot de passe{" "}
              <span className="text-[#d92d20]">{isEditMode ? "" : "*"}</span>
              {isEditMode ? (
                <span className="ml-2 text-[10px] font-medium tracking-normal text-[#8a8176] normal-case">
                  (laisser vide pour conserver)
                </span>
              ) : null}
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formState.password}
                onChange={(event) =>
                  setFormState({ ...formState, password: event.target.value })
                }
                placeholder="Min. 8 car. — maj, min, chiffre, symbole"
                className={cn(inputClass, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa1ac]"
                aria-label={
                  showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>

          <label>
            <span className={labelClass}>
              Confirmer le mot de passe{" "}
              <span className="text-[#d92d20]">{isEditMode ? "" : "*"}</span>
              {isEditMode ? (
                <span className="ml-2 text-[10px] font-medium tracking-normal text-[#8a8176] normal-case">
                  (laisser vide pour conserver)
                </span>
              ) : null}
            </span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formState.confirmPassword}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    confirmPassword: event.target.value,
                  })
                }
                placeholder="Répéter le mot de passe"
                className={cn(inputClass, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa1ac]"
                aria-label={
                  showConfirmPassword
                    ? "Masquer la confirmation du mot de passe"
                    : "Afficher la confirmation du mot de passe"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
            <input
              type="checkbox"
              checked={formState.accessReport}
              onChange={(event) =>
                setFormState({ ...formState, accessReport: event.target.checked })
              }
              className="h-4 w-4 rounded border-[#c6b6a9]"
            />
            Accès aux rapports
          </label>
          <label className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2b1d10]">
            <input
              type="checkbox"
              checked={formState.exportReport}
              onChange={(event) =>
                setFormState({ ...formState, exportReport: event.target.checked })
              }
              className="h-4 w-4 rounded border-[#c6b6a9]"
            />
            Export CSV / PDF
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#eef0f2] pt-4">
          <button
            type="button"
            onClick={isEditMode ? onCancel : handleReset}
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
            {isSubmitting
              ? "Enregistrement..."
              : isEditMode
                ? "Mettre à jour"
                : "Créer l'utilisateur"}
          </button>
        </div>
      </form>
    </section>
  );
}
