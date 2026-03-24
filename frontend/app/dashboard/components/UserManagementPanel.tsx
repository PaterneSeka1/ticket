"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Lock, Shield, UserPlus } from "lucide-react";
import {
  ColumnDef,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import toast from "react-hot-toast";
import { activateUser, createUser, deactivateUser, listUsers, updateUser } from "@/api/users";
import type {
  AuthenticatedUser,
  DirectionType,
  DsiTicketRole,
  OperationService,
  UserResponsibility,
  UserRole,
} from "@/api/types";
import type { CreateUserPayload, UpdateUserPayload } from "@/api/users";

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

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super-admin",
  ADMIN: "Admin",
  USER: "Utilisateur",
};
const dsiRoleLabels: Record<DsiTicketRole, string> = {
  RESPONSABLE: "Responsable DSI",
  CO_RESPONSABLE: "Co-Responsable DSI",
};

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

export function UserManagementPanel() {
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 });
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de charger les utilisateurs.",
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setFormState(initialFormState);
    setEditingUserId(null);
  };

  const startEditing = (user: AuthenticatedUser) => {
  setEditingUserId(user.id);
  setFormState({
      prenom: user.prenom,
      nom: user.nom,
      matricule: user.matricule,
      email: user.email,
      role: user.role,
      direction: user.direction ?? "",
      service: user.service ?? "",
      password: "",
      confirmPassword: "",
      accessReport: user.accessReport,
    exportReport: user.exportReport,
    isActive: user.isActive,
    dsiTicketRole: user.dsiTicketRole ?? "",
    accountResponsibility: user.isResponsable ? "RESPONSABLE" : "EMPLOYE",
  });
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
    if (!editingUserId && !formState.password) {
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
      if (editingUserId) {
        await updateUser(editingUserId, payload);
        toast.success("Utilisateur mis à jour.");
      } else {
        await createUser(payload as CreateUserPayload);
        toast.success("Utilisateur créé.");
      }
      await loadUsers();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer l'utilisateur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEditing = () => {
    resetForm();
  };

  const handleToggleActive = async (user: AuthenticatedUser) => {
    setIsActing(true);
    try {
      const updated = user.isActive
        ? await deactivateUser(user.id)
        : await activateUser(user.id);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(
        updated.isActive ? "Utilisateur activé." : "Utilisateur désactivé.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de mettre à jour le statut.");
    } finally {
      setIsActing(false);
    }
  };

  const activeCount = users.filter((user) => user.isActive).length;
  const totalCount = users.length;

  const userColumns = useMemo<ColumnDef<AuthenticatedUser>[]>(
    () => [
      { id: "matricule", accessorFn: (user) => user.matricule },
      { id: "name", accessorFn: (user) => `${user.prenom} ${user.nom}` },
      { id: "email", accessorFn: (user) => user.email },
      { id: "service", accessorFn: (user) => user.service ?? "" },
      { id: "role", accessorFn: (user) => user.role },
    ],
    [],
  );

  const userGlobalFilter = useCallback<FilterFn<AuthenticatedUser>>((row, columnId, filterValue) => {
    const query = String(filterValue ?? "").trim().toLowerCase();
    if (!query) {
      return true;
    }
    const user = row.original;
    const haystack = [
      user.matricule,
      user.nom,
      user.prenom,
      user.email,
      user.direction ?? "",
      user.service ?? "",
      user.role,
      user.dsiTicketRole ?? "",
      user.isResponsable ? "responsable" : "employé",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }, []);

  const table = useReactTable({
    data: users,
    columns: userColumns,
    state: {
      globalFilter,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: userGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    setGlobalFilter(search);
  }, [search]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [users.length, table]);

  const paginatedRows = table.getPaginationRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-baseline lg:justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-semibold text-[#2b1d10]">Gestion des utilisateurs</p>
          <p className="text-sm text-[#6b5446]">
            {totalCount} compte(s) — {activeCount} actif(s)
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.4em] text-[#b86112]">Administrer les accès et les profils</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <form
          className="flex flex-col gap-5 rounded-[32px] border border-[#f0d7c6] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)]"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#6b5446]">
            <UserPlus className="h-4 w-4 text-[#d9731d]" />
            <span>Créer un utilisateur</span>
          </div>
          <div className="rounded-xl border border-[#f5dccc] bg-[#fff7ef] p-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#b86112]">
            L’identifiant de connexion sera le matricule renseigné.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Prénom *
              <input
                value={formState.prenom}
                onChange={(event) => setFormState({ ...formState, prenom: event.target.value })}
                className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Nom *
              <input
                value={formState.nom}
                onChange={(event) => setFormState({ ...formState, nom: event.target.value })}
                className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
              />
            </label>
          </div>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
            Matricule *
            <input
              value={formState.matricule}
              onChange={(event) => setFormState({ ...formState, matricule: event.target.value })}
              placeholder="MAT-XXXX"
              className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
            Email professionnel *
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState({ ...formState, email: event.target.value })}
              placeholder="prenom.nom@cie.ci"
              className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Direction
              <select
                value={formState.direction}
                onChange={(event) => {
                  const directionValue = event.target.value as DirectionOption;
                  setFormState((state) => ({
                    ...state,
                    direction: directionValue,
                    service: directionValue === "DO" ? state.service : "",
                  }));
                }}
                className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
              >
                <option value="">-- Sélectionner --</option>
                {directionOptions.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction}
                  </option>
                ))}
              </select>
            </label>
            {formState.direction === "DO" ? (
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
                Service
                <select
                  value={formState.service}
                  onChange={(event) =>
                    setFormState({ ...formState, service: event.target.value as ServiceOption })
                  }
                  className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
                >
                  <option value="">-- Sélectionner --</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div />
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Rôle
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
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Type de compte
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
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Profil DSI
              <select
                value={formState.dsiTicketRole}
                onChange={(event) =>
                  setFormState({ ...formState, dsiTicketRole: event.target.value as DsiOption })
                }
                className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-3 text-sm text-[#2b1d10]"
              >
                {dsiRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Mot de passe *
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6b5446]">
              Confirmer le mot de passe *
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formState.confirmPassword}
                  onChange={(event) =>
                    setFormState({ ...formState, confirmPassword: event.target.value })
                  }
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
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
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
            {editingUserId && (
              <button
                type="button"
                onClick={cancelEditing}
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
              <span>{editingUserId ? "Mettre à jour" : "+ Créer l'utilisateur"}</span>
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-4 rounded-[32px] border border-[#f0d7c6] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112]">Utilisateurs enregistrés</p>
            <p className="text-sm text-[#6b5446]">{filteredCount} compte(s) filtres</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher..."
              className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-2 text-sm text-[#2b1d10]"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.35em] text-[#8a7c6c]">
              <tr>
                <th className="pb-3">Login</th>
                <th className="pb-3">Nom complet</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Profil DSI</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Rôle</th>
                <th className="pb-3">Mot de passe</th>
                <th className="pb-3">Statut</th>
                <th className="pb-3">Rapports</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
              </thead>
              <tbody className="text-[#2b1d10]">
              {loading && !paginatedRows.length ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-sm text-[#6b5446]">
                      Chargement…
                    </td>
                  </tr>
                ) : filteredCount ? (
                  paginatedRows.map((row) => {
                    const user = row.original;
                    return (
                      <tr key={user.id} className="border-b border-[#f3ece2]">
                      <td className="py-4 font-semibold text-[#2b1d10]">{user.matricule}</td>
                      <td className="py-4">
                        <p className="font-semibold text-[#2b1d10]">{user.prenom} {user.nom}</p>
                        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#b5a99a]">{user.direction ?? "—"}</p>
                      </td>
                      <td className="py-4 text-xs text-[#6b5446]">{user.email}</td>
                      <td className="py-4 text-[#2b1d10]">{user.service ?? "—"}</td>
                      <td className="py-4 text-[#2b1d10]">{user.dsiTicketRole ? dsiRoleLabels[user.dsiTicketRole] : "Employé simple"}</td>
                      <td className="py-4 text-[#2b1d10]">
                        {user.isResponsable ? "Responsable" : "Employé simple"}
                      </td>
                      <td className="py-4">
                        <span className="inline-flex rounded-full bg-[#fff4d6] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#c4620c]">{roleLabels[user.role]}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3 text-[0.6rem] tracking-[0.3em] text-[#6b5446]">
                          <span className="text-[0.5rem]">••••••••</span>
                          <Eye className="h-4 w-4 text-[#b5a99a]" />
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${
                            user.isActive ? "bg-[#e6f4ed] text-[#1f6f3a]" : "bg-[#fde8e7] text-[#c42d1f]"
                          }`}
                        >
                          {user.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          {user.accessReport && (
                            <span className="flex items-center gap-1 rounded-full bg-[#e6f4ed] px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-[#1f6f3a]">
                              <Check className="h-3 w-3" />
                              Rapports
                            </span>
                          )}
                          {user.exportReport && (
                            <span className="flex items-center gap-1 rounded-full bg-[#e3e8ff] px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-[#1f4bbf]">
                              <Shield className="h-3 w-3" />
                              CSV/PDF
                            </span>
                          )}
                          {!user.accessReport && !user.exportReport && (
                            <span className="text-[0.55rem] text-[#b5a99a]">Aucun</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(user)}
                            className="rounded-full border border-[#d6c5b4] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#2b1d10]">
                            Éditer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            disabled={isActing}
                            className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] ${
                              user.isActive
                                ? "border border-[#c42d1f] text-[#c42d1f]"
                                : "border border-[#1f6f3a] text-[#1f6f3a]"
                            }`}
                          >
                            {user.isActive ? "Désactiver" : "Activer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-sm text-[#6b5446]">
                      Aucun utilisateur disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-[#f3ece2] bg-white/50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
            {filteredCount} résultat(s) • page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-full border border-[#d6c5b4] px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2b1d10] disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-full border border-[#d6c5b4] px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2b1d10] disabled:opacity-50"
            >
              Suivant
            </button>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="rounded-[12px] border border-[#e2dbd1] bg-white px-3 py-1 text-[0.7rem] text-[#2b1d10]"
            >
              {[6, 12, 24].map((size) => (
                <option key={size} value={size}>
                  Afficher {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
