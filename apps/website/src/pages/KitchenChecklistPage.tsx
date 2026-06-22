import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { KitchenChecklist } from "@/lib/api"
import { api } from "@/lib/api"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  CameraIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ImageUpIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"

type PhotoField = "apdPhoto" | "alatPhoto" | "kebersihanPhoto"

type FormState = {
  apdPhoto: string
  alatPhoto: string
  kebersihanPhoto: string
  kondisiDapur: string
  timestamp: string
}

type FileMeta = {
  dimensions: string
  name: string
  sizeLabel: string
}

type FileMetaState = Record<PhotoField, FileMeta | null>

const maxOriginalFileSize = 8 * 1024 * 1024
const maxCompressedFileSize = 450 * 1024
const maxImageDimension = 1600

function getCurrentDateTimeLocal() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}

const initialForm: FormState = {
  apdPhoto: "",
  alatPhoto: "",
  kebersihanPhoto: "",
  kondisiDapur: "",
  timestamp: getCurrentDateTimeLocal(),
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
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("File gambar tidak bisa diproses."))
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

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.")
  }

  if (file.size > maxOriginalFileSize) {
    throw new Error("Ukuran file asli terlalu besar. Maksimal 8 MB per foto.")
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
    throw new Error("Browser tidak mendukung proses kompresi gambar.")
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
    dimensions: `${width}×${height}`,
    sizeLabel: formatBytes(estimateDataUrlBytes(bestDataUrl)),
  }
}

