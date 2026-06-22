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
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Navigate } from "react-router-dom"

const roles: UserRole[] = ["SUPER_ADMIN", "SPPG", "SEKOLAH"]

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [users, setUsers] = useState<ManagedUser[]>(() => cachedUsers ?? [])

  const isEditing = Boolean(form.id)

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users]
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
    setAlertMessage(null)
    setDialogError(null)
    setError(null)

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
    }
  }

  async function onDelete() {
    if (!deleteTarget) return

    setAlertMessage(null)
    setError(null)

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

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Daftar pengguna</h1>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-32" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {sortedUsers.length} pengguna terdaftar
              </p>
            )}
          </div>
          <Button onClick={openCreateDialog}>
            <PlusIcon />
            Tambah pengguna
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-20" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
              {sortedUsers.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3">{formatRole(user.role)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={user.id === profile.id}
                        onClick={() => setDeleteTarget(user)}
                      >
                        <Trash2Icon />
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && sortedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada pengguna.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit pengguna" : "Tambah pengguna"}
            </DialogTitle>
            <DialogDescription>
              Role dan akses pengguna dikelola oleh Super Admin.
            </DialogDescription>
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
                placeholder="username"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Role
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    role: event.target.value as UserRole,
                  }))
                }
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                  className="pr-10"
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
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                {isEditing ? <PencilIcon /> : <PlusIcon />}
                {isEditing ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengguna {deleteTarget?.username} akan dihapus permanen dari
              sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
