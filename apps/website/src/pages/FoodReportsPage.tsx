import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  BatchSummary,
  FoodReport,
  FoodReportCategory,
} from "@/lib/api"
import { api } from "@/lib/api"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  ClockIcon,
  FileWarningIcon,
  HelpCircleIcon,
  PackageXIcon,
  ShieldAlertIcon,
  ThermometerIcon,
  TimerResetIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent } from "react"

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
  deskripsi: "",
  kategori: "BASI" as FoodReportCategory,
}

function formatCategory(category: FoodReportCategory) {
  return categoryOptions.find((item) => item.value === category)?.label ?? category
}

export function FoodReportsPage() {
  const [reports, setReports] = useState<FoodReport[]>([])
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [reportsResponse, batchesResponse] = await Promise.allSettled([
        api.foodReports.list(),
        api.batches.list(),
      ])

      if (reportsResponse.status === "fulfilled") {
        setReports(reportsResponse.value.data)
      } else {
        throw reportsResponse.reason
      }

      if (batchesResponse.status === "fulfilled") {
        setBatches(batchesResponse.value.data)
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

    const payload = {
      kategori: form.kategori,
      deskripsi: form.deskripsi.trim(),
      ...(form.batchId ? { batchId: form.batchId } : {}),
    }

    if (payload.deskripsi.length < 10) {
      setError("Deskripsi minimal 10 karakter agar laporan mudah ditindaklanjuti.")
      setSubmitting(false)
      return
    }

    try {
      await api.foodReports.create(payload)
      setForm(initialForm)
      setSuccessMessage("Laporan masalah makanan berhasil dikirim.")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setSubmitting(false)
    }
  }

  const summary = useMemo(() => {
    const pending = reports.filter((report) => report.status === "PENDING").length
    const reviewed = reports.filter((report) => report.status === "REVIEWED").length
    const resolved = reports.filter((report) => report.status === "RESOLVED").length

    return {
      pending,
      resolved,
      reviewed,
      total: reports.length,
    }
  }, [reports])

  return (
    <DashboardShell title="Laporan Masalah Makanan">
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

      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/60 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] relative z-1">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <FileWarningIcon className="size-4 text-amber-500 animate-pulse" />
              Pelaporan Masalah Makanan Sekolah
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Catat Masalah Makanan secara Terstruktur
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Gunakan formulir di bawah untuk melaporkan makanan basi, kemasan rusak, pengiriman terlambat,
                suhu yang tidak sesuai standar, atau insiden kualitas lainnya.
              </p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2">
            {[
              {
                icon: ClipboardListIcon,
                label: "Total Laporan",
                value: summary.total,
                color: "text-blue-500 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20",
              },
              {
                icon: TimerResetIcon,
                label: "Menunggu",
                value: summary.pending,
                color: "text-slate-500 bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/20",
              },
              {
                icon: ShieldAlertIcon,
                label: "Ditinjau",
                value: summary.reviewed,
                color: "text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20",
              },
              {
                icon: CheckCircle2Icon,
                label: "Selesai",
                value: summary.resolved,
                color: "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div key={item.label} className="rounded-2xl border bg-background/80 p-4 hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className={`p-1 rounded-md ${item.color}`}>
                      <Icon className="size-3.5" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <p className="mt-2.5 text-xl font-bold leading-none">{item.value}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
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

        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Riwayat Laporan</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Klik dropdown untuk melihat daftar laporan terkirim beserta status penyelesaiannya.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="relative pl-6 border-l border-border/80 space-y-6 ml-2 py-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="relative rounded-2xl border p-5 space-y-3">
                    <div className="absolute -left-[31px] top-7 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-border">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted" />
                    </div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
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
              <div className="relative pl-6 border-l border-border/80 space-y-6 ml-2 py-2">
                {reports.map((report) => {
                  const statusConfig = {
                    PENDING: {
                      bg: "bg-slate-500/10 text-slate-800 dark:text-slate-300 border-slate-500/20",
                      dotBg: "bg-slate-500",
                      label: "Menunggu",
                    },
                    REVIEWED: {
                      bg: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
                      dotBg: "bg-amber-500",
                      label: "Ditinjau",
                    },
                    RESOLVED: {
                      bg: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20",
                      dotBg: "bg-emerald-500",
                      label: "Selesai",
                    },
                  }[report.status] ?? {
                    bg: "bg-slate-500/10 text-slate-700 border-slate-500/20",
                    dotBg: "bg-slate-500",
                    label: report.status,
                  }

                  const CatIcon = categoryIcons[report.kategori] || HelpCircleIcon

                  return (
                    <article key={report.id} className="relative bg-card rounded-2xl border p-5 space-y-3">
                      <div className="absolute -left-[31px] top-7 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-border z-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotBg}`} />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`rounded-lg p-1.5 border shrink-0 ${categoryColors[report.kategori]}`}>
                            <CatIcon className="size-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm leading-none text-foreground">{formatCategory(report.kategori)}</h3>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              {new Date(report.createdAt).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusConfig.bg}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {report.deskripsi}
                      </p>

                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground border-t pt-3 mt-1">
                        <span className="rounded-full bg-muted/60 px-2.5 py-1 font-medium border">
                          Batch: {report.batchId ? "Tersambung" : "Belum dipilih"}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  )
}
