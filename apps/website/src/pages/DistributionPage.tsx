import { useEffect, useMemo, useState } from "react"
import {
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  api,
  type Driver,
  type ProductionDistribution,
  type SchoolAccount,
} from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"

type SchoolRow = {
  jumlahPorsi: number
  schoolId: string
}

function getCurrentDateTimeLocal() {
  const value = new Date()
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 16)
}

function getDistributionStatus(distribution: ProductionDistribution) {
  return distribution.schools.some((item) => item.status === "DITOLAK")
    ? "DITOLAK"
    : distribution.status
}

export function DistributionPage({ mode = "create" }: { mode?: "create" | "history" }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedBatchIdFromQuery = searchParams.get("batchId") ?? ""
  const cachedBatches = getCachedPageData<any[]>(pageCacheKeys.productionBatches)
  const cachedDistributions = getCachedPageData<ProductionDistribution[]>(
    pageCacheKeys.productionDistributions
  )
  const cachedSchools = getCachedPageData<SchoolAccount[]>(
    pageCacheKeys.schoolAccounts
  )
  const cachedDrivers = getCachedPageData<Driver[]>(pageCacheKeys.drivers)
  const [batches, setBatches] = useState<any[]>(() => cachedBatches ?? [])
  const [distributions, setDistributions] = useState<ProductionDistribution[]>(
    () => cachedDistributions ?? []
  )
  const [drivers, setDrivers] = useState<Driver[]>(() => cachedDrivers ?? [])
  const [schools, setSchools] = useState<SchoolAccount[]>(
    () => cachedSchools ?? []
  )
  const [batchId, setBatchId] = useState(selectedBatchIdFromQuery)
  const [driverId, setDriverId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(
    !cachedBatches || !cachedDistributions || !cachedSchools || !cachedDrivers
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<ProductionDistribution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionDistribution | null>(null)
  const [editTarget, setEditTarget] = useState<ProductionDistribution | null>(null)
  const [editBatchId, setEditBatchId] = useState("")
  const [editDriverId, setEditDriverId] = useState("")
  const [editWaktuKirim, setEditWaktuKirim] = useState(getCurrentDateTimeLocal())
  const [editSchoolRows, setEditSchoolRows] = useState<SchoolRow[]>([])
  const [waktuKirim, setWaktuKirim] = useState(getCurrentDateTimeLocal())
  const [schoolRows, setSchoolRows] = useState<SchoolRow[]>([
    { jumlahPorsi: 0, schoolId: "" },
  ])

  const selectedSchoolIds = useMemo(
    () => new Set(schoolRows.map((row) => row.schoolId).filter(Boolean)),
    [schoolRows]
  )
  const selectedEditSchoolIds = useMemo(
    () => new Set(editSchoolRows.map((row) => row.schoolId).filter(Boolean)),
    [editSchoolRows]
  )
  const productionBatches = useMemo(
    () => batches.filter((batch) => batch.status === "DIPRODUKSI"),
    [batches]
  )
  const editableBatches = useMemo(
    () =>
      batches.filter(
        (batch) => batch.status === "DIPRODUKSI" || batch.id === editBatchId
      ),
    [batches, editBatchId]
  )

  async function fetchLatestData(showLoading: boolean) {
    if (showLoading) setIsLoading(true)
    setError(null)

    try {
      const [batchResponse, schoolResponse, distributionResponse, driverResponse] =
        await Promise.all([
          api.productionBatches.list(),
          api.schoolAccounts.list(),
          api.productionDistributions.list(),
          api.drivers.list({ active: true }),
        ])

      setBatches(setCachedPageData(pageCacheKeys.productionBatches, batchResponse))
      setDrivers(setCachedPageData(pageCacheKeys.drivers, driverResponse.drivers))
      setSchools(setCachedPageData(pageCacheKeys.schoolAccounts, schoolResponse.schools))
      setDistributions(
        setCachedPageData(
          pageCacheKeys.productionDistributions,
          distributionResponse.distributions
        )
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal memuat distribusi."
      )
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  async function loadData(force = false) {
    if (!force) {
      const batchesCache = getCachedPageData<any[]>(pageCacheKeys.productionBatches)
      const distributionsCache = getCachedPageData<ProductionDistribution[]>(
        pageCacheKeys.productionDistributions
      )
      const schoolsCache = getCachedPageData<SchoolAccount[]>(pageCacheKeys.schoolAccounts)
      const driversCache = getCachedPageData<Driver[]>(pageCacheKeys.drivers)

      if (batchesCache && distributionsCache && schoolsCache && driversCache) {
        setBatches(batchesCache)
        setDrivers(driversCache)
        setSchools(schoolsCache)
        setDistributions(distributionsCache)
        setIsLoading(false)
        void fetchLatestData(false)
        return
      }
    }

    await fetchLatestData(true)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const unsubscribeDistributions = subscribePageCache<ProductionDistribution[]>(
      pageCacheKeys.productionDistributions,
      (cachedData) => {
        if (cachedData) {
          setDistributions(cachedData)
          setIsLoading(false)
        }
      }
    )
    const unsubscribeBatches = subscribePageCache<any[]>(
      pageCacheKeys.productionBatches,
      (cachedData) => {
        if (cachedData) setBatches(cachedData)
      }
    )

    return () => {
      unsubscribeDistributions()
      unsubscribeBatches()
    }
  }, [])

  useEffect(() => {
    const refresh = () => {
      void fetchLatestData(false)
    }

    window.addEventListener("focus", refresh)
    window.addEventListener("pageshow", refresh)
    const intervalId = window.setInterval(refresh, 15_000)

    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("pageshow", refresh)
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (selectedBatchIdFromQuery) {
      setBatchId(selectedBatchIdFromQuery)
    }
  }, [selectedBatchIdFromQuery])

  function updateSchoolRow(index: number, value: Partial<SchoolRow>) {
    setSchoolRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...value } : row
      )
    )
  }

  function updateEditSchoolRow(index: number, value: Partial<SchoolRow>) {
    setEditSchoolRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...value } : row
      )
    )
  }

  function openEditDistribution(distribution: ProductionDistribution) {
    setEditTarget(distribution)
    setEditBatchId(distribution.batchId)
    setEditDriverId(distribution.batch?.driver?.id ?? "")
    setEditWaktuKirim(
      distribution.waktuKirim
        ? new Date(distribution.waktuKirim).toISOString().slice(0, 16)
        : getCurrentDateTimeLocal()
    )
    setEditSchoolRows(
      distribution.schools.length
        ? distribution.schools.map((item) => ({
            jumlahPorsi: Number(item.jumlahPorsi ?? 0),
            schoolId: item.school.id,
          }))
        : [{ jumlahPorsi: 0, schoolId: "" }]
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const payloadSchools = schoolRows
        .filter((row) => row.schoolId && Number(row.jumlahPorsi) > 0)
        .map((row) => ({
          schoolId: row.schoolId,
          jumlahPorsi: Number(row.jumlahPorsi),
        }))

      const response = await api.productionDistributions.create({
        batchId,
        driverId,
        schools: payloadSchools,
        status: "DIKIRIM",
        waktuKirim,
      })

      setDistributions((current) =>
        setCachedPageData(pageCacheKeys.productionDistributions, [
          response.distribution,
          ...current,
        ])
      )

      setBatches((current) => {
        const updatedBatches = current.map((batch) =>
          batch.id === batchId
            ? {
                ...batch,
                ...response.distribution.batch,
                driver: response.distribution.batch?.driver ?? batch.driver,
                driverId,
                status: "TERKIRIM",
              }
            : batch
        )

        return setCachedPageData(
          pageCacheKeys.productionBatches,
          updatedBatches
        )
      })

      setBatchId("")
      navigate("/distribution", { replace: true })
      setDriverId("")
      setSchoolRows([{ jumlahPorsi: 0, schoolId: "" }])
      setWaktuKirim(getCurrentDateTimeLocal())
      setSuccess("Distribusi berhasil dibuat dan tampil di akun sekolah terkait.")
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal membuat distribusi."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function saveDistributionEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editTarget) return

    try {
      const payloadSchools = editSchoolRows
        .filter((row) => row.schoolId && Number(row.jumlahPorsi) > 0)
        .map((row) => ({
          schoolId: row.schoolId,
          jumlahPorsi: Number(row.jumlahPorsi),
        }))

      const response = await api.productionDistributions.update(editTarget.id, {
        batchId: editBatchId,
        driverId: editDriverId,
        schools: payloadSchools,
        waktuKirim: editWaktuKirim,
      })

      setDistributions((current) =>
        setCachedPageData(
          pageCacheKeys.productionDistributions,
          current.map((item) =>
            item.id === response.distribution.id ? response.distribution : item
          )
        )
      )

      setBatches((current) =>
        setCachedPageData(
          pageCacheKeys.productionBatches,
          current.map((batch) =>
            batch.id === editTarget.batchId && batch.id !== response.distribution.batchId
              ? { ...batch, status: "DIPRODUKSI" }
              : batch.id === response.distribution.batchId
              ? {
                  ...batch,
                  driver: response.distribution.batch?.driver ?? batch.driver,
                  driverId:
                    response.distribution.batch?.driver?.id ?? batch.driverId,
                  status: "TERKIRIM",
                }
              : batch
          )
        )
      )

      setEditTarget(null)
      setSuccess("Distribusi berhasil diperbarui.")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal mengedit distribusi.")
    }
  }

  async function deleteDistribution() {
    if (!deleteTarget) return

    try {
      await api.productionDistributions.delete(deleteTarget.id)
      setDistributions((current) =>
        setCachedPageData(
          pageCacheKeys.productionDistributions,
          current.filter((item) => item.id !== deleteTarget.id)
        )
      )
      setBatches((current) => {
        const updatedBatches = current.map((batch) =>
          batch.id === deleteTarget.batchId
            ? { ...batch, status: "DIPRODUKSI" }
            : batch
        )
        return setCachedPageData(pageCacheKeys.productionBatches, updatedBatches)
      })
      setDeleteTarget(null)
      setSuccess("Distribusi berhasil dihapus.")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menghapus distribusi.")
    }
  }

  return (
    <DashboardShell title="Distribusi">
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
            Distribusi makanan
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "create" ? "Upload Distribusi" : "Riwayat Distribusi"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {mode === "create"
              ? "Pilih batch, driver, sekolah tujuan, waktu kirim, dan jumlah porsi untuk membuat distribusi."
              : "Lihat riwayat distribusi makanan yang sudah dibuat."}
          </p>
        </div>
      </section>

      {mode === "create" ? (
        <section className="rounded-lg border bg-card p-4 text-card-foreground">

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              ID batch
              <select
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                required
              >
                <option value="">Pilih batch...</option>
                {productionBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.id} - {batch.menu?.name ?? "Menu"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Petugas driver
              <select
                value={driverId}
                onChange={(event) => setDriverId(event.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                required
              >
                <option value="">Pilih driver...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                    {driver.vehicleNumber ? ` - ${driver.vehicleNumber}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Waktu kirim
              <Input
                type="datetime-local"
                value={waktuKirim}
                onChange={(event) => setWaktuKirim(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sekolah tujuan</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSchoolRows((current) => [
                    ...current,
                    { jumlahPorsi: 0, schoolId: "" },
                  ])
                }
              >
                <PlusIcon />
                Tambah sekolah
              </Button>
            </div>

            {schoolRows.map((row, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-md border bg-muted/10 p-3 md:grid-cols-[1fr_160px_auto]"
              >
                <label className="grid gap-2 text-sm font-medium">
                  Sekolah
                  <select
                    value={row.schoolId}
                    onChange={(event) =>
                      updateSchoolRow(index, { schoolId: event.target.value })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                    required
                  >
                    <option value="">Pilih sekolah...</option>
                    {schools.map((school) => (
                      <option
                        key={school.id}
                        value={school.id}
                        disabled={
                          selectedSchoolIds.has(school.id) &&
                          school.id !== row.schoolId
                        }
                      >
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Jumlah porsi
                  <Input
                    type="number"
                    min={1}
                    value={row.jumlahPorsi}
                    onChange={(event) =>
                      updateSchoolRow(index, {
                        jumlahPorsi: Number(event.target.value),
                      })
                    }
                    required
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={schoolRows.length === 1}
                    onClick={() =>
                      setSchoolRows((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index)
                      )
                    }
                  >
                    <Trash2Icon className="text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              <SendIcon />
              {isSubmitting ? "Menyimpan..." : "Submit Distribusi"}
            </Button>
          </div>
        </form>
        </section>
      ) : null}

      {mode === "history" ? (
      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Riwayat Distribusi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Sekolah</th>
                <th className="px-4 py-3 font-medium">Waktu Kirim</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-48" />
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
                        <Skeleton className="ml-auto h-8 w-32" />
                      </td>
                    </tr>
                  ))
                : null}
              {distributions.map((distribution) => (
                <tr key={distribution.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {distribution.batchId}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {distribution.batch?.driver?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {distribution.schools
                      .map((item) => `${item.school.name} (${item.jumlahPorsi})`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {distribution.waktuKirim
                      ? new Date(distribution.waktuKirim).toLocaleString("id-ID")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">{getDistributionStatus(distribution)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setViewTarget(distribution)}
                      >
                        <EyeIcon className="mr-1 h-4 w-4" /> View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDistribution(distribution)}
                      >
                        <PencilIcon className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(distribution)}
                      >
                        <Trash2Icon className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && distributions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Belum ada distribusi.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      <Dialog open={Boolean(viewTarget)} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Distribusi</DialogTitle>
            <DialogDescription>{viewTarget?.batchId}</DialogDescription>
          </DialogHeader>
          {viewTarget ? (
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Menu</dt>
                <dd className="font-medium">{viewTarget.batch?.menu?.name ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Driver</dt>
                <dd className="font-medium">{viewTarget.batch?.driver?.name ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Waktu kirim</dt>
                <dd className="font-medium">
                  {viewTarget.waktuKirim
                    ? new Date(viewTarget.waktuKirim).toLocaleString("id-ID")
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sekolah tujuan</dt>
                <dd className="mt-2 space-y-1 font-medium">
                  {viewTarget.schools.map((item) => (
                    <p key={item.id}>
                      {item.school.name} - {item.jumlahPorsi} porsi ({item.status})
                    </p>
                  ))}
                </dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="flex max-h-[90svh] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Distribusi</DialogTitle>
            <DialogDescription>{editTarget?.batchId}</DialogDescription>
          </DialogHeader>
          <form className="flex min-h-0 flex-col gap-4" onSubmit={saveDistributionEdit}>
            <div className="max-h-[calc(90svh-10rem)] overflow-y-auto overscroll-contain pr-2">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
              <label className="grid gap-2 text-sm font-medium">
                ID batch
                <select
                  value={editBatchId}
                  onChange={(event) => setEditBatchId(event.target.value)}
                  className="h-9 min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                  required
                >
                  <option value="">Pilih batch...</option>
                  {editableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.id} - {batch.menu?.name ?? "Menu"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Petugas driver
                <select
                  value={editDriverId}
                  onChange={(event) => setEditDriverId(event.target.value)}
                  className="h-9 min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                  required
                >
                  <option value="">Pilih driver...</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                      {driver.vehicleNumber ? ` - ${driver.vehicleNumber}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Waktu kirim
                <Input
                  type="datetime-local"
                  value={editWaktuKirim}
                  onChange={(event) => setEditWaktuKirim(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 border-t pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold">Sekolah tujuan</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditSchoolRows((current) => [
                      ...current,
                      { jumlahPorsi: 0, schoolId: "" },
                    ])
                  }
                >
                  <PlusIcon />
                  Tambah sekolah
                </Button>
              </div>

              {editSchoolRows.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-md border bg-muted/10 p-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end"
                >
                  <label className="grid gap-2 text-sm font-medium">
                    Sekolah
                    <select
                      value={row.schoolId}
                      onChange={(event) =>
                        updateEditSchoolRow(index, { schoolId: event.target.value })
                      }
                      className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                      required
                    >
                      <option value="">Pilih sekolah...</option>
                      {schools.map((school) => (
                        <option
                          key={school.id}
                          value={school.id}
                          disabled={
                            selectedEditSchoolIds.has(school.id) &&
                            school.id !== row.schoolId
                          }
                        >
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Jumlah porsi
                    <Input
                      min={1}
                      type="number"
                      value={row.jumlahPorsi}
                      onChange={(event) =>
                        updateEditSchoolRow(index, {
                          jumlahPorsi: Number(event.target.value),
                        })
                      }
                      required
                    />
                  </label>
                  <div className="flex md:pb-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={editSchoolRows.length === 1}
                      onClick={() =>
                        setEditSchoolRows((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index)
                        )
                      }
                    >
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </div>

            <div className="-mx-4 -mb-4 flex shrink-0 justify-end gap-2 border-t bg-popover px-4 py-3">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus distribusi?</AlertDialogTitle>
            <AlertDialogDescription>
              Distribusi batch {deleteTarget?.batchId} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                void deleteDistribution()
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
