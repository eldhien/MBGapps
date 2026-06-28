import { useEffect, useMemo, useState } from "react"
import {
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
  TriangleAlertIcon,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/ui/table-pagination"
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

const DRIVERS_PER_PAGE = 10

export function DriversPage() {
  const cachedDrivers = getCachedPageData<Driver[]>(pageCacheKeys.drivers)
  const [drivers, setDrivers] = useState<Driver[]>(() => cachedDrivers ?? [])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(!cachedDrivers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingDriver, setIsDeletingDriver] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const sortedDrivers = useMemo(
    () =>
      [...drivers].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return a.name.localeCompare(b.name)
      }),
    [drivers]
  )
  const totalPages = Math.max(
    1,
    Math.ceil(sortedDrivers.length / DRIVERS_PER_PAGE)
  )
  const paginatedDrivers = useMemo(
    () =>
      sortedDrivers.slice(
        (currentPage - 1) * DRIVERS_PER_PAGE,
        currentPage * DRIVERS_PER_PAGE
      ),
    [currentPage, sortedDrivers]
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

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

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
    if (isSubmitting) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

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
          setCachedPageData(pageCacheKeys.drivers, [
            ...current,
            response.driver,
          ])
        )
        setSuccess("Driver berhasil ditambahkan.")
      }

      setIsDialogOpen(false)
      setForm(initialForm)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal menyimpan driver."
      )
    } finally {
      setIsSubmitting(false)
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
      setError(
        error instanceof Error ? error.message : "Gagal mengubah status driver."
      )
    }
  }

  async function deleteDriver() {
    if (!deleteTarget || isDeletingDriver) return
    setError(null)
    setSuccess(null)
    setIsDeletingDriver(true)

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
      setError(
        error instanceof Error ? error.message : "Gagal menghapus driver."
      )
    } finally {
      setIsDeletingDriver(false)
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Master Data Driver
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Kelola data driver aktif yang bisa dipilih saat membuat distribusi
            makanan.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[#edf0f4] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-semibold tracking-tight">
                Daftar driver
              </h1>
              <span className="text-lg font-semibold text-muted-foreground">
                {isLoading ? "..." : sortedDrivers.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Data driver dan kendaraan untuk distribusi makanan.
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="h-10 rounded-lg bg-[#0528f2] px-4 text-white hover:bg-[#0422c8]"
          >
            <PlusIcon />
            Tambah driver
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[#edf0f4] bg-[#fcfcfd] text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">No HP</th>
                <th className="px-5 py-3 font-medium">Kendaraan</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-[#edf0f4]">
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="ml-auto h-8 w-28" />
                      </td>
                    </tr>
                  ))
                : null}
              {!isLoading &&
                paginatedDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="border-b border-[#edf0f4] last:border-0 hover:bg-[#fcfcfd]"
                  >
                    <td className="px-5 py-4 font-semibold">{driver.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {driver.phone || "-"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {driver.vehicleNumber || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          driver.isActive
                            ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-100"
                            : "rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                        }
                      >
                        {driver.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-[#e3e7ef]"
                          onClick={() => openEditDialog(driver)}
                        >
                          <PencilIcon />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => toggleDriver(driver)}
                        >
                          <PowerIcon />
                          {driver.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(driver)}
                        >
                          <Trash2Icon />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!isLoading && sortedDrivers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    Belum ada driver.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {!isLoading && sortedDrivers.length > DRIVERS_PER_PAGE ? (
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : null}
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
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
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
              <Button
                type="submit"
                pending={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? form.id
                    ? "Menyimpan..."
                    : "Menambah..."
                  : form.id
                    ? "Simpan"
                    : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) =>
          !open && !isDeletingDriver && setDeleteTarget(null)
        }
      >
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
            <AlertDialogCancel disabled={isDeletingDriver}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingDriver}
              onClick={(event) => {
                event.preventDefault()
                void deleteDriver()
              }}
            >
              {isDeletingDriver ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
