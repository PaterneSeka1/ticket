"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, Shield, X } from "lucide-react";
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
  const activeCount = users.filter((user) => user.isActive).length;
  const totalCount = users.length;

  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-baseline lg:justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-semibold text-[#2b1d10]">Gestion des utilisateurs</p>
          <p className="text-sm text-[#6b5446]">
            {totalCount} compte(s) — {activeCount} actif(s)
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.4em] text-[#b86112]">Administrer les accès et les profils</div>
      </div>

      <div className="grid gap-6">
        <div className="flex flex-col gap-4 rounded-[32px] border border-[#f0d7c6] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b86112]">
                Utilisateurs enregistrés
              </p>
              <p className="text-sm text-[#6b5446]">{filteredCount} compte(s) filtrés</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher..."
                className="rounded-[16px] border border-[#e2dbd1] bg-white px-4 py-2 text-sm text-[#2b1d10]"
              />
              <Link
                href={creationRoute}
                className="rounded-full border border-[#c6b6a9] px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#2b1d10]"
              >
                Créer un utilisateur
              </Link>
            </div>
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
                          <p className="font-semibold text-[#2b1d10]">
                            {user.prenom} {user.nom}
                          </p>
                          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#b5a99a]">
                            {user.direction ?? "—"}
                          </p>
                        </td>
                        <td className="py-4 text-xs text-[#6b5446]">{user.email}</td>
                        <td className="py-4 text-[#2b1d10]">{user.service ?? "—"}</td>
                        <td className="py-4 text-[#2b1d10]">
                          {user.dsiTicketRole ? dsiRoleLabels[user.dsiTicketRole] : "Employé simple"}
                        </td>
                        <td className="py-4 text-[#2b1d10]">
                          {user.isResponsable ? "Responsable" : "Employé simple"}
                        </td>
                        <td className="py-4">
                          <span className="inline-flex rounded-full bg-[#fff4d6] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#c4620c]">
                            {roleLabels[user.role]}
                          </span>
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
                              className="rounded-full border border-[#d6c5b4] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#2b1d10]"
                            >
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

          <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-[#f3ece2] bg-white/50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-[#6b5446]">
              {filteredCount} résultat(s) • page {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount() || 1}
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

      {editingUser && isEditModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-auto bg-black/40 px-4 py-8">
          <div className="relative w-full max-w-3xl">
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute right-2 top-2 rounded-full border border-white/40 bg-white/80 p-2 text-[#2b1d10] shadow-lg transition hover:bg-white"
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
