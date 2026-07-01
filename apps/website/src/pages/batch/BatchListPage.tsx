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
  type ProductionBatch,
  type ProductionDistribution,
} from "@/services/api"
import { cn } from "@/lib/utils"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import {
  dateTimeLocalToISOString,
  getBatchRemainingPortions,
  getLatestFoodPhotoUrl,
  toDateTimeLocal,
} from "@/lib/production"
import { DashboardShell } from "@/components/layout/DashboardShell"
import {
  CheckCircle2Icon,
  EyeIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TruckIcon,
  TriangleAlertIcon,
  XIcon,
  ZoomInIcon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useLocation, useNavigate } from "react-router-dom"

type KomposisiItem = {
  namaBahan: string
}

type EditFormState = {
  namaMenu: string
  totalPorsi: string
  waktuMulai: string
  waktuSelesai: string
}

const BATCHES_PER_PAGE = 10

const createEmptyKomposisi = (): KomposisiItem => ({ namaBahan: "" })

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getStatusBadgeClass(status?: string) {
  if (status === "DIPRODUKSI") {
    return "bg-blue-50 text-[#0528f2] ring-blue-100"
  }

  if (status === "SELESAI" || status === "DITERIMA") {
    return "bg-emerald-50 text-emerald-600 ring-emerald-100"
  }

  if (status === "DITOLAK") {
    return "bg-red-50 text-red-600 ring-red-100"
  }

  return "bg-slate-50 text-slate-600 ring-slate-200"
}

function PhotoThumb({
  label,
  onZoom,
  url,
}: {
  label: string
  onZoom: (url: string) => void
  url: string | null | undefined
}) {
  if (!url) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground/50">
          <ImageIcon className="h-5 w-5" />
        </div>
        <p className="truncate text-center text-xs text-muted-foreground">
          {label}
        </p>
        <p className="text-center text-xs text-muted-foreground/60 italic">
          Belum ada
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => onZoom(url)}
        className="group relative h-20 w-full overflow-hidden rounded-lg border bg-muted/20"
      >
        <img
          src={url}
          alt={label}
          className="h-full w-full object-cover transition group-hover:scale-105 group-hover:opacity-90"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
          <ZoomInIcon className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
        </div>
      </button>
      <p className="truncate text-center text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

