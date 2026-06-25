import { useEffect, useState } from "react"
import { CheckIcon, CheckCircle2Icon, ClockIcon, TruckIcon, PackageCheckIcon, XIcon, ImageIcon, ZoomInIcon, FlagIcon } from "lucide-react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type SchoolDistribution } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { cn } from "@/lib/utils"

function getStep(distribution: SchoolDistribution): 1 | 2 | 3 {
  if (distribution.status === "DITERIMA") return 3
  if (distribution.status === "DITOLAK") return 3
  if (
    distribution.distribution.status === "DIKIRIM" ||
    distribution.distribution.status === "SELESAI"
  )
    return 2
  return 1
}

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ProcessTracker({ rejected = false, step }: { rejected?: boolean; step: 1 | 2 | 3 }) {
  const steps = [
    { label: "Batch Dibuat", icon: PackageCheckIcon },
    { label: "Dalam Antar", icon: TruckIcon },
    { label: rejected ? "Ditolak Sekolah" : "Diterima Sekolah", icon: rejected ? XIcon : CheckCircle2Icon },
  ]

  return (
    <div className="flex items-start justify-between gap-0">
      {steps.map((s, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3
        const isDone = step >= stepNumber
        const isLast = index === steps.length - 1
        const Icon = s.icon

        return (
          <div key={index} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                  isDone
                    ? rejected && isLast
                      ? "border-red-500 bg-red-500 text-white"
                      : "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground/50"
                )}
              >
                {isDone ? (
                  <CheckIcon className="h-4 w-4 stroke-[3]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-center text-xs font-medium leading-tight",
                  isDone
                    ? rejected && isLast
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                    : "text-muted-foreground/60"
                )}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <div className="relative mx-1 mt-4 flex-1">
                <div className="absolute inset-y-0 my-auto h-0.5 w-full rounded bg-muted-foreground/20" />
                <div
                  className={cn(
                    "absolute inset-y-0 my-auto h-0.5 rounded bg-green-500 transition-all duration-500",
                    step > stepNumber ? "w-full" : "w-0"
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PhotoThumb({
  url,
  label,
  onZoom,
}: {
  url: string | null | undefined
  label: string
  onZoom: (url: string) => void
}) {
  if (!url) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground/50">
          <ImageIcon className="h-5 w-5" />
        </div>
        <p className="truncate text-center text-xs text-muted-foreground">{label}</p>
        <p className="text-center text-xs italic text-muted-foreground/60">Belum ada</p>
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
        <img src={url} alt={label} className="h-full w-full object-cover transition group-hover:opacity-90 group-hover:scale-105" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
          <ZoomInIcon className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
        </div>
      </button>
      <p className="truncate text-center text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  function closePreview(event: React.SyntheticEvent) {
    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  function keepPreviewOpen(event: React.SyntheticEvent) {
    event.stopPropagation()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
      onClick={closePreview}
      onPointerDown={closePreview}
    >
      <button
        type="button"
        onClick={closePreview}
        onPointerDown={closePreview}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
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

function DetailModal({
  distribution,
  open,
  onClose,
}: {
  distribution: SchoolDistribution | null
  open: boolean
  onClose: () => void
}) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setZoomUrl(null)
    }
  }, [open])

  if (!distribution) return null

  const step = getStep(distribution)
  const isFinal = distribution.status === "DITERIMA" || distribution.status === "DITOLAK"

  const fotoMakananJadi = distribution.batch.foto?.find((f: any) => f.jenis === "MAKANAN_JADI")?.url
  const fotoBuktiTerima = distribution.buktiTerimaFotoUrl

  return (
    <>
      {zoomUrl && <PhotoLightbox url={zoomUrl} onClose={() => setZoomUrl(null)} />}
      <Dialog open={open} onOpenChange={(o) => !o && !zoomUrl && onClose()}>
        <DialogContent
          className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"
          onInteractOutside={(e) => {
            if (zoomUrl) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (zoomUrl) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Detail Distribusi</DialogTitle>
            <DialogDescription>{distribution.batch.id}</DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/10 p-4">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Progres Pengiriman
            </p>
            <ProcessTracker rejected={distribution.status === "DITOLAK"} step={step} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="text-center">
                <p className="font-medium text-foreground/70">Dibuat</p>
                <p>{formatDate(distribution.batch.createdAt)}</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground/70">Dikirim</p>
                <p>{formatDate(distribution.distribution.waktuKirim)}</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground/70">Diterima</p>
                <p>{formatDate(distribution.receivedAt)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  step >= 1 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {step >= 1 ? <CheckIcon className="h-3 w-3" /> : "1"}
                </div>
                <p className="text-sm font-semibold">Foto Produksi Batch</p>
              </div>
              <PhotoThumb url={fotoMakananJadi} label="Makanan Jadi" onZoom={setZoomUrl} />
            </div>
          </div>

          <dl className="grid gap-2 rounded-xl border bg-muted/10 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Menu</dt>
              <dd className="font-medium">{distribution.batch.menu?.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Porsi untuk sekolah ini</dt>
              <dd className="font-medium">{distribution.jumlahPorsi.toLocaleString("id-ID")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Driver</dt>
              <dd className="font-medium">
                {distribution.batch.driver
                  ? `${distribution.batch.driver.name}${distribution.batch.driver.vehicleNumber ? ` (${distribution.batch.driver.vehicleNumber})` : ""}`
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status distribusi</dt>
              <dd className="font-medium">{distribution.distribution.status}</dd>
            </div>
          </dl>

          {fotoBuktiTerima ? (
            <div className="grid gap-2 rounded-xl border p-4">
              <p className="text-sm font-semibold">Foto Bukti Terima Sekolah</p>
              <PhotoThumb url={fotoBuktiTerima} label="Bukti Terima" onZoom={setZoomUrl} />
            </div>
          ) : null}

          {isFinal ? (
            <div className={cn(
              "flex items-center gap-3 rounded-xl border p-4",
              distribution.status === "DITERIMA"
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            )}>
              {distribution.status === "DITERIMA" ? (
                <CheckCircle2Icon className="h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <XIcon className="h-5 w-5 shrink-0 text-red-600" />
              )}
              <div>
                <p className={cn(
                  "font-semibold",
                  distribution.status === "DITERIMA" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                )}>
                  {distribution.status === "DITERIMA" ? "Telah Diterima" : "Ditolak"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {distribution.status === "DITERIMA"
                    ? `Diterima pada ${formatDate(distribution.receivedAt)}`
                    : distribution.rejectedReason}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ValidationModal({
  distribution,
  open,
  onClose,
  onConfirmValidation,
}: {
  distribution: SchoolDistribution | null
  open: boolean
  onClose: () => void
  onConfirmValidation: (
    dist: SchoolDistribution,
    status: "DITERIMA" | "DITOLAK",
    file: File | null,
    note: string
  ) => void
}) {
  const [buktiFile, setBuktiFile] = useState<File | null>(null)
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setBuktiFile(null)
      setBuktiPreview(null)
      setNote("")
      setZoomUrl(null)
    }
  }, [open])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setBuktiFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setBuktiPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setBuktiPreview(null)
    }
  }

  if (!distribution) return null

  const step = getStep(distribution)
  const fotoBuktiTerima = distribution.buktiTerimaFotoUrl ?? buktiPreview

  return (
    <>
      {zoomUrl && <PhotoLightbox url={zoomUrl} onClose={() => setZoomUrl(null)} />}
      <Dialog open={open} onOpenChange={(o) => !o && !zoomUrl && onClose()}>
        <DialogContent
          className="max-h-[90svh] overflow-y-auto sm:max-w-lg"
          onInteractOutside={(e) => {
            if (zoomUrl) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (zoomUrl) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Validasi Penerimaan</DialogTitle>
            <DialogDescription>{distribution.batch.id}</DialogDescription>
          </DialogHeader>

          {step >= 2 ? (
            <div className="grid gap-4">
              <div className="rounded-xl border bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">Batch</p>
                <p className="font-semibold">{distribution.batch.id}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {distribution.batch.menu?.name ?? "-"} · {distribution.jumlahPorsi.toLocaleString("id-ID")} porsi
                </p>
              </div>

              <div className="grid gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">Foto Bukti Terima Sekolah</p>
                {fotoBuktiTerima ? (
                  <button
                    type="button"
                    onClick={() => setZoomUrl(fotoBuktiTerima)}
                    className="group relative h-32 w-full overflow-hidden rounded-lg border bg-muted/20 text-left"
                  >
                    <img
                      src={fotoBuktiTerima}
                      alt="Bukti Terima"
                      className="h-full w-full object-cover transition group-hover:opacity-90"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-background/90 px-2 py-1 text-xs text-muted-foreground">
                      Klik untuk zoom
                    </span>
                  </button>
                ) : (
                  <label
                    className={cn(
                      "flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 text-muted-foreground transition hover:bg-muted/50",
                      buktiFile && "border-primary/50 bg-primary/5"
                    )}
                  >
                    {buktiFile ? (
                      <>
                        <CheckCircle2Icon className="h-6 w-6 text-primary" />
                        <p className="text-xs font-medium text-primary">{buktiFile.name}</p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6" />
                        <p className="text-xs">Tap untuk upload foto</p>
                      </>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Catatan
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Kondisi makanan, catatan khusus, atau alasan jika ditolak."
                />
              </label>

              {!buktiFile && !distribution.buktiTerimaFotoUrl ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  Wajib upload foto sebelum menekan selesai atau ditolak.
                </p>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  className="w-full"
                  disabled={!buktiFile && !distribution.buktiTerimaFotoUrl}
                  onClick={() => {
                    if (buktiFile || distribution.buktiTerimaFotoUrl) {
                      onConfirmValidation(distribution, "DITERIMA", buktiFile, note)
                      onClose()
                    }
                  }}
                >
                  <CheckIcon className="mr-1.5 h-4 w-4" />
                  Selesai
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  disabled={!note.trim() || (!buktiFile && !distribution.buktiTerimaFotoUrl)}
                  onClick={() => {
                    onConfirmValidation(distribution, "DITOLAK", buktiFile, note)
                    onClose()
                  }}
                >
                  <XIcon className="mr-1.5 h-4 w-4" />
                  Ditolak
                </Button>
              </div>
              {!note.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Catatan dan foto wajib diisi jika makanan ditolak.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">
              <ClockIcon className="h-4 w-4 shrink-0" />
              Menunggu driver memulai pengiriman sebelum dapat divalidasi.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SchoolDistributionsPage({
  mode = "validation",
}: {
  mode?: "validation" | "history"
}) {
  const navigate = useNavigate()
  const cachedDistributions = getCachedPageData<SchoolDistribution[]>(
    pageCacheKeys.schoolDistributions
  )
  const [distributions, setDistributions] = useState<SchoolDistribution[]>(
    () => cachedDistributions ?? []
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!cachedDistributions)
  const [success, setSuccess] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<SchoolDistribution | null>(null)
  const [validationTarget, setValidationTarget] = useState<SchoolDistribution | null>(null)
  const [confirmValidationPending, setConfirmValidationPending] = useState<{
    distribution: SchoolDistribution
    file: File | null
    note: string
    status: "DITERIMA" | "DITOLAK"
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function fetchLatestData(showLoading: boolean) {
    if (showLoading) setIsLoading(true)
    setError(null)
    try {
      const response = await api.schoolDistributions.list()
      setDistributions(
        setCachedPageData(pageCacheKeys.schoolDistributions, response.distributions)
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal memuat distribusi.")
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  async function loadData(force = false) {
    if (!force) {
      const cachedData = getCachedPageData<SchoolDistribution[]>(
        pageCacheKeys.schoolDistributions
      )

      if (cachedData) {
        setDistributions(cachedData)
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
    return subscribePageCache<SchoolDistribution[]>(
      pageCacheKeys.schoolDistributions,
      (cachedData) => {
        if (cachedData) {
          setDistributions(cachedData)
          setIsLoading(false)
        }
      }
    )
  }, [])

  useEffect(() => {
    setViewTarget((current) =>
      current
        ? distributions.find((distribution) => distribution.id === current.id) ?? null
        : null
    )
    setValidationTarget((current) =>
      current
        ? distributions.find((distribution) => distribution.id === current.id) ?? null
        : null
    )
  }, [distributions])

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



  async function executeValidation() {
    if (!confirmValidationPending) return
    const { distribution, file, note, status } = confirmValidationPending
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await api.schoolDistributions.updateStatus(distribution.id, {
        status,
        file,
        ...(note.trim() ? { rejectedReason: note.trim() } : {}),
      })
      setDistributions((current) =>
        setCachedPageData(
          pageCacheKeys.schoolDistributions,
          current.map((item) =>
            item.id === response.distribution.id ? response.distribution : item
          )
        )
      )
      const cachedBatches = getCachedPageData<any[]>(pageCacheKeys.productionBatches)
      if (cachedBatches) {
        setCachedPageData(
          pageCacheKeys.productionBatches,
          cachedBatches.map((batch) =>
            batch.id === response.distribution.batch.id
              ? { ...batch, status: response.distribution.batch.status }
              : batch
          )
        )
      }
      const cachedBatchSummaries = getCachedPageData<any[]>(pageCacheKeys.batches)
      if (cachedBatchSummaries) {
        const updatedSummary = {
          id: response.distribution.batch.id,
          batchIdUnik: response.distribution.batch.id,
          namaMenu: response.distribution.batch.menu?.name ?? "Menu",
          waktuProduksi:
            response.distribution.batch.createdAt ?? new Date().toISOString(),
          status: response.distribution.batch.status,
        }

        setCachedPageData(
          pageCacheKeys.batches,
          cachedBatchSummaries.some((batch) => batch.id === updatedSummary.id)
            ? cachedBatchSummaries.map((batch) =>
                batch.id === updatedSummary.id ? { ...batch, ...updatedSummary } : batch
              )
            : [updatedSummary, ...cachedBatchSummaries]
        )
      }
      const cachedDistributions = getCachedPageData<any[]>(
        pageCacheKeys.productionDistributions
      )
      if (cachedDistributions) {
        setCachedPageData(
          pageCacheKeys.productionDistributions,
          cachedDistributions.map((distribution) =>
            distribution.id === response.distribution.distribution.id
              ? {
                  ...distribution,
                  status: response.distribution.distribution.status,
                  schools: distribution.schools?.map((school: any) =>
                    school.id === response.distribution.id
                      ? {
                          ...school,
                          status: response.distribution.status,
                          receivedAt: response.distribution.receivedAt,
                          rejectedReason: response.distribution.rejectedReason,
                        }
                      : school
                  ),
                }
              : distribution
          )
        )
      }
      setSuccess(
        status === "DITERIMA"
          ? "Penerimaan makanan berhasil dikonfirmasi."
          : "Penerimaan makanan berhasil ditolak."
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui status.")
    } finally {
      setIsSubmitting(false)
      setConfirmValidationPending(null)
    }
  }

  const isHistoryPage = mode === "history"
  const visibleDistributions = distributions.filter((distribution) => {
    if (isHistoryPage) {
      return distribution.status === "DITERIMA" || distribution.status === "DITOLAK"
    }

    if (distribution.status !== "DITERIMA" && distribution.status !== "DITOLAK") {
      return true
    }
    if (!distribution.receivedAt) return true
    return Date.now() - new Date(distribution.receivedAt).getTime() < 24 * 60 * 60 * 1000
  })

  const pendingCount = visibleDistributions.filter(
    (d) => d.status !== "DITERIMA" && d.status !== "DITOLAK"
  ).length

  return (
    <DashboardShell title={isHistoryPage ? "Riwayat Distribusi" : "Validasi Penerimaan"}>
      {success ? (
        <AlertToast title="Berhasil" description={success} onClose={() => setSuccess(null)} />
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
            {isHistoryPage ? "Riwayat" : "Sekolah"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isHistoryPage ? "Riwayat Distribusi" : "Validasi Penerimaan"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {isHistoryPage
              ? "Lihat distribusi makanan yang sudah selesai divalidasi sekolah."
              : "Pantau progres pengiriman batch makanan dan konfirmasi penerimaan di sekolah Anda."}
            {!isHistoryPage && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                {pendingCount} menunggu konfirmasi
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">
            {isHistoryPage ? "Distribusi Tervalidasi" : "Makanan Masuk"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isHistoryPage
              ? "Distribusi baru masuk ke riwayat setelah sekolah menekan Selesai atau Ditolak."
              : 'Klik "Validasi" untuk mengunggah foto, memberi catatan, dan menyelesaikan penerimaan.'}
          </p>
        </div>

        <div className="grid gap-4 p-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-3 h-4 w-64" />
                  <Skeleton className="mt-4 h-10 w-28" />
                </div>
              ))
            : null}

          {visibleDistributions.map((distribution) => {
            const isFinal =
              distribution.status === "DITERIMA" || distribution.status === "DITOLAK"
            const step = getStep(distribution)

            return (
              <article
                key={distribution.id}
                className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{distribution.batch.id}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        distribution.status === "DITERIMA"
                          ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                          : distribution.status === "DITOLAK"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      )}
                    >
                      {distribution.status === "DITERIMA"
                        ? "Diterima"
                        : distribution.status === "DITOLAK"
                          ? "Ditolak"
                          : "Menunggu"}
                    </span>
                  </div>

                  <dl className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Menu</dt>
                      <dd className="font-medium">{distribution.batch.menu?.name ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Porsi</dt>
                      <dd className="font-medium">
                        {distribution.jumlahPorsi.toLocaleString("id-ID")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Waktu kirim</dt>
                      <dd className="font-medium">
                        {formatDate(distribution.distribution.waktuKirim)}
                      </dd>
                    </div>
                    {isFinal && distribution.receivedAt && (
                      <div>
                        <dt className="text-muted-foreground">Diterima pada</dt>
                        <dd className="font-medium">{formatDate(distribution.receivedAt)}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-3 max-w-sm">
                    <ProcessTracker rejected={distribution.status === "DITOLAK"} step={step} />
                  </div>
                </div>

                <div className="flex items-start gap-2 md:flex-col">
                  {!isHistoryPage && !isFinal ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setValidationTarget(distribution)}
                    >
                      Validasi
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewTarget(distribution)}
                  >
                    Lihat Detail
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      navigate(`/food-reports?batchId=${encodeURIComponent(distribution.batch.id)}`)
                    }
                  >
                    <FlagIcon className="h-3.5 w-3.5" />
                    Laporan
                  </Button>
                </div>
              </article>
            )
          })}

          {!isLoading && visibleDistributions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {isHistoryPage
                ? "Belum ada distribusi yang sudah divalidasi."
                : "Belum ada makanan masuk untuk divalidasi."}
            </div>
          ) : null}
        </div>
      </section>

      <DetailModal
        distribution={viewTarget}
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
      />

      <ValidationModal
        distribution={validationTarget}
        open={Boolean(validationTarget)}
        onClose={() => setValidationTarget(null)}
        onConfirmValidation={(dist, status, file, note) => {
          setConfirmValidationPending({ distribution: dist, file, note, status })
        }}
      />

      <AlertDialog
        open={Boolean(confirmValidationPending)}
        onOpenChange={(open) => !open && setConfirmValidationPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              {confirmValidationPending?.status === "DITOLAK" ? <XIcon /> : <CheckCircle2Icon />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {confirmValidationPending?.status === "DITOLAK"
                ? "Tolak penerimaan?"
                : "Konfirmasi penerimaan?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Batch {confirmValidationPending?.distribution.batch.id} akan ditandai{" "}
              {confirmValidationPending?.status === "DITOLAK"
                ? "ditolak sekolah."
                : "telah diterima dan foto bukti akan diunggah."}{" "}
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmValidationPending?.status === "DITOLAK" ? "destructive" : "default"}
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault()
                void executeValidation()
              }}
            >
              {isSubmitting ? "Menyimpan..." : "Konfirmasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
