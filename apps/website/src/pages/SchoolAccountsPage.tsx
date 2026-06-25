import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  SchoolIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserRoundPlusIcon,
} from "lucide-react"

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
import { api, type ManagedUser, type SchoolAccount } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"

type FormState = {
  address: string
  id?: string
  password: string
  schoolName: string
  sppgId: string
  username: string
}

const initialForm: FormState = {
  address: "",
  password: "",
  schoolName: "",
  sppgId: "",
  username: "",
}

export function SchoolAccountsPage() {
  const { profile } = useAuth()
  const cachedSchools = getCachedPageData<SchoolAccount[]>(
    pageCacheKeys.schoolAccounts
  )
  const cachedUsers = getCachedPageData<ManagedUser[]>(pageCacheKeys.users)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(!cachedSchools)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SchoolAccount | null>(null)
  const [schools, setSchools] = useState<SchoolAccount[]>(
    () => cachedSchools ?? []
  )
  const [sppgUsers, setSppgUsers] = useState<ManagedUser[]>(() =>
    (cachedUsers ?? []).filter((user) => user.role === "SPPG")
  )

  const sortedSchools = useMemo(
    () => [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    [schools]
  )

  async function loadData() {
    if (cachedSchools && (profile?.role !== "SUPER_ADMIN" || cachedUsers)) {
      setSchools(cachedSchools)
      setSppgUsers((cachedUsers ?? []).filter((user) => user.role === "SPPG"))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [schoolResponse, usersResponse] = await Promise.all([
        api.schoolAccounts.list(),
        profile?.role === "SUPER_ADMIN"
          ? api.users.list()
          : Promise.resolve({ users: [] }),
      ])

      setSchools(setCachedPageData(pageCacheKeys.schoolAccounts, schoolResponse.schools))
      if (profile?.role === "SUPER_ADMIN") {
        setCachedPageData(pageCacheKeys.users, usersResponse.users)
      }
      setSppgUsers(usersResponse.users.filter((user) => user.role === "SPPG"))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal memuat akun sekolah."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.role === "SPPG" || profile?.role === "SUPER_ADMIN") {
      void loadData()
    }
  }, [profile?.role])

  function openCreateDialog() {
    setDialogError(null)
    setForm(initialForm)
    setIsPasswordVisible(false)
    setIsDialogOpen(true)
  }

  function openEditDialog(school: SchoolAccount) {
    setDialogError(null)
    setForm({
      address: school.address ?? "",
      id: school.id,
      password: "",
      schoolName: school.name,
      sppgId: school.sppg.id,
      username: school.account?.username ?? "",
    })
    setIsPasswordVisible(false)
    setIsDialogOpen(true)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setAlertMessage(null)
    setDialogError(null)
    setError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        address: form.address,
        ...(form.password ? { password: form.password } : {}),
        schoolName: form.schoolName,
        sppgId: form.sppgId || undefined,
        username: form.username,
      }

      if (form.id) {
        const response = await api.schoolAccounts.update(form.id, payload)
        setSchools((currentSchools) =>
          setCachedPageData(
            pageCacheKeys.schoolAccounts,
            currentSchools.map((school) =>
              school.id === response.school.id ? response.school : school
            )
          )
        )
        setAlertMessage("Akun sekolah berhasil diperbarui.")
      } else {
        const response = await api.schoolAccounts.create({
          ...payload,
          password: form.password,
        })
        setSchools((currentSchools) =>
          setCachedPageData(pageCacheKeys.schoolAccounts, [
            ...currentSchools,
            response.school,
          ])
        )
        setAlertMessage("Akun sekolah berhasil dibuat.")
      }

      setForm(initialForm)
      setIsDialogOpen(false)
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Gagal membuat akun sekolah."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteSchoolAccount() {
    if (!deleteTarget) return
    setAlertMessage(null)
    setError(null)

    try {
      await api.schoolAccounts.delete(deleteTarget.id)
      setSchools((currentSchools) =>
        setCachedPageData(
          pageCacheKeys.schoolAccounts,
          currentSchools.filter((school) => school.id !== deleteTarget.id)
        )
      )
      setDeleteTarget(null)
      setAlertMessage("Akun sekolah berhasil dihapus.")
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal menghapus akun sekolah."
      )
    }
  }

  return (
    <DashboardShell title="Akun Sekolah">
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
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Master data
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Akun Sekolah
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Kelola akun sekolah dan alamat sekolah untuk akses distribusi dari SPPG.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Daftar akun sekolah</h1>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-36" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {sortedSchools.length} sekolah terhubung
              </p>
            )}
          </div>
          <Button onClick={openCreateDialog}>
            <UserRoundPlusIcon />
            Tambah akun sekolah
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Sekolah</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">SPPG</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-44" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="ml-auto h-8 w-28" />
                      </td>
                    </tr>
                  ))
                : null}
              {sortedSchools.map((school) => (
                <tr key={school.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                        <SchoolIcon className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium">{school.name}</p>
                        <p className="mt-1 max-w-md text-xs text-muted-foreground">
                          {school.address || "Alamat belum diisi"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {school.account?.username ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {school.sppg.username}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(school.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(school)}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(school)}
                      >
                        <Trash2Icon />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && sortedSchools.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada akun sekolah.
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
              {form.id ? "Edit akun sekolah" : "Tambah akun sekolah"}
            </DialogTitle>
            <DialogDescription>
              {form.id
                ? "Perbarui data sekolah dan akun login sekolah."
                : "Satu akun dipakai bersama oleh pihak sekolah untuk melihat dan memperbarui progress sekolahnya."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nama sekolah
              <Input
                value={form.schoolName}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    schoolName: event.target.value,
                  }))
                }
                placeholder="Contoh: SDN 01 Pagi"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Alamat sekolah
              <Input
                value={form.address}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    address: event.target.value,
                  }))
                }
                placeholder="Contoh: Jl. Merdeka No. 10"
              />
            </label>

            {profile?.role === "SUPER_ADMIN" ? (
              <label className="grid gap-2 text-sm font-medium">
                SPPG penanggung jawab
                <select
                  value={form.sppgId}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      sppgId: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  required
                >
                  <option value="">Pilih SPPG...</option>
                  {sppgUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-medium">
              Username akun sekolah
              <Input
                value={form.username}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    username: event.target.value,
                  }))
                }
                placeholder="contoh: sdn_01_pagi"
                required
              />
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
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  required={!form.id}
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
              <Button type="submit" pending={isSubmitting} disabled={isSubmitting}>
                <PlusIcon />
                {form.id ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus akun sekolah?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun {deleteTarget?.name} dan akses login sekolahnya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                void deleteSchoolAccount()
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
