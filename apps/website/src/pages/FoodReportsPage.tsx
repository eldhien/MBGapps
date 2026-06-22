import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  BatchSummary,
  DashboardAnalytics,
  FoodReport,
  FoodReportCategory,
} from "@/lib/api"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  AlertTriangleIcon,
  ClockIcon,
  HelpCircleIcon,
  PackageXIcon,
  ThermometerIcon,
} from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

const categoryOptions: { label: string; value: FoodReportCategory }[] = [
  { label: "Basi", value: "BASI" },
  { label: "Rusak", value: "RUSAK" },
  { label: "Terlambat", value: "TERLAMBAT" },
  { label: "Suhu Tidak Sesuai", value: "SUHU_TIDAK_SESUAI" },
  { label: "Lainnya", value: "LAINNYA" },
]

const categoryIcons: Record<FoodReportCategory, React.ComponentType<{ className?: string }>> = {
  BASI: AlertTriangleIcon,
  RUSAK: PackageXIcon,
  TERLAMBAT: ClockIcon,
  SUHU_TIDAK_SESUAI: ThermometerIcon,
  LAINNYA: HelpCircleIcon,
}

const categoryColors: Record<FoodReportCategory, string> = {
  BASI: "text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/20 border-rose-500/20",
  RUSAK: "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20 border-amber-500/20",
  TERLAMBAT: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20 border-blue-500/20",
  SUHU_TIDAK_SESUAI: "text-orange-600 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/20 border-orange-500/20",
  LAINNYA: "text-slate-600 bg-slate-500/10 dark:text-slate-400 dark:bg-slate-500/20 border-slate-500/20",
}

const initialForm = {
  batchId: "",
  kategoriLainnya: "",
  deskripsi: "",
  kategori: "BASI" as FoodReportCategory,
}

function formatCategory(category: FoodReportCategory) {
  return categoryOptions.find((item) => item.value === category)?.label ?? category
}

