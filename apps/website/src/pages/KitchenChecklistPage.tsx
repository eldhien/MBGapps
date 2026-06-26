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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { KitchenChecklist } from "@/lib/api"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  CameraIcon,
  CheckCircle2Icon,
  EyeIcon,
  ImageIcon,
  ImageUpIcon,
  PencilIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
  ZoomInIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"

type PhotoField = "apdPhoto" | "alatPhoto" | "kebersihanPhoto"

type FormState = {
  apdPhoto: string
  alatPhoto: string
  kebersihanPhoto: string
  kondisiDapur: string
}

type FileMeta = {
  dimensions: string
  name: string
  sizeLabel: string
  url: string
}

type FileMetaState = Record<PhotoField, FileMeta | null>

const maxOriginalFileSize = 8 * 1024 * 1024
const maxCompressedFileSize = 450 * 1024
const maxImageDimension = 1600

const initialForm: FormState = {
  apdPhoto: "",
  alatPhoto: "",
  kebersihanPhoto: "",
  kondisiDapur: "",
}

const initialFileMeta: FileMetaState = {
  apdPhoto: null,
  alatPhoto: null,
  kebersihanPhoto: null,
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Foto belum bisa dibaca. Coba pilih foto lain."))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Foto belum bisa diproses. Coba pilih foto lain."))
    image.src = src
  })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? ""
  return Math.ceil((base64.length * 3) / 4)
}

function getWeekRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return { end, start }
}

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pilih foto dalam format gambar.")
  }

  if (file.size > maxOriginalFileSize) {
    throw new Error("Ukuran foto terlalu besar. Maksimal 8 MB per foto.")
  }

  const sourceDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(sourceDataUrl)
  const scale = Math.min(1, maxImageDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Foto belum bisa disiapkan di perangkat ini. Coba gunakan foto lain.")
  }

  context.drawImage(image, 0, 0, width, height)

  const qualitySteps = [0.86, 0.76, 0.66, 0.58, 0.5, 0.42]
  let bestDataUrl = canvas.toDataURL("image/jpeg", qualitySteps[0])

  for (const quality of qualitySteps) {
    const candidate = canvas.toDataURL("image/jpeg", quality)
    bestDataUrl = candidate

    if (estimateDataUrlBytes(candidate) <= maxCompressedFileSize) {
      break
    }
  }

  return {
    dataUrl: bestDataUrl,
    dimensions: `${width}x${height}`,
    sizeLabel: formatBytes(estimateDataUrlBytes(bestDataUrl)),
  }
}

async function uploadChecklistPhoto(field: PhotoField, file: File) {
  const processed = await compressImage(file)
  const upload = await api.kitchenChecklists.uploadPhoto({
    field,
    photo: processed.dataUrl,
  })

  return {
    dimensions: processed.dimensions,
    name: file.name,
    sizeLabel: processed.sizeLabel,
    url: upload.data.url,
  }
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
        <p className="text-center text-xs italic text-muted-foreground/60">
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

function PhotoLightbox({
  label,
  onClose,
  url,
}: {
  label: string
  onClose: () => void
  url: string
}) {
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
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
        aria-label="Tutup"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt={label}
        className="max-h-[92vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
        onClick={keepPreviewOpen}
        onPointerDown={keepPreviewOpen}
      />
    </div>,
    document.body
  )
}

