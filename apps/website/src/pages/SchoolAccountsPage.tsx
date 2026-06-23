import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  SchoolIcon,
  UserRoundPlusIcon,
} from "lucide-react"

import { AlertToast } from "@/components/ui/alert-toast"
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
import { DashboardShell } from "@/pages/components/DashboardShell"

type FormState = {
  address: string
  npsn: string
  password: string
  schoolName: string
  sppgId: string
  username: string
}

const initialForm: FormState = {
  address: "",
  npsn: "",
  password: "",
  schoolName: "",
  sppgId: "",
  username: "",
}

const progressLabels: Record<string, string> = {
  BELUM_ADA: "Belum ada",
  MENUNGGU_PRODUKSI: "Menunggu produksi",
  DIPRODUKSI: "Diproduksi",
  SIAP_DIKIRIM: "Siap dikirim",
  DIKIRIM: "Dikirim",
  DITERIMA: "Diterima",
  BERMASALAH: "Bermasalah",
}

export function SchoolAccountsPage() {
  const { profile } = useAuth()
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [schools, setSchools] = useState<SchoolAccount[]>([])
  const [sppgUsers, setSppgUsers] = useState<ManagedUser[]>([])

  const sortedSchools = useMemo(
    () => [...schools].sort((a, b) => a.name.localeCompare(b.name)),
    [schools]
  )

  async function loadData() {
    setIsLoading(true)
    setError(null)

    try {
      const [schoolResponse, usersResponse] = await Promise.all([
        api.schoolAccounts.list(),
        profile?.role === "SUPER_ADMIN"
          ? api.users.list()
          : Promise.resolve({ users: [] }),
      ])

      setSchools(schoolResponse.schools)
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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAlertMessage(null)
    setDialogError(null)
    setError(null)

    try {
      const response = await api.schoolAccounts.create({
        address: form.address,
        npsn: form.npsn,
        password: form.password,
        schoolName: form.schoolName,
        sppgId: form.sppgId || undefined,
        username: form.username,
      })

      setSchools((currentSchools) => [...currentSchools, response.school])
      setAlertMessage("Akun sekolah berhasil dibuat.")
      setForm(initialForm)
      setIsDialogOpen(false)
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : "Gagal membuat akun sekolah."
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
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
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
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
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
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {progressLabels[school.progress?.status ?? "BELUM_ADA"] ??
                        school.progress?.status ??
                        "Belum ada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(school.createdAt).toLocaleDateString("id-ID")}
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
            <DialogTitle>Tambah akun sekolah</DialogTitle>
            <DialogDescription>
              Satu akun dipakai bersama oleh pihak sekolah untuk melihat dan
              memperbarui progress sekolahnya.
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
              NPSN
              <Input
                value={form.npsn}
                onChange={(event) =>
                  setForm((value) => ({ ...value, npsn: event.target.value }))
                }
                placeholder="Opsional"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Alamat tujuan
              <Input
                value={form.address}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    address: event.target.value,
                  }))
                }
                placeholder="Alamat pengiriman makanan"
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
                  required
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
                <PlusIcon />
                Tambah
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