export function FoodReportsPage({
  mode = "create",
}: {
  mode?: "create" | "history"
}) {
  const cachedReports = getCachedPageData<FoodReport[]>(
    pageCacheKeys.foodReports
  )
  const cachedBatches = getCachedPageData<BatchSummary[]>(pageCacheKeys.batches)
  const [reports, setReports] = useState<FoodReport[]>(cachedReports ?? [])
  const [batches, setBatches] = useState<BatchSummary[]>(cachedBatches ?? [])
  const [loading, setLoading] = useState(!cachedReports)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async (force = false) => {
    if (!force) {
      const reportsCache = getCachedPageData<FoodReport[]>(
        pageCacheKeys.foodReports
      )
      const batchesCache = getCachedPageData<BatchSummary[]>(
        pageCacheKeys.batches
      )

      if (reportsCache) {
        setReports(reportsCache)
        setBatches(batchesCache ?? [])
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const [reportsResponse, batchesResponse] = await Promise.allSettled([
        api.foodReports.list(),
        api.batches.list(),
      ])

      if (reportsResponse.status === "fulfilled") {
        setReports(
          setCachedPageData(
            pageCacheKeys.foodReports,
            reportsResponse.value.data
          )
        )
      } else {
        throw reportsResponse.reason
      }

      if (batchesResponse.status === "fulfilled") {
        setBatches(
          setCachedPageData(pageCacheKeys.batches, batchesResponse.value.data)
        )
      } else {
        setBatches([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    const customCategory = form.kategoriLainnya.trim()
    const description = form.deskripsi.trim()
    const payload = {
      kategori: form.kategori,
      kategoriLainnya: form.kategori === "LAINNYA" ? customCategory : null,
      deskripsi: description,
      ...(form.batchId ? { batchId: form.batchId } : {}),
    }

    if (form.kategori === "LAINNYA" && customCategory.length < 3) {
      setError("Isi kategori lainnya minimal 3 karakter.")
      setSubmitting(false)
      return
    }

    if (description.length < 10) {
      setError("Deskripsi minimal 10 karakter agar laporan mudah ditindaklanjuti.")
      setSubmitting(false)
      return
    }

    try {
      const response = await api.foodReports.create(payload)
      setReports((currentReports) =>
        setCachedPageData(pageCacheKeys.foodReports, [
          response.data,
          ...currentReports,
        ])
      )

      const dashboardCache = getCachedPageData<DashboardAnalytics>(
        pageCacheKeys.dashboardAnalytics
      )

      if (dashboardCache) {
        setCachedPageData(pageCacheKeys.dashboardAnalytics, {
          ...dashboardCache,
          totalFoodReports: dashboardCache.totalFoodReports + 1,
        })
      }

      setForm(initialForm)
      setSuccessMessage("Laporan masalah makanan berhasil dikirim.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setSubmitting(false)
    }
  }

  const isCreatePage = mode === "create"
  const pageTitle = isCreatePage ? "Buat Laporan Masalah" : "Riwayat Laporan"

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
            Laporan masalah
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isCreatePage ? "Buat Laporan Masalah" : "Riwayat Laporan Masalah"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {isCreatePage
              ? "Laporkan masalah makanan dengan kategori, batch terkait, dan deskripsi singkat."
              : "Pantau laporan yang sudah dikirim dan status tindak lanjutnya."}
          </p>
        </div>
      </section>

      <section className="grid gap-6">
        {isCreatePage ? (
        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Buat Laporan Masalah Makanan</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pilih salah satu kategori masalah makanan, pilih batch jika diketahui, dan deskripsikan secara rinci.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <span className="text-sm font-semibold">Kategori Masalah</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryOptions.map((item) => {
                    const isActive = form.kategori === item.value
                    const CatIcon = categoryIcons[item.value]

                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={`rounded-xl border p-4 text-left text-sm transition-all cursor-pointer flex gap-3 items-start ${
                          isActive
                            ? "border-primary bg-primary/5 text-foreground ring-2 ring-primary/10"
                            : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            kategori: item.value,
                            kategoriLainnya:
                              item.value === "LAINNYA"
                                ? current.kategoriLainnya
                                : "",
                          }))
                        }
                      >
                        <div className={`rounded-lg p-2 border shrink-0 ${categoryColors[item.value]}`}>
                          <CatIcon className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-xs">{item.label}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {item.value === "BASI"
                              ? "Berbau asam, berubah rasa, berjamur, atau tidak layak makan."
                              : item.value === "RUSAK"
                                ? "Kemasan sobek, bocor, pecah, atau isi tumpah."
                                : item.value === "TERLAMBAT"
                                  ? "Pengiriman datang melewati batas jam makan siang."
                                  : item.value === "SUHU_TIDAK_SESUAI"
                                    ? "Makanan dingin/tidak hangat saat diterima."
                                    : "Masalah operasional/kualitas lainnya."}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {form.kategori === "LAINNYA" ? (
                <label className="grid gap-2 text-sm font-medium">
                  Kategori Lainnya
                  <input
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Contoh: porsi kurang, rasa terlalu asin, kemasan tertukar"
                    value={form.kategoriLainnya}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        kategoriLainnya: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-medium">
                Batch Terkait
                <select
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.batchId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      batchId: event.target.value,
                    }))
                  }
                >
                  <option value="">Pilih nanti / tidak diketahui</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchIdUnik} · {batch.namaMenu}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Deskripsi Kejadian
                <textarea
                  className="min-h-32 rounded-xl border border-input bg-background px-3 py-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Contoh: Nasi berbau asam, lauk nugget terasa dingin saat dikonsumsi, terdapat sekitar 15 porsi terdampak di kelas 4A."
                  value={form.deskripsi}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      deskripsi: event.target.value,
                    }))
                  }
                />
              </label>

              <Button disabled={submitting} type="submit" className="w-full h-11 rounded-xl shadow-xs hover:shadow-md transition-all">
                {submitting ? "Mengirim Laporan..." : "Kirim Laporan Masalah"}
              </Button>
            </form>
          </CardContent>
        </Card>
        ) : null}

        {!isCreatePage ? (
        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Riwayat Laporan</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Daftar laporan yang sudah dikirim beserta status tindak lanjutnya.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="overflow-hidden rounded-xl border">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[0.9fr_0.9fr_1.6fr_0.7fr_0.8fr]"
                  >
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Belum ada laporan masalah makanan yang terkirim.
              </div>
            ) : null}

            {!loading && reports.length > 0 ? (
              <div className="overflow-hidden rounded-xl border">
                <div className="hidden grid-cols-[0.9fr_0.9fr_1.6fr_0.7fr_0.8fr] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground md:grid">
                  <span>Tanggal</span>
                  <span>Kategori</span>
                  <span>Deskripsi</span>
                  <span>Batch</span>
                  <span>Status</span>
                </div>
                {reports.map((report) => {
                  const statusConfig = {
                    PENDING: {
                      bg: "bg-slate-500/10 text-slate-800 dark:text-slate-300 border-slate-500/20",
                      label: "Menunggu",
                    },
                    REVIEWED: {
                      bg: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
                      label: "Ditinjau",
                    },
                    RESOLVED: {
                      bg: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20",
                      label: "Selesai",
                    },
                  }[report.status] ?? {
                    bg: "bg-slate-500/10 text-slate-700 border-slate-500/20",
                    label: report.status,
                  }

                  const CatIcon = categoryIcons[report.kategori] || HelpCircleIcon

                  return (
                    <div
                      key={report.id}
                      className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[0.9fr_0.9fr_1.6fr_0.7fr_0.8fr] md:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(report.createdAt).toLocaleDateString("id-ID")}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleTimeString("id-ID")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`rounded-md border p-1.5 ${categoryColors[report.kategori]}`}>
                          <CatIcon className="size-4" />
                        </div>
                        <span className="text-sm font-medium">
                          {report.kategori === "LAINNYA" && report.kategoriLainnya
                            ? report.kategoriLainnya
                            : formatCategory(report.kategori)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {report.deskripsi}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {report.batchId ? "Ada" : "-"}
                      </span>
                      <div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusConfig.bg}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
        ) : null}
      </section>
    </DashboardShell>
  )
}
