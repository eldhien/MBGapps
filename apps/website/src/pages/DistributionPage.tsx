import { useEffect, useMemo, useState } from "react"
import {
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

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
import { TablePagination } from "@/components/ui/table-pagination"
import {
  api,
  type Driver,
  type ProductionBatch,
  type ProductionDistribution,
  type SchoolAccount,
} from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import {
  formatDistributionId,
  getBatchRemainingPortions,
  getCurrentDateTimeLocal,
  getDistributionStatus,
} from "@/lib/production"
import { DashboardShell } from "@/pages/components/DashboardShell"

type SchoolRow = {
  jumlahPorsi: string
  schoolId: string
}

const DISTRIBUTION_HISTORY_PER_PAGE = 10

function getRowsTotalPortions(rows: SchoolRow[]) {
  return rows.reduce((total, row) => total + Number(row.jumlahPorsi || 0), 0)
}

function getStockValidationMessage(
  batch: ProductionBatch | undefined,
  rows: SchoolRow[],
  distributions: ProductionDistribution[],
  excludeDistributionId?: string
) {
  if (!batch) return null

  const availablePortions = getBatchRemainingPortions(
    batch,
    distributions,
    excludeDistributionId
  )
  const requestedPortions = getRowsTotalPortions(rows)

  if (requestedPortions > availablePortions) {
    return `Total porsi sekolah (${requestedPortions.toLocaleString("id-ID")}) melebihi sisa stok batch (${availablePortions.toLocaleString("id-ID")}). Kurangi jumlah porsi sebelum menyimpan distribusi.`
  }

  return null
}

export function DistributionPage({
  mode = "create",
}: {
  mode?: "create" | "history"
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const selectedBatchIdFromQuery = searchParams.get("batchId") ?? ""
  const cachedBatches = getCachedPageData<ProductionBatch[]>(
    pageCacheKeys.productionBatches
  )
  const cachedDistributions = getCachedPageData<ProductionDistribution[]>(
    pageCacheKeys.productionDistributions
  )
  const cachedSchools = getCachedPageData<SchoolAccount[]>(
    pageCacheKeys.schoolAccounts
  )
  const cachedDrivers = getCachedPageData<Driver[]>(pageCacheKeys.drivers)
  const [batches, setBatches] = useState<ProductionBatch[]>(
    () => cachedBatches ?? []
  )
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
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeletingDistribution, setIsDeletingDistribution] = useState(false)
  const [success, setSuccess] = useState<string | null>(
    () => (location.state as { success?: string } | null)?.success ?? null
  )
  const [viewTarget, setViewTarget] = useState<ProductionDistribution | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] =
    useState<ProductionDistribution | null>(null)
  const [editTarget, setEditTarget] = useState<ProductionDistribution | null>(
    null
  )
  const [editBatchId, setEditBatchId] = useState("")
  const [editDriverId, setEditDriverId] = useState("")
  const [editWaktuKirim, setEditWaktuKirim] = useState(
    getCurrentDateTimeLocal()
  )
  const [editSchoolRows, setEditSchoolRows] = useState<SchoolRow[]>([])
  const [waktuKirim, setWaktuKirim] = useState(getCurrentDateTimeLocal())
  const [schoolRows, setSchoolRows] = useState<SchoolRow[]>([
    { jumlahPorsi: "", schoolId: "" },
  ])
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1)

  const selectedSchoolIds = useMemo(
    () => new Set(schoolRows.map((row) => row.schoolId).filter(Boolean)),
    [schoolRows]
  )
  const selectedEditSchoolIds = useMemo(
    () => new Set(editSchoolRows.map((row) => row.schoolId).filter(Boolean)),
    [editSchoolRows]
  )
  const productionBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          batch.status !== "DITOLAK" &&
          getBatchRemainingPortions(batch, distributions) > 0
      ),
    [batches, distributions]
  )
  const editableBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          batch.id === editBatchId ||
          (batch.status !== "DITOLAK" &&
            getBatchRemainingPortions(
              batch,
              distributions,
              editTarget?.id
            ) > 0)
      ),
    [batches, distributions, editBatchId, editTarget?.id]
  )
  const historyDistributions = useMemo(
    () => distributions,
    [distributions]
  )
  const distributionHistoryTotalPages = Math.max(
    1,
    Math.ceil(historyDistributions.length / DISTRIBUTION_HISTORY_PER_PAGE)
  )
  const paginatedHistoryDistributions = useMemo(
    () =>
      historyDistributions.slice(
        (currentHistoryPage - 1) * DISTRIBUTION_HISTORY_PER_PAGE,
        currentHistoryPage * DISTRIBUTION_HISTORY_PER_PAGE
      ),
    [currentHistoryPage, historyDistributions]
  )
  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === batchId),
    [batchId, batches]
  )
  const selectedBatchAvailablePortions = getBatchRemainingPortions(
    selectedBatch,
    distributions
  )
  const selectedBatchRequestedPortions = getRowsTotalPortions(schoolRows)
  const selectedBatchRemainingPortions = Math.max(
    0,
    selectedBatchAvailablePortions - selectedBatchRequestedPortions
  )
  const editSelectedBatch = useMemo(
    () => batches.find((batch) => batch.id === editBatchId),
    [batches, editBatchId]
  )
  const editSelectedBatchAvailablePortions = getBatchRemainingPortions(
    editSelectedBatch,
    distributions,
    editTarget?.id
  )
  const editRequestedPortions = getRowsTotalPortions(editSchoolRows)
  const editRemainingPortions = Math.max(
    0,
    editSelectedBatchAvailablePortions - editRequestedPortions
  )

  async function fetchLatestData(showLoading: boolean) {
    if (showLoading) setIsLoading(true)
    setError(null)

    try {
      const [
        batchResponse,
        schoolResponse,
        distributionResponse,
        driverResponse,
      ] = await Promise.all([
        api.productionBatches.list(),
        api.schoolAccounts.list(),
        api.productionDistributions.list(),
        api.drivers.list({ active: true }),
      ])

      setBatches(
        setCachedPageData(pageCacheKeys.productionBatches, batchResponse)
      )
      setDrivers(
        setCachedPageData(pageCacheKeys.drivers, driverResponse.drivers)
      )
      setSchools(
        setCachedPageData(pageCacheKeys.schoolAccounts, schoolResponse.schools)
      )
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
      const batchesCache = getCachedPageData<ProductionBatch[]>(
        pageCacheKeys.productionBatches
      )
      const distributionsCache = getCachedPageData<ProductionDistribution[]>(
        pageCacheKeys.productionDistributions
      )
      const schoolsCache = getCachedPageData<SchoolAccount[]>(
        pageCacheKeys.schoolAccounts
      )
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
    const routeSuccess = (location.state as { success?: string } | null)
      ?.success
    if (routeSuccess) {
      setSuccess(routeSuccess)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    const unsubscribeDistributions = subscribePageCache<
      ProductionDistribution[]
    >(pageCacheKeys.productionDistributions, (cachedData) => {
      if (cachedData) {
        setDistributions(cachedData)
        setIsLoading(false)
      }
    })
    const unsubscribeBatches = subscribePageCache<ProductionBatch[]>(
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

  useEffect(() => {
    setCurrentHistoryPage((page) =>
      Math.min(page, distributionHistoryTotalPages)
    )
  }, [distributionHistoryTotalPages])

  function updateSchoolRow(index: number, value: Partial<SchoolRow>) {
    setSchoolRows((current) => {
      const nextRows = current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...value } : row
      )
      const stockMessage = getStockValidationMessage(
        selectedBatch,
        nextRows,
        distributions
      )

      if (stockMessage) {
        setError(stockMessage)
      }

      return nextRows
    })
  }

  function updateEditSchoolRow(index: number, value: Partial<SchoolRow>) {
    setEditSchoolRows((current) => {
      const nextRows = current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...value } : row
      )
      const stockMessage = getStockValidationMessage(
        editSelectedBatch,
        nextRows,
        distributions,
        editTarget?.id
      )

      if (stockMessage) {
        setError(stockMessage)
      }

      return nextRows
    })
  }

  function handleBatchChange(nextBatchId: string) {
    setBatchId(nextBatchId)

    const nextBatch = batches.find((batch) => batch.id === nextBatchId)
    const stockMessage = getStockValidationMessage(
      nextBatch,
      schoolRows,
      distributions
    )

    if (stockMessage) {
      setError(stockMessage)
    }
  }

  function handleEditBatchChange(nextBatchId: string) {
    setEditBatchId(nextBatchId)

    const nextBatch = batches.find((batch) => batch.id === nextBatchId)
    const stockMessage = getStockValidationMessage(
      nextBatch,
      editSchoolRows,
      distributions,
      editTarget?.id
    )

    if (stockMessage) {
      setError(stockMessage)
    }
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
            jumlahPorsi: String(item.jumlahPorsi ?? ""),
            schoolId: item.school.id,
          }))
        : [{ jumlahPorsi: "", schoolId: "" }]
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setError(null)
    setSuccess(null)

    try {
      const stockMessage = getStockValidationMessage(
        selectedBatch,
        schoolRows,
        distributions
      )

      if (stockMessage) {
        setError(stockMessage)
        return
      }

      const payloadSchools = schoolRows
        .filter((row) => row.schoolId && Number(row.jumlahPorsi) > 0)
        .map((row) => ({
          schoolId: row.schoolId,
          jumlahPorsi: Number(row.jumlahPorsi),
        }))

      setIsSubmitting(true)

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
      setDriverId("")
      setSchoolRows([{ jumlahPorsi: "", schoolId: "" }])
      setWaktuKirim(getCurrentDateTimeLocal())
      navigate("/distribution/history", {
        replace: true,
        state: {
          success:
            "Distribusi berhasil dibuat dan tampil di akun sekolah terkait.",
        },
      })
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
    if (!editTarget || isSavingEdit) return

    setError(null)
    setSuccess(null)

    try {
      const stockMessage = getStockValidationMessage(
        editSelectedBatch,
        editSchoolRows,
        distributions,
        editTarget.id
      )

      if (stockMessage) {
        setError(stockMessage)
        return
      }

      const payloadSchools = editSchoolRows
        .filter((row) => row.schoolId && Number(row.jumlahPorsi) > 0)
        .map((row) => ({
          schoolId: row.schoolId,
          jumlahPorsi: Number(row.jumlahPorsi),
        }))

      setIsSavingEdit(true)

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
            batch.id === editTarget.batchId &&
            batch.id !== response.distribution.batchId
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
      setError(
        error instanceof Error ? error.message : "Gagal mengedit distribusi."
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function deleteDistribution() {
    if (!deleteTarget || isDeletingDistribution) return

    setIsDeletingDistribution(true)
    setError(null)
    setSuccess(null)
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
        return setCachedPageData(
          pageCacheKeys.productionBatches,
          updatedBatches
        )
      })
      setDeleteTarget(null)
      setSuccess("Distribusi berhasil dihapus.")
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal menghapus distribusi."
      )
    } finally {
      setIsDeletingDistribution(false)
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "create" ? "Buat Distribusi" : "Riwayat Distribusi"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {mode === "create"
              ? "Pilih batch, driver, sekolah tujuan, waktu kirim, dan jumlah porsi untuk membuat distribusi."
              : "Lihat riwayat distribusi makanan yang sudah dibuat."}
          </p>
        </div>
      </section>

      {mode === "create" ? (
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
          <div className="border-b border-[#edf0f4] p-5">
            <h2 className="text-lg font-semibold tracking-tight">
              Form buat distribusi
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Isi data batch, driver, waktu kirim, dan sekolah tujuan
              distribusi.
            </p>
          </div>

          <form className="grid gap-5 p-5" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid min-w-0 gap-2 text-sm font-medium">
                ID batch
                <select
                  value={batchId}
                  onChange={(event) => handleBatchChange(event.target.value)}
                  className="h-10 w-full min-w-0 truncate rounded-lg border border-[#e3e7ef] bg-white px-3 pr-10 text-sm transition-colors outline-none hover:border-[#cfd6e3] focus:border-[#0528f2] focus:ring-3 focus:ring-[#0528f2]/15"
                  required
                >
                  <option value="">Pilih batch...</option>
                  {productionBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.id} - sisa{" "}
                      {getBatchRemainingPortions(
                        batch,
                        distributions
                      ).toLocaleString("id-ID")}{" "}
                      porsi tersisa
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Petugas driver
                <select
                  value={driverId}
                  onChange={(event) => setDriverId(event.target.value)}
                  className="h-10 rounded-lg border border-[#e3e7ef] bg-white px-3 text-sm transition-colors outline-none hover:border-[#cfd6e3] focus:border-[#0528f2] focus:ring-3 focus:ring-[#0528f2]/15"
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
                  className="h-10 rounded-lg border-[#e3e7ef] bg-white"
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-xl border border-[#e9edf4] bg-[#f8fafc] p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Sisa stok
                </p>
                <p className="mt-1 text-lg font-semibold text-[#111827]">
                  {batchId
                    ? selectedBatchAvailablePortions.toLocaleString("id-ID")
                    : "0"}{" "}
                  porsi
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Dialokasikan
                </p>
                <p className="mt-1 text-lg font-semibold text-[#111827]">
                  {selectedBatchRequestedPortions.toLocaleString("id-ID")} porsi
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Sisa porsi
                </p>
                <p
                  className={
                    selectedBatchRequestedPortions >
                      selectedBatchAvailablePortions &&
                    batchId
                      ? "mt-1 text-lg font-semibold text-red-600"
                      : "mt-1 text-lg font-semibold text-emerald-600"
                  }
                >
                  {batchId
                    ? selectedBatchRemainingPortions.toLocaleString("id-ID")
                    : "0"}{" "}
                  porsi
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Sekolah tujuan</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-[#e3e7ef]"
                  onClick={() =>
                    setSchoolRows((current) => [
                      ...current,
                      { jumlahPorsi: "", schoolId: "" },
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
                  className="grid gap-3 rounded-xl border border-[#e9edf4] bg-[#fcfcfd] p-4 md:grid-cols-[1fr_160px_auto] md:items-end"
                >
                  <label className="grid gap-2 text-sm font-medium">
                    Sekolah
                    <select
                      value={row.schoolId}
                      onChange={(event) =>
                        updateSchoolRow(index, { schoolId: event.target.value })
                      }
                      className="h-10 rounded-lg border border-[#e3e7ef] bg-white px-3 text-sm transition-colors outline-none hover:border-[#cfd6e3] focus:border-[#0528f2] focus:ring-3 focus:ring-[#0528f2]/15"
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
                      inputMode="numeric"
                      step="1"
                      min="1"
                      max={selectedBatchAvailablePortions || undefined}
                      value={row.jumlahPorsi}
                      onChange={(event) =>
                        updateSchoolRow(index, {
                          jumlahPorsi: event.target.value,
                        })
                      }
                      className="h-10 rounded-lg border-[#e3e7ef] bg-white"
                      required
                    />
                  </label>
                  <div className="flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      disabled={schoolRows.length === 1}
                      onClick={() =>
                        setSchoolRows((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index)
                        )
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                pending={isSubmitting}
                disabled={isSubmitting}
                className="h-10 rounded-lg bg-[#0528f2] px-4 text-white hover:bg-[#0422c8]"
              >
                <SendIcon />
                {isSubmitting ? "Menyimpan..." : "Submit Distribusi"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {mode === "history" ? (
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-2 border-b border-[#edf0f4] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  Riwayat distribusi
                </h2>
                <span className="text-lg font-semibold text-muted-foreground">
                  {isLoading ? "..." : historyDistributions.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Distribusi yang sudah dibuat akan tampil di sini.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-[#edf0f4] bg-[#fcfcfd] text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">ID Distribusi</th>
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Sekolah</th>
                  <th className="px-5 py-3 font-medium">Waktu Kirim</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index} className="border-b border-[#edf0f4]">
                        <td className="px-5 py-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-5 py-4">
                          <Skeleton className="h-4 w-48" />
                        </td>
                        <td className="px-5 py-4">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="px-5 py-4">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="px-5 py-4">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </td>
                        <td className="px-5 py-4">
                          <Skeleton className="ml-auto h-8 w-32" />
                        </td>
                      </tr>
                    ))
                  : null}
                {paginatedHistoryDistributions.map((distribution) => {
                  const status = getDistributionStatus(distribution)
                  const statusClassName =
                    status === "DITOLAK"
                      ? "bg-red-50 text-red-600 ring-red-100"
                      : status === "SELESAI"
                        ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                        : "bg-slate-50 text-slate-600 ring-slate-200"

                  return (
                    <tr
                      key={distribution.id}
                      className="border-b border-[#edf0f4] last:border-0 hover:bg-[#fcfcfd]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {formatDistributionId(distribution)}
                        </p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">
                          Batch {distribution.batchId}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {distribution.batch?.driver?.name ?? "-"}
                      </td>
                      <td className="px-5 py-4">
                        <p className="line-clamp-2">
                          {distribution.schools
                            .map(
                              (item) =>
                                `${item.school.name} (${item.jumlahPorsi})`
                            )
                            .join(", ")}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {distribution.waktuKirim
                          ? new Date(distribution.waktuKirim).toLocaleString(
                              "id-ID"
                            )
                          : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClassName}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-[#e3e7ef]"
                            onClick={() => setViewTarget(distribution)}
                          >
                            <EyeIcon className="mr-1 h-4 w-4" /> Lihat
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-[#e3e7ef]"
                            onClick={() => openEditDistribution(distribution)}
                          >
                            <PencilIcon className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeleteTarget(distribution)}
                          >
                            <Trash2Icon className="mr-1 h-4 w-4" /> Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!isLoading && historyDistributions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-muted-foreground"
                    >
                      Belum ada distribusi yang dibuat.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {!isLoading &&
          historyDistributions.length > DISTRIBUTION_HISTORY_PER_PAGE ? (
            <TablePagination
              page={currentHistoryPage}
              totalPages={distributionHistoryTotalPages}
              onPageChange={setCurrentHistoryPage}
            />
          ) : null}
        </section>
      ) : null}

      <Dialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => !open && setViewTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Distribusi</DialogTitle>
            <DialogDescription>
              {viewTarget
                ? `${formatDistributionId(viewTarget)} - Batch ${viewTarget.batchId}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewTarget ? (
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Menu</dt>
                <dd className="font-medium">
                  {viewTarget.batch?.menu?.name ?? "-"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Driver</dt>
                <dd className="font-medium">
                  {viewTarget.batch?.driver?.name ?? "-"}
                </dd>
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
                      {item.school.name} - {item.jumlahPorsi} porsi (
                      {item.status})
                    </p>
                  ))}
                </dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="flex max-h-[90svh] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Distribusi</DialogTitle>
            <DialogDescription>
              {editTarget
                ? `${formatDistributionId(editTarget)} - Batch ${editTarget.batchId}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-col gap-4"
            onSubmit={saveDistributionEdit}
          >
            <div className="max-h-[calc(90svh-10rem)] overflow-y-auto overscroll-contain pr-2">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
                <label className="grid min-w-0 gap-2 text-sm font-medium">
                  ID batch
                  <select
                    value={editBatchId}
                    onChange={(event) =>
                      handleEditBatchChange(event.target.value)
                    }
                    className="h-9 w-full min-w-0 truncate rounded-md border border-input bg-transparent px-3 pr-10 text-sm shadow-xs"
                    required
                  >
                    <option value="">Pilih batch...</option>
                    {editableBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.id} - sisa{" "}
                        {getBatchRemainingPortions(
                          batch,
                          distributions,
                          editTarget?.id
                        ).toLocaleString("id-ID")}{" "}
                        porsi tersisa
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
                        {driver.vehicleNumber
                          ? ` - ${driver.vehicleNumber}`
                          : ""}
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

              <div className="mt-4 grid gap-3 rounded-xl border border-[#e9edf4] bg-[#f8fafc] p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Sisa stok
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#111827]">
                    {editBatchId
                      ? editSelectedBatchAvailablePortions.toLocaleString(
                          "id-ID"
                        )
                      : "0"}{" "}
                    porsi
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Dialokasikan
                  </p>
                  <p className="mt-1 text-base font-semibold text-[#111827]">
                    {editRequestedPortions.toLocaleString("id-ID")} porsi
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Sisa porsi
                  </p>
                  <p
                    className={
                      editRequestedPortions >
                        editSelectedBatchAvailablePortions &&
                      editBatchId
                        ? "mt-1 text-base font-semibold text-red-600"
                        : "mt-1 text-base font-semibold text-emerald-600"
                    }
                  >
                    {editBatchId
                      ? editRemainingPortions.toLocaleString("id-ID")
                      : "0"}{" "}
                    porsi
                  </p>
                </div>
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
                        { jumlahPorsi: "", schoolId: "" },
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
                          updateEditSchoolRow(index, {
                            schoolId: event.target.value,
                          })
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
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="1"
                        max={editSelectedBatchAvailablePortions || undefined}
                        value={row.jumlahPorsi}
                        onChange={(event) =>
                          updateEditSchoolRow(index, {
                            jumlahPorsi: event.target.value,
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                pending={isSavingEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) =>
          !open && !isDeletingDistribution && setDeleteTarget(null)
        }
      >
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
            <AlertDialogCancel disabled={isDeletingDistribution}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingDistribution}
              onClick={(event) => {
                event.preventDefault()
                void deleteDistribution()
              }}
            >
              {isDeletingDistribution ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
