"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  ColumnDef,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import toast from "react-hot-toast";
import { activateUser, deactivateUser, listUsers } from "@/api/users";
import type { AuthenticatedUser, UserRole } from "@/api/types";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { UserForm } from "./UserForm";

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Admin",
  ADMIN: "Admin",
  USER: "User",
};

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "orange";
}) {
  const styles = {
    neutral: "bg-[#f2f4f7] text-[#667085]",
    green: "bg-[#ecfdf3] text-[#067647]",
    red: "bg-[#fef3f2] text-[#b42318]",
    orange: "bg-[#fff7ed] text-[#c2410c]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function UserManagementPanel() {
  const { user: currentUser } = useCurrentUser();
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
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
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs.",
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

  const closeEditModal = useCallback(() => {
    setEditingUserId(null);
    setIsEditModalOpen(false);
  }, []);

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
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le statut."
      );
    } finally {
      setIsActing(false);
    }
  };

  const userColumns = useMemo<ColumnDef<AuthenticatedUser>[]>(
    () => [
      { id: "login", accessorFn: (user) => user.matricule },
      { id: "name", accessorFn: (user) => `${user.prenom} ${user.nom}` },
      { id: "email", accessorFn: (user) => user.email },
      { id: "service", accessorFn: (user) => user.service?.name ?? "" },
      { id: "role", accessorFn: (user) => user.role },
    ],
    [],
  );

  const userGlobalFilter = useCallback<FilterFn<AuthenticatedUser>>((row, _columnId, filterValue) => {
    const query = String(filterValue ?? "").trim().toLowerCase();
    if (!query) return true;

    const user = row.original;
    const haystack = [
      user.matricule,
      user.nom,
      user.prenom,
      user.email,
      user.service?.name ?? "",
      user.role,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  }, []);

  const visibleUsers = useMemo(() => {
    if (!currentUser) return users;
    const filtered = users.filter((item) => item.id !== currentUser.id);
    if (currentUser.role === "SUPER_ADMIN") {
      return filtered;
    }
    return filtered.filter((item) => item.role === "EMPLOYE" || item.role === "READER");
  }, [currentUser, users]);

  const table = useReactTable({
    data: visibleUsers,
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
  }, [visibleUsers.length, table]);

  const paginatedRows = table.getPaginationRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const activeCount = visibleUsers.filter((user) => user.isActive).length;

  return (
    <div className="mx-auto  max-w-[260px] sm:max-w-[550px] lg:max-w-[700px] xl:max-w-[900px] 2xl:max-w-[1280px] 3xl:max-w-[1440px]">
      <div className="mb-4">
        <h1 className="text-[32px] font-bold leading-tight text-[#1f2937]">
          Gestion des Utilisateurs
        </h1>
        <p className="mt-1 text-sm text-[#667085]">
          {visibleUsers.length} compte(s) — {activeCount} actif(s)
        </p>
      </div>

      <div className="rounded-2xl border border-[#eaecf0] bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#344054]">
              Utilisateurs enregistrés
            </h2>
            <p className="mt-1 text-xs text-[#667085]">
              {filteredCount} compte(s)
            </p>
          </div>

          <div className="relative w-full max-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-xl border border-[#eaecf0] bg-white py-2 pl-9 pr-3 text-sm text-[#101828] outline-none focus:border-[#d0d5dd]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#eaecf0]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-[#f9fafb]">
                  <tr className="text-[11px] uppercase tracking-wide text-[#667085]">
                    <th className="px-4 py-3 font-semibold">Login</th>
                    <th className="px-4 py-3 font-semibold">Nom complet</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Service</th>
                    <th className="px-4 py-3 font-semibold">Rôle</th>
                    <th className="px-4 py-3 font-semibold">Mot de passe</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Rapports</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eaecf0] bg-white text-sm">
                  {loading && !paginatedRows.length ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-[#667085]">
                        Chargement des utilisateurs…
                      </td>
                    </tr>
                  ) : filteredCount ? (
                    paginatedRows.map((row) => {
                      const user = row.original;

                      return (
                        <tr key={user.id} className="hover:bg-[#fcfcfd]">
                          <td className="px-4 py-3 text-xs font-semibold text-[#475467]">
                            {user.matricule}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#101828]">
                              {user.prenom} {user.nom}
                            </div>
                            <div className="text-[11px] text-[#98a2b3]">
                              {user.department?.name ?? "—"}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-[#475467]">{user.email}</td>
                          <td className="px-4 py-3 text-[#475467]">{user.service?.name ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Badge tone="orange">{roleLabels[user.role]}</Badge>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-full border border-[#eaecf0] px-3 py-1 text-xs text-[#667085]"
                            >
                              ••••••••
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <Badge tone={user.isActive ? "green" : "red"}>
                              {user.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </td>

                          <td className="px-4 py-3">
                            {user.accessReport ? (
                              <span className="inline-flex items-center gap-1 text-xs text-[#067647]">
                                <Check className="h-3.5 w-3.5" />
                                Oui
                              </span>
                            ) : (
                              <span className="text-xs text-[#98a2b3]">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUserId(user.id);
                                  setIsEditModalOpen(true);
                                }}
                                className="rounded-md border border-[#d0d5dd] px-3 py-1.5 text-xs font-medium text-[#344054] hover:bg-[#f9fafb]"
                              >
                                Éditer
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleActive(user)}
                                disabled={isActing}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                                  user.isActive
                                    ? "border border-[#fecdca] text-[#b42318] hover:bg-[#fef3f2]"
                                    : "border border-[#abefc6] text-[#067647] hover:bg-[#ecfdf3]"
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
                      <td colSpan={9} className="px-4 py-10 text-center text-[#667085]">
                        Aucun utilisateur disponible.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#667085]">
              {filteredCount} résultat(s) • page {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount() || 1}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d0d5dd] px-3 py-2 text-xs text-[#344054] disabled:opacity-50 w-full justify-center sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="inline-flex items-center gap-1 rounded-lg border border-[#d0d5dd] px-3 py-2 text-xs text-[#344054] disabled:opacity-50 w-full justify-center sm:w-auto"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>

              <select
                value={table.getState().pagination.pageSize}
                onChange={(event) => table.setPageSize(Number(event.target.value))}
                className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-xs text-[#344054] sm:w-auto"
              >
                {[5, 10, 20].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      {editingUser && isEditModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-4 shadow-xl">
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute right-3 top-3 rounded-full border border-[#eaecf0] p-2 text-[#344054]"
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
