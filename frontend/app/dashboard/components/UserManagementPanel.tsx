"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  Shield,
  X,
  Search,
  Users,
  UserCheck,
  UserX,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  ColumnDef,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import toast from "react-hot-toast";
import { activateUser, deactivateUser, listUsers } from "@/api/users";
import type { AuthenticatedUser, DsiTicketRole, UserRole } from "@/api/types";
import { UserForm } from "./UserForm";

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super-admin",
  ADMIN: "Admin",
  USER: "Utilisateur",
};

const dsiRoleLabels: Record<DsiTicketRole, string> = {
  RESPONSABLE: "Responsable DSI",
  CO_RESPONSABLE: "Co-Responsable DSI",
};

const creationRoute = "/dashboard/users/create";

function StatCard({
  icon,
  label,
  value,
  accent = "orange",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: "orange" | "green" | "red";
}) {
  const tones = {
    orange:
      "from-[#fff3e9] to-[#fde1ca] text-[#d9731d] shadow-[0_10px_25px_rgba(217,115,29,0.12)]",
    green:
      "from-[#ebfbf1] to-[#d9f5e4] text-[#1f8a4c] shadow-[0_10px_25px_rgba(31,138,76,0.12)]",
    red:
      "from-[#fff0ef] to-[#ffe0dd] text-[#c94a3d] shadow-[0_10px_25px_rgba(201,74,61,0.12)]",
  };

  return (
    <div className="rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-[0_20px_50px_rgba(90,40,10,0.06),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tones[accent]}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#a07d67]">
            {label}
          </p>
          <p className="mt-1 text-xl font-black tracking-[-0.02em] text-[#2b1d10]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "orange" | "green" | "red" | "blue";
}) {
  const map = {
    neutral: "bg-[#f6f1ec] text-[#7b6557]",
    orange: "bg-[#fff4d6] text-[#c4620c]",
    green: "bg-[#e6f4ed] text-[#1f6f3a]",
    red: "bg-[#fde8e7] text-[#c42d1f]",
    blue: "bg-[#e3e8ff] text-[#1f4bbf]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.24em] ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 6 });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const editingUser = editingUserId
    ? users.find((user) => user.id === editingUserId) ?? null
    : null;

  const openEditModal = useCallback((user: AuthenticatedUser) => {
    setEditingUserId(user.id);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingUserId(null);
    setIsEditModalOpen(false);
  }, []);

  const startEditing = useCallback(
    (user: AuthenticatedUser) => {
      openEditModal(user);
    },
    [openEditModal],
  );

  const handleEditSuccess = useCallback(async () => {
    await loadUsers();
    closeEditModal();
  }, [closeEditModal, loadUsers]);

  const handleToggleActive = async (user: AuthenticatedUser) => {
    setIsActing(true);
    try {
      const updated = user.isActive
        ? await deactivateUser(user.id)
        : await activateUser(user.id);

      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(updated.isActive ? "Utilisateur activé." : "Utilisateur désactivé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de mettre à jour le statut.");
    } finally {
      setIsActing(false);
    }
  };

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
    if (!query) return true;

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
  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.filter((user) => !user.isActive).length;
  const totalCount = users.length;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,252,248,0.96),rgba(253,246,240,0.92))] p-6 shadow-[0_40px_90px_rgba(90,40,10,0.12),0_2px_0_rgba(255,255,255,0.95)_inset] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,130,30,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,115,29,0.08),transparent_24%)]" />
        <div className="pointer-events-none absolute -left-10 top-10 h-36 w-36 rounded-full bg-[#f7c89e]/25 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#ffd7b5]/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f2d8c2] bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#c26e1d] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Administration
              </div>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-[#2b1d10] sm:text-3xl">
                Gestion des utilisateurs
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#7f6656]">
                Administrez les accès, les rôles, les profils DSI et l’activation des comptes dans
                une interface plus claire et plus engageante.
              </p>
            </div>

            <div className="text-xs font-bold uppercase tracking-[0.35em] text-[#b86112]">
              Accès • rôles • sécurité
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={<Users className="h-5 w-5" />} label="Total comptes" value={totalCount} />
            <StatCard
              icon={<UserCheck className="h-5 w-5" />}
              label="Comptes actifs"
              value={activeCount}
              accent="green"
            />
            <StatCard
              icon={<UserX className="h-5 w-5" />}
              label="Comptes inactifs"
              value={inactiveCount}
              accent="red"
            />
          </div>
        </div>
      </div>

      {/* Main panel */}
      <div className="rounded-[32px] border border-white/80 bg-white/80 p-5 shadow-[0_32px_80px_rgba(90,40,10,0.08),0_2px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl sm:p-6">
        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-[#b86112]">
              Utilisateurs enregistrés
            </p>
            <p className="mt-1 text-sm text-[#6b5446]">{filteredCount} compte(s) correspondant au filtre</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b39b8a]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par nom, email, rôle..."
                className="w-full rounded-2xl border border-[#e7dbd1] bg-white/90 py-3 pl-11 pr-4 text-sm text-[#2b1d10] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] outline-none transition-all duration-200 focus:border-[#d9731d] focus:shadow-[0_0_0_4px_rgba(217,115,29,0.10)]"
              />
            </div>

            <Link
              href={creationRoute}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#f0932f] via-[#d9731d] to-[#ad510f] px-5 py-3 text-[0.7rem] font-black uppercase tracking-[0.28em] text-white shadow-[0_12px_28px_rgba(217,115,29,0.32)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_16px_34px_rgba(217,115,29,0.4)]"
            >
              + Créer un utilisateur
            </Link>
          </div>
        </div>

        {/* Table wrapper */}
        <div className="overflow-hidden rounded-[24px] border border-[#f1e8df] bg-[#fffdfa] shadow-[0_20px_40px_rgba(90,40,10,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fcf7f2] text-[11px] uppercase tracking-[0.28em] text-[#907d6c]">
                <tr>
                  <th className="px-4 py-4 font-extrabold">Login</th>
                  <th className="px-4 py-4 font-extrabold">Nom complet</th>
                  <th className="px-4 py-4 font-extrabold">Email</th>
                  <th className="px-4 py-4 font-extrabold">Service</th>
                  <th className="px-4 py-4 font-extrabold">Profil DSI</th>
                  <th className="px-4 py-4 font-extrabold">Type</th>
                  <th className="px-4 py-4 font-extrabold">Rôle</th>
                  <th className="px-4 py-4 font-extrabold">Mot de passe</th>
                  <th className="px-4 py-4 font-extrabold">Statut</th>
                  <th className="px-4 py-4 font-extrabold">Rapports</th>
                  <th className="px-4 py-4 text-right font-extrabold">Actions</th>
                </tr>
              </thead>

              <tbody className="text-[#2b1d10]">
                {loading && !paginatedRows.length ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center text-sm text-[#6b5446]">
                      Chargement des utilisateurs…
                    </td>
                  </tr>
                ) : filteredCount ? (
                  paginatedRows.map((row, index) => {
                    const user = row.original;

                    return (
                      <tr
                        key={user.id}
                        className={`border-t border-[#f3ece2] transition-colors hover:bg-[#fff8f2] ${
                          index % 2 === 0 ? "bg-white" : "bg-[#fffdfb]"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="font-bold text-[#2b1d10]">{user.matricule}</div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-[#2b1d10]">
                            {user.prenom} {user.nom}
                          </div>
                          <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#b5a99a]">
                            {user.direction ?? "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs text-[#6b5446]">{user.email}</td>

                        <td className="px-4 py-4 text-[#2b1d10]">{user.service ?? "—"}</td>

                        <td className="px-4 py-4">
                          {user.dsiTicketRole ? (
                            <Badge tone="blue">{dsiRoleLabels[user.dsiTicketRole]}</Badge>
                          ) : (
                            <Badge tone="neutral">Employé simple</Badge>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <Badge tone={user.isResponsable ? "orange" : "neutral"}>
                            {user.isResponsable ? "Responsable" : "Employé simple"}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <Badge tone="orange">{roleLabels[user.role]}</Badge>
                        </td>

                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#eee4db] bg-white px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.28em] text-[#7c6658] shadow-sm">
                            <span className="text-[0.55rem]">••••••••</span>
                            <Eye className="h-3.5 w-3.5 text-[#b5a99a]" />
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <Badge tone={user.isActive ? "green" : "red"}>
                            {user.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {user.accessReport && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ed] px-3 py-1 text-[0.55rem] font-extrabold uppercase tracking-[0.2em] text-[#1f6f3a]">
                                <Check className="h-3 w-3" />
                                Rapports
                              </span>
                            )}

                            {user.exportReport && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#e3e8ff] px-3 py-1 text-[0.55rem] font-extrabold uppercase tracking-[0.2em] text-[#1f4bbf]">
                                <Shield className="h-3 w-3" />
                                CSV/PDF
                              </span>
                            )}

                            {!user.accessReport && !user.exportReport && (
                              <span className="text-[0.7rem] text-[#b5a99a]">Aucun accès</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(user)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#dccdc0] bg-white px-3.5 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-[#2b1d10] shadow-sm transition-all duration-150 hover:-translate-y-px hover:border-[#c8b7ab] hover:shadow-md"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Éditer
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              disabled={isActing}
                              className={`rounded-full px-3.5 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.24em] transition-all duration-150 disabled:opacity-60 ${
                                user.isActive
                                  ? "border border-[#e6b4ae] bg-white text-[#c42d1f] hover:bg-[#fff3f1]"
                                  : "border border-[#b8dfc4] bg-white text-[#1f6f3a] hover:bg-[#f3fcf6]"
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
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff4ea] text-[#d9731d]">
                          <Users className="h-6 w-6" />
                        </div>
                        <p className="text-base font-bold text-[#2b1d10]">
                          Aucun utilisateur disponible
                        </p>
                        <p className="text-sm text-[#7f6656]">
                          Essaie d’élargir la recherche ou crée un nouveau compte utilisateur.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer / pagination */}
        <div className="mt-5 flex flex-col gap-3 rounded-[22px] border border-[#f1e7de] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(252,247,242,0.88))] px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="text-[0.75rem] font-extrabold uppercase tracking-[0.22em] text-[#6b5446]">
            {filteredCount} résultat(s) • page {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-2 rounded-full border border-[#d8c8bb] bg-white px-4 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-[#2b1d10] transition-all hover:-translate-y-px disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Précédent
            </button>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-2 rounded-full border border-[#d8c8bb] bg-white px-4 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.2em] text-[#2b1d10] transition-all hover:-translate-y-px disabled:opacity-50"
            >
              Suivant
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="rounded-2xl border border-[#e2dbd1] bg-white px-3 py-2 text-[0.75rem] font-semibold text-[#2b1d10] outline-none transition-all focus:border-[#d9731d]"
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

      {/* Modal */}
      {editingUser && isEditModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-auto bg-[rgba(20,10,5,0.55)] px-4 py-8 backdrop-blur-md">
          <div className="relative w-full max-w-4xl">
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute right-3 top-3 z-10 rounded-full border border-white/40 bg-white/85 p-2 text-[#2b1d10] shadow-lg transition hover:scale-105 hover:bg-white"
              aria-label="Fermer la fenêtre d'édition"
            >
              <X className="h-4 w-4" />
            </button>

            <UserForm
              initialUser={editingUser}
              onCancel={closeEditModal}
              onSuccess={handleEditSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}
