import { useEffect, useMemo, useState } from "react"
import { PencilIcon, PlusIcon, PowerIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type Driver } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"

type FormState = {
  id?: string
  name: string
  phone: string
  vehicleNumber: string
}

const initialForm: FormState = {
  name: "",
  phone: "",
  vehicleNumber: "",
}

export function DriversPage() {
  const cachedDrivers = getCachedPageData<Driver[]>(pageCacheKeys.drivers)
  const [drivers, setDrivers] = useState<Driver[]>(() => cachedDrivers ?? [])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(!cachedDrivers)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)

  const sortedDrivers = useMemo(
    () =>
      [...drivers].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return a.name.localeCompare(b.name)
      }),
    [drivers]
  )

  async function loadDrivers() {
    if (cachedDrivers) {
      setDrivers(cachedDrivers)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.drivers.list()
      setDrivers(setCachedPageData(pageCacheKeys.drivers, response.drivers))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal memuat driver.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDrivers()
  }, [])

  function openCreateDialog() {
    setForm(initialForm)
    setIsDialogOpen(true)
  }

  function openEditDialog(driver: Driver) {
    setForm({
      id: driver.id,
      name: driver.name,
      phone: driver.phone ?? "",
      vehicleNumber: driver.vehicleNumber ?? "",
    })
    setIsDialogOpen(true)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        vehicleNumber: form.vehicleNumber,
      }

      if (form.id) {
        const response = await api.drivers.update(form.id, payload)
        setDrivers((current) =>
          setCachedPageData(
            pageCacheKeys.drivers,
            current.map((driver) =>
              driver.id === response.driver.id ? response.driver : driver
            )
          )
        )
        setSuccess("Driver berhasil diperbarui.")
      } else {
        const response = await api.drivers.create(payload)
        setDrivers((current) =>
          setCachedPageData(pageCacheKeys.drivers, [...current, response.driver])
        )
        setSuccess("Driver berhasil ditambahkan.")
      }

      setIsDialogOpen(false)
      setForm(initialForm)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menyimpan driver.")
    }
  }

  async function toggleDriver(driver: Driver) {
    setError(null)
    setSuccess(null)

    try {
      const response = await api.drivers.update(driver.id, {
        isActive: !driver.isActive,
      })
      setDrivers((current) =>
        setCachedPageData(
          pageCacheKeys.drivers,
          current.map((item) =>
            item.id === response.driver.id ? response.driver : item
          )
        )
      )
      setSuccess(
        response.driver.isActive
          ? "Driver berhasil diaktifkan."
          : "Driver berhasil dinonaktifkan."
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal mengubah status driver.")
    }
  }

  async function deleteDriver() {
    if (!deleteTarget) return
    setError(null)
    setSuccess(null)

    try {
      await api.drivers.delete(deleteTarget.id)
      setDrivers((current) =>
        setCachedPageData(
          pageCacheKeys.drivers,
          current.filter((driver) => driver.id !== deleteTarget.id)
        )
      )
      setDeleteTarget(null)
      setSuccess("Driver berhasil dihapus.")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menghapus driver.")
    }
  }

  return (
    <DashboardShell title="Driver">
      {success ? (
        <AlertToast
          title="Berhasil"
          description={success}
          onClose={() => setSuccess(null)}
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

      <section className="pb-1">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Master data
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Master Data Driver
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Kelola data driver aktif yang bisa dipilih saat membuat distribusi makanan.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Master Data Driver</h1>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-32" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {sortedDrivers.length} driver terdaftar
              </p>
            )}
          </div>
          <Button onClick={openCreateDialog}>
            <PlusIcon />
            Tambah driver
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">No HP</th>
                <th className="px-4 py-3 font-medium">Kendaraan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-36" />
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
                      <td className="px-4 py-3">
                        <Skeleton className="ml-auto h-8 w-28" />
                      </td>
                    </tr>
                  ))
                : null}
              {sortedDrivers.map((driver) => (
                <tr key={driver.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{driver.name}</td>
                  <td className="px-4 py-3">{driver.phone || "-"}</td>
                  <td className="px-4 py-3">{driver.vehicleNumber || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {driver.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(driver)}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleDriver(driver)}
                      >
                        <PowerIcon />
                        {driver.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(driver)}
                      >
                        <Trash2Icon />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && sortedDrivers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada driver.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit driver" : "Tambah driver"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nama driver
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              No HP
              <Input
                value={form.phone}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value.replace(/\D/g, ""),
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              No kendaraan
              <Input
                value={form.vehicleNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    vehicleNumber: event.target.value,
                  }))
                }
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">{form.id ? "Simpan" : "Tambah"}</Button>
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
            <AlertDialogTitle>Hapus driver?</AlertDialogTitle>
            <AlertDialogDescription>
              Driver {deleteTarget?.name} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                void deleteDriver()
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