export function KitchenChecklistPage() {
  const [checklists, setChecklists] = useState<KitchenChecklist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [processingField, setProcessingField] = useState<PhotoField | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [fileMeta, setFileMeta] = useState<FileMetaState>(initialFileMeta)
  const [fileInputKey, setFileInputKey] = useState(0)

  useEffect(() => {
    void loadChecklists()
  }, [])

  const loadChecklists = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.kitchenChecklists.list()
      setChecklists(response.data)
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
      const processed = await compressImage(file)
      setForm((current) => ({
        ...current,
        [field]: processed.dataUrl,
      }))
      setFileMeta((current) => ({
        ...current,
        [field]: {
          name: file.name,
          sizeLabel: processed.sizeLabel,
          dimensions: processed.dimensions,
        },
      }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Gagal memproses foto.")
      event.target.value = ""
    } finally {
      setProcessingField(null)
    }
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
      timestamp: form.timestamp,
    }

    if (
      !payload.apdPhoto ||
      !payload.alatPhoto ||
      !payload.kebersihanPhoto ||
      !payload.kondisiDapur ||
      !payload.timestamp
    ) {
      setError("Lengkapi tiga foto, timestamp, dan kondisi dapur.")
      setSubmitting(false)
      return
    }

    try {
      await api.kitchenChecklists.create(payload)
      setForm({
        ...initialForm,
        timestamp: getCurrentDateTimeLocal(),
      })
      setFileMeta(initialFileMeta)
      setFileInputKey((value) => value + 1)
      setSuccessMessage("Checklist kebersihan dapur berhasil disimpan.")
      await loadChecklists()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setSubmitting(false)
    }
  }

  const summary = useMemo(() => {
    const latestItem = checklists[0]
    const latestDate = latestItem ? new Date(latestItem.timestamp) : null
    const latestLabel = latestDate
      ? latestDate.toLocaleString("id-ID")
      : "Belum ada checklist"
    const weekDiff = latestDate
      ? Math.floor((Date.now() - latestDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      : null

    return {
      latestLabel,
      storageHint: "Foto otomatis dikompres sebelum dikirim agar upload lebih stabil.",
      total: checklists.length,
      weeklyStatus:
        weekDiff === null
          ? "Belum ada data minggu ini"
          : weekDiff < 1
            ? "Sudah ada upload minggu ini"
            : "Perlu upload checklist minggu ini",
    }
  }, [checklists])

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

  return (
    <DashboardShell title="Checklist Kebersihan">
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

      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/60">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-4" />
              Checklist mingguan dapur digital
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Upload foto checklist sekarang lebih aman dan ringan
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Foto APD, alat, dan kebersihan akan diperkecil otomatis sebelum
                dikirim. Ini mengurangi risiko upload gagal saat file asli terlalu besar.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: CheckCircle2Icon,
                label: "Total checklist",
                value: summary.total,
              },
              {
                icon: Clock3Icon,
                label: "Upload terakhir",
                value: loading ? "..." : summary.latestLabel,
              },
              {
                icon: UploadIcon,
                label: "Status mingguan",
                value: loading ? "..." : summary.weeklyStatus,
              },
              {
                icon: ImageUpIcon,
                label: "Mode upload",
                value: summary.storageHint,
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div key={item.label} className="rounded-2xl border bg-background/80 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="size-4" />
                    {item.label}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Upload Checklist Mingguan</CardTitle>
            <p className="text-sm text-muted-foreground">
              Foto besar akan dikompres otomatis. File asli sampai 8 MB masih bisa
              dipilih, lalu diperkecil sebelum upload.
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
                              <span className="text-xs font-medium">Ubah Foto</span>
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
                              {isProcessing ? "Memproses..." : "Pilih gambar"}
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
                              {meta?.name ?? "Belum ada file"}
                            </p>
                            <p className="mt-0.5 text-[10px] opacity-80">
                              {meta
                                ? `${meta.sizeLabel} · ${meta.dimensions}`
                                : "Kompresi otomatis aktif"}
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

              <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                <label className="grid gap-2 text-sm font-medium">
                  Timestamp checklist
                  <input
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none input-focus-effect"
                    type="datetime-local"
                    value={form.timestamp}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        timestamp: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground flex items-start gap-2.5">
                  <ShieldCheckIcon className="size-5 text-primary shrink-0 mt-0.5" />
                  <p>
                    <strong>Panduan Pemeriksaan:</strong> Pastikan foto yang diupload menampilkan kondisi nyata di hari pemeriksaan dengan pencahayaan yang cukup. Riwayat laporan akan langsung tersinkronisasi di sebelah kanan setelah disimpan.
                  </p>
                </div>
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
                {submitting ? "Menyimpan checklist..." : "Simpan checklist"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Riwayat Checklist</CardTitle>
            <p className="text-sm text-muted-foreground">
              Dokumentasi checklist kebersihan yang sudah tersimpan.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {loading
              ? Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border p-5 space-y-4">
                    <Skeleton className="h-5 w-40" />
                    <div className="grid gap-3 grid-cols-3">
                      <Skeleton className="aspect-video w-full" />
                      <Skeleton className="aspect-video w-full" />
                      <Skeleton className="aspect-video w-full" />
                    </div>
                  </div>
                ))
              : null}

            {!loading && checklists.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Belum ada checklist kebersihan yang tersimpan.
              </div>
            ) : null}

            {!loading
              ? checklists.map((item) => (
                  <article key={item.id} className="rounded-2xl border bg-card p-5 hover-card-effect space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div>
                        <h3 className="font-semibold text-sm">Checklist Dapur</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.timestamp).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-medium border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2Icon className="size-3.5" />
                        <span>Tersimpan</span>
                      </span>
                    </div>

                    <div className="grid gap-3 grid-cols-3">
                      {[
                        { label: "APD", value: item.apdPhoto },
                        { label: "Alat", value: item.alatPhoto },
                        { label: "Kebersihan", value: item.kebersihanPhoto },
                      ].map((photo) => (
                        <div key={photo.label} className="overflow-hidden rounded-xl border bg-muted/30">
                          <div className="aspect-video w-full overflow-hidden">
                            <img
                              src={photo.value}
                              alt={photo.label}
                              className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="bg-background border-t px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground">
                            {photo.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="rounded-xl bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground border border-border/40">
                      <strong>Kondisi: </strong>{item.kondisiDapur}
                    </p>
                  </article>
                ))
              : null}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  )
}