function PhotoLightbox({ onClose, url }: { onClose: () => void; url: string }) {
  function closePreview(event: React.SyntheticEvent) {
    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  function keepPreviewOpen(event: React.SyntheticEvent) {
    event.stopPropagation()
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      onClick={closePreview}
      onPointerDown={closePreview}
    >
      <button
        type="button"
        onClick={closePreview}
        onPointerDown={closePreview}
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
        aria-label="Tutup"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt="Preview foto"
        className="max-h-[92vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
        onClick={keepPreviewOpen}
        onPointerDown={keepPreviewOpen}
      />
    </div>,
    document.body
  )
}

export function BatchListPage({
  mode = "production",
}: {
  mode?: "production" | "distribution"
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const cachedBatches = getCachedPageData<ProductionBatch[]>(
    pageCacheKeys.productionBatches
  )
  const cachedDistributions = getCachedPageData<ProductionDistribution[]>(
    pageCacheKeys.productionDistributions
  )
  const [batches, setBatches] = useState<ProductionBatch[]>(
    () => cachedBatches ?? []
  )
  const [distributions, setDistributions] = useState<
    ProductionDistribution[]
  >(() => cachedDistributions ?? [])
  const [isLoading, setIsLoading] = useState(
    !cachedBatches || !cachedDistributions
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(
    () => (location.state as { success?: string } | null)?.success ?? null
  )
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)
  const [viewTarget, setViewTarget] = useState<ProductionBatch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionBatch | null>(null)
  const [editTarget, setEditTarget] = useState<ProductionBatch | null>(null)
  const [editFotoMakanan, setEditFotoMakanan] = useState<File | null>(null)
  const [editFotoPreview, setEditFotoPreview] = useState<string | null>(null)
  const [zoomFotoUrl, setZoomFotoUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [editKomposisi, setEditKomposisi] = useState<KomposisiItem[]>([
    createEmptyKomposisi(),
  ])
  const [editForm, setEditForm] = useState<EditFormState>({
    namaMenu: "",
    totalPorsi: "",
    waktuMulai: "",
    waktuSelesai: "",
  })
  const totalPages = Math.max(1, Math.ceil(batches.length / BATCHES_PER_PAGE))
  const paginatedBatches = useMemo(
    () =>
      batches.slice(
        (currentPage - 1) * BATCHES_PER_PAGE,
        currentPage * BATCHES_PER_PAGE
      ),
    [batches, currentPage]
  )

  const loadData = async () => {
    if (cachedBatches && cachedDistributions) {
      setBatches(cachedBatches)
      setDistributions(cachedDistributions)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [batchData, distributionData] = await Promise.all([
        cachedBatches
          ? Promise.resolve(cachedBatches)
          : api.productionBatches.list(),
        cachedDistributions
          ? Promise.resolve({ distributions: cachedDistributions })
          : api.productionDistributions.list(),
      ])
      setBatches(setCachedPageData(pageCacheKeys.productionBatches, batchData))
      setDistributions(
        setCachedPageData(
          pageCacheKeys.productionDistributions,
          distributionData.distributions
        )
      )
    } catch (err) {
      setError(getErrorMessage(err, "Gagal memuat data"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    const routeSuccess = (location.state as { success?: string } | null)
      ?.success
    if (routeSuccess) {
      setSuccess(routeSuccess)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!editFotoMakanan) {
      setEditFotoPreview(null)
      return
    }

    const objectUrl = URL.createObjectURL(editFotoMakanan)
    setEditFotoPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [editFotoMakanan])

  async function deleteBatch() {
    if (!deleteTarget || isDeletingBatch) return
    setIsDeletingBatch(true)
    setError(null)
    try {
      await api.productionBatches.delete(deleteTarget.id)
      setBatches((current) =>
        setCachedPageData(
          pageCacheKeys.productionBatches,
          current.filter((item) => item.id !== deleteTarget.id)
        )
      )
      setDeleteTarget(null)
      setSuccess("Batch berhasil dihapus.")
    } catch (err) {
      setError(getErrorMessage(err, "Gagal menghapus batch"))
    } finally {
      setIsDeletingBatch(false)
    }
  }

  function openEditBatch(batch: ProductionBatch) {
    const bahan = batch.varian?.flatMap((varian) => varian.bahan ?? []) ?? []

    setEditTarget(batch)
    setEditFotoMakanan(null)
    setEditKomposisi(
      bahan.length
        ? bahan.map((item) => ({ namaBahan: item.namaBahan ?? "" }))
        : [createEmptyKomposisi()]
    )
    setEditForm({
      namaMenu: batch.menu?.name ?? "",
      totalPorsi: String(batch.totalPorsi ?? ""),
      waktuMulai: toDateTimeLocal(batch.waktuMulai),
      waktuSelesai: toDateTimeLocal(batch.waktuSelesai),
    })
  }

  async function saveBatchEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editTarget || isSavingEdit) return

    setError(null)
    setIsSavingEdit(true)

    try {
      const cleanedKomposisi = editKomposisi
        .map((item) => item.namaBahan.trim())
        .filter((namaBahan) => namaBahan.length > 0)

      if (cleanedKomposisi.length === 0) {
        setError("Minimal isi 1 komposisi makanan")
        return
      }

      let updated = await api.productionBatches.update(editTarget.id, {
        namaMenu: editForm.namaMenu.trim(),
        totalPorsi: Number(editForm.totalPorsi),
        waktuMulai: dateTimeLocalToISOString(editForm.waktuMulai),
        waktuSelesai: dateTimeLocalToISOString(editForm.waktuSelesai),
        varian: [
          {
            namaVarian: "Utama",
            jumlahPorsi: Number(editForm.totalPorsi),
            bahan: cleanedKomposisi.map((namaBahan) => ({
              harga: 0,
              jumlah: 0,
              kategori: null,
              namaBahan,
              satuan: "item",
            })),
          },
        ],
      })

      if (editFotoMakanan) {
        await api.productionBatches.uploadPhoto(
          editTarget.id,
          editFotoMakanan,
          "MAKANAN_JADI"
        )
        updated = await api.productionBatches.get(editTarget.id)
      }

      setBatches((current) =>
        setCachedPageData(
          pageCacheKeys.productionBatches,
          current.map((item) => (item.id === updated.id ? updated : item))
        )
      )
      setEditTarget(null)
      setEditFotoMakanan(null)
      setEditFotoPreview(null)
      setSuccess("Batch berhasil diperbarui.")
    } catch (err) {
      setError(getErrorMessage(err, "Gagal mengedit batch"))
    } finally {
      setIsSavingEdit(false)
    }
  }

  useEffect(() => {
    const unsubscribeBatches = subscribePageCache<ProductionBatch[]>(
      pageCacheKeys.productionBatches,
      (cachedData) => {
        if (cachedData) {
          setBatches(cachedData)
          setIsLoading(false)
        }
      }
    )

    const unsubscribeDistributions = subscribePageCache<
      ProductionDistribution[]
    >(pageCacheKeys.productionDistributions, (cachedData) => {
      if (cachedData) {
        setDistributions(cachedData)
        setIsLoading(false)
      }
    })

    return () => {
      unsubscribeBatches()
      unsubscribeDistributions()
    }
  }, [])

  useEffect(() => {
    const syncCachedData = () => {
      const cachedBatchData = getCachedPageData<ProductionBatch[]>(
        pageCacheKeys.productionBatches
      )
      const cachedDistributionData = getCachedPageData<
        ProductionDistribution[]
      >(pageCacheKeys.productionDistributions)

      if (cachedBatchData) {
        setBatches(cachedBatchData)
      }
      if (cachedDistributionData) {
        setDistributions(cachedDistributionData)
      }
      if (cachedBatchData && cachedDistributionData) {
        setIsLoading(false)
      }
    }

    window.addEventListener("focus", syncCachedData)
    window.addEventListener("pageshow", syncCachedData)

    return () => {
      window.removeEventListener("focus", syncCachedData)
      window.removeEventListener("pageshow", syncCachedData)
    }
  }, [])

  return (
    <DashboardShell
      title={mode === "distribution" ? "Distribusi" : "Produksi Batch"}
    >
      {error && (
        <AlertToast
          title="Terjadi kesalahan"
          description={error}
          variant="destructive"
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <AlertToast
          title="Berhasil"
          description={success}
          onClose={() => setSuccess(null)}
        />
      )}

      <section className="pb-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "distribution"
              ? "Daftar Distribusi"
              : "Riwayat Batch Makanan"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {mode === "distribution"
              ? "Pantau batch yang siap didistribusikan beserta status pengiriman."
              : "Pantau batch makanan yang sudah dibuat, status produksi, dan detail menu."}
          </p>
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[#edf0f4] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-semibold tracking-tight">
                {mode === "distribution" ? "Daftar distribusi" : "Semua batch"}
              </h1>
              <span className="text-lg font-semibold text-muted-foreground">
                {isLoading ? "..." : batches.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pantau batch produksi, status distribusi, dan detail menu.
            </p>
          </div>

          {mode === "production" ? (
            <Link to="/batch/create">
              <Button className="h-10 cursor-pointer rounded-lg bg-[#0528f2] px-4 text-white">
                <PlusIcon />
                Buat Batch
              </Button>
            </Link>
          ) : null}
        </div>

        <div className="table-scroll-area">
          <table className="w-full min-w-245 text-sm">
            <thead>
              <tr className="border-b border-[#edf0f4] bg-[#fcfcfd] text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Batch ID</th>
                <th className="px-5 py-3 font-medium">Menu</th>
                <th className="px-5 py-3 font-medium">Porsi</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-[#edf0f4]">
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="ml-auto h-8 w-40" />
                      </td>
                    </tr>
                  ))
                : null}

              {!isLoading &&
                paginatedBatches.map((batch) => {
                  const remainingPortions = getBatchRemainingPortions(
                    batch,
                    distributions
                  )

                  return (
                    <tr
                      key={batch.id}
                      className="border-b border-[#edf0f4] last:border-0 hover:bg-[#fcfcfd]"
                    >
                      <td className="px-5 py-4 font-semibold">{batch.id}</td>
                      <td className="px-5 py-4">{batch.menu?.name || "-"}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {remainingPortions.toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                            getStatusBadgeClass(batch.status)
                          )}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleDateString(
                              "id-ID"
                            )
                          : "-"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {remainingPortions > 0 &&
                          batch.status !== "DITOLAK" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer rounded-lg border-[#e3e7ef] text-[#0528f2] hover:bg-[#f7f9ff] hover:text-[#0528f2]"
                              onClick={() =>
                                navigate(
                                  `/distribution?batchId=${encodeURIComponent(batch.id)}`
                                )
                              }
                            >
                              <TruckIcon /> Kirim
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer text-muted-foreground hover:bg-[#f7f9ff] hover:text-[#0528f2]"
                            onClick={() => setViewTarget(batch)}
                            aria-label="Lihat batch"
                          >
                            <EyeIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:bg-[#f7f9ff] hover:text-[#0528f2]"
                            onClick={() => openEditBatch(batch)}
                            aria-label="Edit batch"
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                            onClick={() => setDeleteTarget(batch)}
                            aria-label="Hapus batch"
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

              {!isLoading && batches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {mode === "distribution"
                      ? "Belum ada batch untuk distribusi."
                      : "Belum ada batch produksi."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {!isLoading && batches.length > BATCHES_PER_PAGE ? (
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </section>

      <Dialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => !open && setViewTarget(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Batch Produksi</DialogTitle>
            <DialogDescription>{viewTarget?.id}</DialogDescription>
          </DialogHeader>
          {viewTarget ? (
            <div className="grid gap-5">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">ID Batch</p>
                <p className="text-sm font-semibold break-all">
                  {viewTarget.id}
                </p>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Foto makanan</p>
                <PhotoThumb
                  label="Makanan Jadi"
                  url={getLatestFoodPhotoUrl(viewTarget)}
                  onZoom={setZoomFotoUrl}
                />
              </div>
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Menu</dt>
                  <dd className="font-medium">
                    {viewTarget.menu?.name ?? "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Porsi</dt>
                  <dd className="font-medium">
                    {getBatchRemainingPortions(
                      viewTarget,
                      distributions
                    ).toLocaleString("id-ID")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{viewTarget.status}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Driver</dt>
                  <dd className="font-medium">
                    {viewTarget.driver?.name ?? "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Dibuat</dt>
                  <dd className="font-medium">
                    {viewTarget.createdAt
                      ? new Date(viewTarget.createdAt).toLocaleString("id-ID")
                      : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="flex max-h-[90svh] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Batch Produksi</DialogTitle>
            <DialogDescription>{editTarget?.id}</DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-col gap-4"
            onSubmit={saveBatchEdit}
          >
            <div className="max-h-[calc(90svh-10rem)] overflow-y-auto overscroll-contain pr-2">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Nama menu
                  <Input
                    value={editForm.namaMenu}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        namaMenu: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Jumlah porsi
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    value={editForm.totalPorsi}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        totalPorsi: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Waktu mulai produksi
                  <Input
                    type="datetime-local"
                    value={editForm.waktuMulai}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        waktuMulai: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Waktu selesai produksi
                  <Input
                    type="datetime-local"
                    value={editForm.waktuSelesai}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        waktuSelesai: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <div className="grid gap-2 text-sm font-medium md:col-span-2">
                  Foto makanan
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                    {editFotoPreview || getLatestFoodPhotoUrl(editTarget) ? (
                      <button
                        type="button"
                        className="group w-full overflow-hidden rounded-xl border bg-muted/20 text-left"
                        onClick={() =>
                          setZoomFotoUrl(
                            editFotoPreview || getLatestFoodPhotoUrl(editTarget)
                          )
                        }
                      >
                        <img
                          src={
                            editFotoPreview || getLatestFoodPhotoUrl(editTarget)
                          }
                          alt={
                            editFotoPreview
                              ? "Preview foto makanan baru"
                              : `Foto makanan batch ${editTarget?.id}`
                          }
                          className="h-20 w-full object-cover transition group-hover:opacity-90"
                        />
                        <p
                          className={cn(
                            "border-t px-2 py-1 text-xs",
                            editFotoPreview
                              ? "bg-primary font-medium text-primary-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {editFotoPreview
                            ? "Foto siap diganti. Klik zoom."
                            : "Foto saat ini. Klik zoom."}
                        </p>
                      </button>
                    ) : (
                      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Belum ada foto makanan.
                      </div>
                    )}
                    <div
                      className={cn(
                        "grid gap-2 rounded-xl border p-3",
                        editFotoMakanan
                          ? "border-primary/20 bg-primary/5"
                          : "bg-muted/10"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-normal",
                          editFotoMakanan
                            ? "flex items-center gap-1.5 font-medium text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {editFotoMakanan ? (
                          <>
                            <CheckCircle2Icon className="h-4 w-4" />
                            File baru dipilih
                          </>
                        ) : (
                          "Foto bisa diganti dengan file baru."
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          className={cn(
                            "inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground",
                            editFotoMakanan && "border-primary/20 text-primary"
                          )}
                        >
                          Ganti foto
                          <Input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) =>
                              setEditFotoMakanan(
                                event.target.files?.[0] || null
                              )
                            }
                          />
                        </label>
                        {editFotoMakanan && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setEditFotoMakanan(null)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="truncate text-xs font-normal text-muted-foreground">
                        {editFotoMakanan?.name ?? "Belum memilih file baru."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <section className="mt-4 grid gap-3 border-t pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold">Komposisi makanan</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditKomposisi((current) => [
                        ...current,
                        createEmptyKomposisi(),
                      ])
                    }
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Tambah Komposisi
                  </Button>
                </div>

                <div className="max-h-44 space-y-3 overflow-y-auto overscroll-contain pr-1">
                  {editKomposisi.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        required
                        placeholder="Contoh: Nasi, ayam, sayur bayam"
                        value={item.namaBahan}
                        onChange={(event) =>
                          setEditKomposisi((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { namaBahan: event.target.value }
                                : row
                            )
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={editKomposisi.length === 1}
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setEditKomposisi((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index
                            )
                          )
                        }
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
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

      {zoomFotoUrl ? (
        <PhotoLightbox url={zoomFotoUrl} onClose={() => setZoomFotoUrl(null)} />
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) =>
          !open && !isDeletingBatch && setDeleteTarget(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Batch {deleteTarget?.id} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBatch}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingBatch}
              onClick={(event) => {
                event.preventDefault()
                void deleteBatch()
              }}
            >
              {isDeletingBatch ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
