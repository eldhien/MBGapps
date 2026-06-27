import { AlertToast } from "@/components/ui/alert-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/AuthProvider"
import { formatRole, type UserRole } from "@/features/auth/types"
import { api, type ManagedUser } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Navigate } from "react-router-dom"

const roles: UserRole[] = ["SUPER_ADMIN", "SPPG", "SEKOLAH"]
const USERS_PER_PAGE = 10
type RoleFilter = "ALL" | UserRole

type FormState = {
  id?: string
  password: string
  role: UserRole
  username: string
}

const initialForm: FormState = {
  password: "",
  role: "SPPG",
  username: "",
}

export function UsersPage() {
  const { profile } = useAuth()
  const cachedUsers = getCachedPageData<ManagedUser[]>(pageCacheKeys.users)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(!cachedUsers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<ManagedUser[]>(() => cachedUsers ?? [])

  const isEditing = Boolean(form.id)

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users]
  )
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return sortedUsers.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter
      const matchesSearch =
        !query ||
        user.username.toLowerCase().includes(query) ||
        formatRole(user.role).toLowerCase().includes(query)

      return matchesRole && matchesSearch
    })
  }, [roleFilter, searchQuery, sortedUsers])
  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PER_PAGE)
  )
  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (currentPage - 1) * USERS_PER_PAGE,
        currentPage * USERS_PER_PAGE
      ),
    [currentPage, filteredUsers]
  )

  async function loadUsers() {
    const usersCache = getCachedPageData<ManagedUser[]>(pageCacheKeys.users)

    if (usersCache) {
      setUsers(usersCache)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.users.list()
      setUsers(setCachedPageData(pageCacheKeys.users, response.users))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal memuat pengguna."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.role === "SUPER_ADMIN") {
      void loadUsers()
    }
  }, [profile?.role])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, searchQuery])

  if (profile?.role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />
  }

  function openCreateDialog() {
    setDialogError(null)
    setForm(initialForm)
    setIsPasswordVisible(false)
    setIsDialogOpen(true)
  }

  function openEditDialog(user: ManagedUser) {
    setDialogError(null)
    setForm({
      id: user.id,
      password: "",
      role: user.role,
      username: user.username,
    })
    setIsPasswordVisible(false)
    setIsDialogOpen(true)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setAlertMessage(null)
    setDialogError(null)
    setError(null)
    setIsSubmitting(true)

    try {
      if (isEditing && form.id) {
        const response = await api.users.update(form.id, {
          role: form.role,
          username: form.username,
          ...(form.password ? { password: form.password } : {}),
        })
        setUsers((currentUsers) =>
          setCachedPageData(
            pageCacheKeys.users,
            currentUsers.map((user) =>
              user.id === response.user.id ? response.user : user
            )
          )
        )
        setAlertMessage("Pengguna berhasil diperbarui.")
      } else {
        const response = await api.users.create({
          password: form.password,
          role: form.role,
          username: form.username,
        })
        setUsers((currentUsers) =>
          setCachedPageData(pageCacheKeys.users, [
            ...currentUsers,
            response.user,
          ])
        )
        setAlertMessage("Pengguna berhasil dibuat.")
      }

      setForm(initialForm)
      setIsDialogOpen(false)
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Gagal menyimpan pengguna."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onDelete() {
    if (!deleteTarget || isDeletingUser) return

    setAlertMessage(null)
    setError(null)
    setIsDeletingUser(true)

    try {
      await api.users.delete(deleteTarget.id)
      setUsers((currentUsers) =>
        setCachedPageData(
          pageCacheKeys.users,
          currentUsers.filter((user) => user.id !== deleteTarget.id)
        )
      )
      setDeleteTarget(null)
      setAlertMessage("Pengguna berhasil dihapus.")
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal menghapus pengguna."
      )
    } finally {
      setIsDeletingUser(false)
    }
  }

  return (
    <DashboardShell title="Pengguna">
      {alertMessage ? (
        <AlertToast
          title="Berhasil"
          description={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      ) : null}
      {error ? (
        <AlertToast
          title="Terjadi kesalahan"
          description={error}
          variant="destructive"
          onClose={() => setError(null)}
        />
      ) : null}
      {dialogError ? (
        <AlertToast
          title="Gagal menyimpan"
          description={dialogError}
          variant="destructive"
          onClose={() => setDialogError(null)}
        />
      ) : null}

      <section className="pb-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Kelola akun pengguna, role, dan akses dashboard untuk operasional
            MBG.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[#edf0f4] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1">
            <h1 className="text-lg font-semibold tracking-tight">
              Semua pengguna
            </h1>
            <span className="text-lg font-semibold text-muted-foreground">
              {isLoading ? "..." : filteredUsers.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search"
                className="h-10 w-full rounded-lg border-[#e3e7ef] bg-white pl-9 sm:w-64"
              />
            </div>
            <div className="relative">
              <SlidersHorizontalIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as RoleFilter)
                }
                className="h-10 rounded-lg border border-[#e3e7ef] bg-white pr-9 pl-9 text-sm font-medium transition-colors outline-none hover:border-[#cfd6e3] focus:border-[#0528f2] focus:ring-3 focus:ring-[#0528f2]/15"
                aria-label="Filter role"
              >
                <option value="ALL">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={openCreateDialog}
              className="h-10 cursor-pointer rounded-lg bg-[#0528f2] px-4 text-white"
            >
              <PlusIcon />
              Tambah pengguna
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-210 text-sm">
            <thead>
              <tr className="border-b border-[#edf0f4] bg-[#fcfcfd] text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Username</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Terakhir aktif</th>
                <th className="px-5 py-3 font-medium">Tanggal dibuat</th>
                <th className="w-12 px-5 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-[#edf0f4]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-9 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-36" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-40 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-5 py-4" />
                    </tr>
                  ))
                : null}
              {!isLoading &&
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#edf0f4] last:border-0 hover:bg-[#fcfcfd]"
                  >
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {user.username}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-100">
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-[#0528f2]"
                          >
                            <MoreVerticalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            onSelect={() => openEditDialog(user)}
                          >
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={user.id === profile.id}
                            onSelect={() => setDeleteTarget(user)}
                          >
                            <Trash2Icon />
                            Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              {!isLoading && filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    Tidak ada pengguna yang cocok.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredUsers.length > USERS_PER_PAGE ? (
          <div className="flex items-center justify-center gap-2 border-t border-[#edf0f4] p-4">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeftIcon />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1

                return (
                  <button
                    key={page}
                    type="button"
                    className={
                      currentPage === page
                        ? "flex size-8 items-center justify-center rounded-lg bg-[#f3f4f6] text-sm font-semibold"
                        : "flex size-8 items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-[#f7f8fb]"
                    }
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              <ChevronRightIcon />
            </Button>
          </div>
        ) : null}
      </section>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setDialogError(null)
            setForm(initialForm)
            setIsPasswordVisible(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {isEditing ? "Edit pengguna" : "Tambah pengguna"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm">
                  Atur username, role akun, dan password pengguna.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={onSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Username
              <Input
                value={form.username}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    username: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border-[#e3e7ef] bg-white"
                placeholder="Masukkan username"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Role akun
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    role: event.target.value as UserRole,
                  }))
                }
                className="h-10 rounded-xl border border-[#e3e7ef] bg-white px-3 text-sm outline-none focus-visible:border-[#0528f2] focus-visible:ring-[3px] focus-visible:ring-[#0528f2]/15"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Password
              <div className="relative">
                <Input
                  value={form.password}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      password: event.target.value,
                    }))
                  }
                  className="h-10 rounded-xl border-[#e3e7ef] bg-white pr-10"
                  minLength={isEditing ? undefined : 6}
                  placeholder={
                    isEditing
                      ? "Kosongkan jika tidak diganti"
                      : "Minimal 6 karakter"
                  }
                  required={!isEditing}
                  type={isPasswordVisible ? "text" : "password"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsPasswordVisible((value) => !value)}
                  aria-label={
                    isPasswordVisible
                      ? "Sembunyikan password"
                      : "Lihat password"
                  }
                >
                  {isPasswordVisible ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </Button>
              </div>
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-10 cursor-pointer rounded-xl border-[#e3e7ef]"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                pending={isSubmitting}
                disabled={isSubmitting}
                className="h-10 cursor-pointer rounded-xl bg-[#0528f2] px-4 text-white"
              >
                {isEditing ? <PencilIcon /> : <PlusIcon />}
                {isSubmitting
                  ? isEditing
                    ? "Menyimpan..."
                    : "Menambah..."
                  : isEditing
                    ? "Simpan"
                    : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeletingUser) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-orange-50 text-[#f2852e]">
              <TriangleAlertIcon className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              User{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.username}
              </span>{" "}
              akan dihapus permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingUser}
              onClick={(event) => {
                event.preventDefault()
                void onDelete()
              }}
            >
              {isDeletingUser ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