export function KitchenChecklistPage({
  mode = "upload",
}: {
  mode?: "history" | "upload"
}) {
  const cachedChecklists = getCachedPageData<KitchenChecklist[]>(
    pageCacheKeys.kitchenChecklists
  )
  const [checklists, setChecklists] = useState<KitchenChecklist[]>(
    cachedChecklists ?? []
  )
  const [loading, setLoading] = useState(!cachedChecklists)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [processingField, setProcessingField] = useState<PhotoField | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [fileMeta, setFileMeta] = useState<FileMetaState>(initialFileMeta)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [editTarget, setEditTarget] = useState<KitchenChecklist | null>(null)
  const [editForm, setEditForm] = useState<FormState>(initialForm)
  const [editFileMeta, setEditFileMeta] =
    useState<FileMetaState>(initialFileMeta)
  const [editFileInputKey, setEditFileInputKey] = useState(0)
  const [editProcessingField, setEditProcessingField] =
    useState<PhotoField | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [viewTarget, setViewTarget] = useState<KitchenChecklist | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KitchenChecklist | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [zoomPhoto, setZoomPhoto] = useState<{
    label: string
    url: string
  } | null>(null)

  useEffect(() => {
    void loadChecklists()
  }, [])

  const loadChecklists = async (force = false) => {
    if (!force) {
      const checklistsCache = getCachedPageData<KitchenChecklist[]>(
        pageCacheKeys.kitchenChecklists
      )

      if (checklistsCache) {
        setChecklists(checklistsCache)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.kitchenChecklists.list()
      setChecklists(
        setCachedPageData(pageCacheKeys.kitchenChecklists, response.data)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setLoading(false)
    }
  }

  const clearPhoto = (field: PhotoField) => {
    setForm((current) => ({
      ...current,
      [field]: "",
    }))
    setFileMeta((current) => ({
      ...current,
      [field]: null,
    }))
    setFileInputKey((value) => value + 1)
  }

  const handlePhotoChange = async (field: PhotoField, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setProcessingField(field)
    setError(null)

    try {
      const uploadedPhoto = await uploadChecklistPhoto(field, file)

      setForm((current) => ({
        ...current,
        [field]: uploadedPhoto.url,
      }))
      setFileMeta((current) => ({
        ...current,
        [field]: uploadedPhoto,
      }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Foto belum bisa disiapkan.")
      event.target.value = ""
    } finally {
      setProcessingField(null)
    }
  }

  const handleEditPhotoChange = async (
    field: PhotoField,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setEditProcessingField(field)
    setError(null)

    try {
      const uploadedPhoto = await uploadChecklistPhoto(field, file)

      setEditForm((current) => ({
        ...current,
        [field]: uploadedPhoto.url,
      }))
      setEditFileMeta((current) => ({
        ...current,
        [field]: uploadedPhoto,
      }))
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Foto belum bisa disiapkan."
      )
      event.target.value = ""
    } finally {
      setEditProcessingField(null)
    }
  }

  function openEditReport(report: KitchenChecklist) {
    setEditTarget(report)
    setEditForm({
      apdPhoto: report.apdPhoto,
      alatPhoto: report.alatPhoto,
      kebersihanPhoto: report.kebersihanPhoto,
      kondisiDapur: report.kondisiDapur,
    })
    setEditFileMeta({
      apdPhoto: {
        dimensions: "Tersimpan",
        name: "Foto APD tersimpan",
        sizeLabel: "Foto lama",
        url: report.apdPhoto,
      },
      alatPhoto: {
        dimensions: "Tersimpan",
        name: "Foto alat tersimpan",
        sizeLabel: "Foto lama",
        url: report.alatPhoto,
      },
      kebersihanPhoto: {
        dimensions: "Tersimpan",
        name: "Foto kebersihan tersimpan",
        sizeLabel: "Foto lama",
        url: report.kebersihanPhoto,
      },
    })
    setEditFileInputKey((value) => value + 1)
  }

  function closeEditReport() {
    setEditTarget(null)
    setEditForm(initialForm)
    setEditFileMeta(initialFileMeta)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    const payload = {
      apdPhoto: form.apdPhoto,
      alatPhoto: form.alatPhoto,
      kebersihanPhoto: form.kebersihanPhoto,
      kondisiDapur: form.kondisiDapur.trim(),
    }

    if (
      !payload.apdPhoto ||
      !payload.alatPhoto ||
      !payload.kebersihanPhoto ||
      !payload.kondisiDapur
    ) {
      setError("Lengkapi tiga foto dan kondisi dapur.")
      setSubmitting(false)
      return
    }

    try {
      const response = await api.kitchenChecklists.create(payload)
      setChecklists((currentChecklists) =>
        setCachedPageData(pageCacheKeys.kitchenChecklists, [
          response.data,
          ...currentChecklists,
        ])
      )
      setForm(initialForm)
      setFileMeta(initialFileMeta)
      setFileInputKey((value) => value + 1)
      setSuccessMessage("Laporan kebersihan berhasil disimpan.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editTarget) {
      return
    }

    setEditSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    const payload = {
      apdPhoto: editForm.apdPhoto,
      alatPhoto: editForm.alatPhoto,
      kebersihanPhoto: editForm.kebersihanPhoto,
      kondisiDapur: editForm.kondisiDapur.trim(),
    }

    if (
      !payload.apdPhoto ||
      !payload.alatPhoto ||
      !payload.kebersihanPhoto ||
      !payload.kondisiDapur
    ) {
      setError("Lengkapi tiga foto dan kondisi dapur.")
      setEditSubmitting(false)
      return
    }

    try {
      const response = await api.kitchenChecklists.update(editTarget.id, payload)
      setChecklists((currentChecklists) =>
        setCachedPageData(
          pageCacheKeys.kitchenChecklists,
          currentChecklists.map((item) =>
            item.id === response.data.id ? response.data : item
          )
        )
      )
      setSuccessMessage("Laporan kebersihan berhasil diperbarui.")
      closeEditReport()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleteSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await api.kitchenChecklists.delete(deleteTarget.id)
      setChecklists((currentChecklists) =>
        setCachedPageData(
          pageCacheKeys.kitchenChecklists,
          currentChecklists.filter((item) => item.id !== deleteTarget.id)
        )
      )
      setSuccessMessage("Laporan kebersihan berhasil dihapus.")
      setDeleteTarget(null)

      if (editTarget?.id === deleteTarget.id) {
        closeEditReport()
      }

      if (viewTarget?.id === deleteTarget.id) {
        setViewTarget(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const currentWeekReport = useMemo(() => {
    const currentWeek = getWeekRange()

    return checklists.find((item) => {
      const reportDate = new Date(item.timestamp)

      return reportDate >= currentWeek.start && reportDate < currentWeek.end
    })
  }, [checklists])
  const hasCurrentWeekReport = Boolean(currentWeekReport)

  const photoFields: {
    field: PhotoField
    helper: string
    label: string
  }[] = [
    {
      field: "apdPhoto",
      label: "Foto APD",
      helper: "Ambil foto penggunaan APD petugas dapur.",
    },
    {
      field: "alatPhoto",
      label: "Foto alat",
      helper: "Dokumentasikan alat masak atau alat saji yang digunakan.",
    },
    {
      field: "kebersihanPhoto",
      label: "Foto kebersihan area",
      helper: "Tunjukkan kondisi lantai, meja, dan area produksi.",
    },
  ]
  const isUploadPage = mode === "upload"
  const pageTitle = isUploadPage
    ? "Upload Laporan"
    : "Riwayat Laporan"

  return (
    <DashboardShell title={pageTitle}>
      {successMessage ? (
        <AlertToast
          title="Berhasil"
          description={successMessage}
          onClose={() => setSuccessMessage(null)}
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
            Laporan mingguan
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isUploadPage ? "Upload Laporan" : "Riwayat Laporan"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {isUploadPage
              ? "Tambahkan foto APD, alat, dan kebersihan area dapur. Foto akan disiapkan otomatis agar mudah dikirim."
              : "Lihat dokumentasi laporan kebersihan dapur yang sudah tersimpan."}
          </p>
        </div>
      </section>

      <section className="grid gap-6">
        {isUploadPage ? (
        loading ? (
          <Card className="border-border/70">
            <CardContent className="p-5 text-sm text-muted-foreground">
              Memeriksa laporan minggu ini...
            </CardContent>
          </Card>
        ) : hasCurrentWeekReport ? (
          <Card className="min-h-[calc(100svh-19rem)] border-border/70">
            <CardContent className="flex min-h-[calc(100svh-19rem)] flex-col items-center justify-center gap-4 p-6 text-center">
              <div>
                <p className="text-base font-semibold">
                  Laporan minggu ini sudah dikirim
                </p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Laporan dibuat pada{" "}
                  {currentWeekReport
                    ? new Date(currentWeekReport.timestamp).toLocaleString(
                        "id-ID"
                      )
                    : "-"}
                  . Perubahan hanya bisa dilakukan melalui riwayat.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/cleanliness-reports/history">Buka riwayat</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Upload Laporan Mingguan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pilih tiga foto pemeriksaan hari ini, lalu tambahkan catatan kondisi dapur sebelum menyimpan laporan.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-3">
                {photoFields.map((item, index) => {
                  const preview = form[item.field]
                  const meta = fileMeta[item.field]
                  const inputId = `${item.field}-${fileInputKey}`
                  const isProcessing = processingField === item.field

                  return (
                    <div
                      key={item.field}
                      className="flex flex-col justify-between rounded-2xl border bg-card p-5 hover-card-effect"
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <h3 className="text-sm font-semibold text-foreground leading-none">
                            {item.label}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px] mb-4">
                          {item.helper}
                        </p>
                      </div>

                      <input
                        id={inputId}
                        key={inputId}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handlePhotoChange(item.field, event)}
                      />

                      <div className="relative group overflow-hidden rounded-xl border bg-muted/40 aspect-[4/3] flex items-center justify-center">
                        {preview ? (
                          <>
                            <img
                              src={preview}
                              alt={item.label}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <label
                              htmlFor={inputId}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 text-white transition-opacity duration-200 cursor-pointer"
                            >
                              <CameraIcon className="size-5 animate-pulse" />
                              <span className="text-xs font-medium">Ubah foto</span>
                            </label>
                          </>
                        ) : (
                          <label
                            htmlFor={inputId}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/60 transition-colors"
                          >
                            <div className="rounded-full bg-background p-2.5 shadow-xs">
                              <CameraIcon className="size-5 text-muted-foreground" />
                            </div>
                            <span className="text-xs font-medium text-center px-2">
                              {isProcessing ? "Menyiapkan foto..." : "Pilih foto"}
                            </span>
                          </label>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
                          meta
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
                            : "bg-muted/50 text-muted-foreground border border-transparent"
                        }`}>
                          {meta ? (
                            <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <ImageUpIcon className="size-4 shrink-0 mt-0.5" />
                          )}
                          <div className="overflow-hidden">
                            <p className="truncate font-medium">
                              {meta?.name ?? "Belum ada foto"}
                            </p>
                            <p className="mt-0.5 text-[10px] opacity-80">
                              {meta
                                ? `${meta.sizeLabel} - ${meta.dimensions}`
                                : "Foto akan disiapkan otomatis"}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm" className="flex-1 cursor-pointer">
                            <label htmlFor={inputId} className="w-full flex items-center justify-center gap-1 cursor-pointer">
                              <UploadIcon className="size-3.5" />
                              <span>{preview ? "Ganti" : "Pilih"}</span>
                            </label>
                          </Button>
                          {preview && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => clearPhoto(item.field)}
                              className="px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground flex items-start gap-2.5">
                  <ShieldCheckIcon className="size-5 text-primary shrink-0 mt-0.5" />
                  <p>
                    <strong>Panduan Pemeriksaan:</strong> Pastikan foto menampilkan kondisi nyata di hari pemeriksaan dengan pencahayaan yang cukup. Tanggal laporan otomatis memakai waktu saat tombol simpan ditekan.
                  </p>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Kondisi dapur
                <textarea
                  className="min-h-32 rounded-xl border border-input bg-background px-3 py-3 text-sm shadow-xs outline-none input-focus-effect"
                  placeholder="Contoh: APD lengkap, alat bersih dan tersusun, area produksi sudah disanitasi sebelum proses dimulai."
                  value={form.kondisiDapur}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kondisiDapur: event.target.value,
                    }))
                  }
                />
              </label>

              <Button disabled={submitting || Boolean(processingField)} type="submit" className="w-full h-11 rounded-xl shadow-xs hover:shadow-md transition-all">
                {submitting ? "Menyimpan laporan..." : "Simpan laporan"}
              </Button>
            </form>
          </CardContent>
        </Card>
        )
        ) : null}

        {!isUploadPage ? (
        <section className="rounded-lg border bg-card text-card-foreground">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Riwayat Laporan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Kondisi dapur</th>
                  <th className="px-4 py-3 font-medium">Foto</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-64" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="ml-auto h-8 w-32" />
                        </td>
                      </tr>
                    ))
                  : null}

                {!loading && checklists.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Belum ada laporan kebersihan yang tersimpan.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? checklists.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {new Date(item.timestamp).toLocaleDateString("id-ID")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString("id-ID")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <p className="line-clamp-2">{item.kondisiDapur}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            3 foto
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewTarget(item)}
                            >
                              <EyeIcon className="mr-1 h-4 w-4" />
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditReport(item)}
                            >
                              <PencilIcon className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2Icon className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}
      </section>

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open && !zoomPhoto) {
            closeEditReport()
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Laporan Kebersihan</DialogTitle>
            <DialogDescription>
              Perbarui foto atau kondisi dapur untuk laporan yang dipilih.
            </DialogDescription>
          </DialogHeader>

          {editTarget ? (
            <form className="grid gap-4" onSubmit={handleEditSubmit}>
              <div className="grid gap-3 md:grid-cols-3">
                {photoFields.map((item) => {
                  const preview = editForm[item.field]
                  const meta = editFileMeta[item.field]
                  const inputId = `edit-${item.field}-${editFileInputKey}`
                  const isProcessing = editProcessingField === item.field

                  return (
                    <div
                      key={item.field}
                      className="rounded-xl border bg-card p-3"
                    >
                      <p className="text-xs font-semibold">{item.label}</p>
                      <input
                        id={inputId}
                        key={inputId}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          void handleEditPhotoChange(item.field, event)
                        }
                      />
                      <label
                        htmlFor={inputId}
                        className="mt-3 block cursor-pointer overflow-hidden rounded-lg border bg-muted/40"
                      >
                        <div className="h-20 w-full">
                          <img
                            src={preview}
                            alt={item.label}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                          {isProcessing
                            ? "Menyiapkan foto..."
                            : meta?.name ?? "Ganti foto"}
                        </div>
                      </label>
                    </div>
                  )
                })}
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Kondisi dapur
                <textarea
                  className="min-h-28 rounded-xl border border-input bg-background px-3 py-3 text-sm shadow-xs outline-none input-focus-effect"
                  value={editForm.kondisiDapur}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      kondisiDapur: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditReport}
                >
                  Batal
                </Button>
                <Button
                  disabled={editSubmitting || Boolean(editProcessingField)}
                  pending={editSubmitting}
                  type="submit"
                >
                  {editSubmitting
                    ? "Menyimpan perubahan..."
                    : "Simpan perubahan"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => {
          if (!open && !zoomPhoto) setViewTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Laporan Kebersihan</DialogTitle>
            <DialogDescription>
              {viewTarget
                ? new Date(viewTarget.timestamp).toLocaleString("id-ID")
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewTarget ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { label: "APD", value: viewTarget.apdPhoto },
                  { label: "Alat", value: viewTarget.alatPhoto },
                  { label: "Kebersihan", value: viewTarget.kebersihanPhoto },
                ].map((photo) => (
                  <PhotoThumb
                    key={photo.label}
                    label={photo.label}
                    url={photo.value}
                    onZoom={(url) => setZoomPhoto({ label: photo.label, url })}
                  />
                ))}
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  Kondisi dapur
                </p>
                <p className="mt-2 text-sm leading-6">{viewTarget.kondisiDapur}</p>
              </div>
            </div>
          ) : null}

        </DialogContent>
      </Dialog>

      {zoomPhoto ? (
        <PhotoLightbox
          label={zoomPhoto.label}
          url={zoomPhoto.url}
          onClose={() => setZoomPhoto(null)}
        />
      ) : null}

      {false && zoomPhoto ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm pointer-events-auto"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="relative flex max-h-[95svh] h-[95svh] w-[95vw] flex-col overflow-hidden rounded-xl bg-popover p-3 shadow-lg"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 z-10 bg-background/80"
              onClick={() => setZoomPhoto(null)}
            >
              ×
            </Button>
            <p className="mb-2 pr-10 text-sm font-medium">{zoomPhoto?.label}</p>
            <img
              src={zoomPhoto?.url}
              alt={zoomPhoto?.label}
              className="h-full w-full rounded-lg object-contain"
            />
          </div>
        </div>,
        document.body
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Laporan kebersihan ini akan dihapus permanen dari riwayat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteSubmitting}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteReport()
              }}
            >
              {deleteSubmitting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
