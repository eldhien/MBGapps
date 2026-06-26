import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, type DashboardAnalytics } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  AlertTriangleIcon,
  ClipboardCheckIcon,
  FileWarningIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  TruckIcon,
  UsersIcon,
} from "lucide-react"

const emptyAnalytics: DashboardAnalytics = {
  totalBatches: 0,
  totalDistributions: 0,
  pendingDistributions: 0,
  deliveredDistributions: 0,
  totalFoodReports: 0,
  totalStudentComplaints: 0,
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
}

function formatPercentage(value: number) {
  return `${Math.round(clampPercentage(value))}%`
}

export function DashboardPage() {
  const cachedAnalytics = getCachedPageData<DashboardAnalytics>(
    pageCacheKeys.dashboardAnalytics
  )
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(
    cachedAnalytics ?? null
  )
  const [loading, setLoading] = useState(!cachedAnalytics)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const response = await api.dashboard.analytics()
        if (!isMounted) return
        setAnalytics(setCachedPageData(pageCacheKeys.dashboardAnalytics, response.data))
        setError(null)
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  const data = analytics ?? emptyAnalytics

  const summary = useMemo(() => {
    const totalMonitoringItems =
      data.totalFoodReports + data.totalStudentComplaints
    const distributionRate =
      data.totalDistributions > 0
        ? (data.deliveredDistributions / data.totalDistributions) * 100
        : 0
    const pendingRate =
      data.totalDistributions > 0
        ? (data.pendingDistributions / data.totalDistributions) * 100
        : 0
    const securityScore = clampPercentage(
      100 -
        data.totalFoodReports * 9 -
        data.totalStudentComplaints * 12 -
        pendingRate * 0.35
    )
    const riskScore = clampPercentage(
      data.totalFoodReports * 12 +
        data.totalStudentComplaints * 18 +
        pendingRate * 0.65
    )

    const riskLabel =
      riskScore >= 70 ? "Tinggi" : riskScore >= 40 ? "Sedang" : "Rendah"
    const riskDescription =
      riskScore >= 70
        ? "Perlu intervensi cepat pada distribusi dan pelaporan sekolah."
        : riskScore >= 40
          ? "Pantau distribusi pending dan tindak lanjuti laporan sekolah."
          : "Operasional relatif stabil dan aman dipantau harian."

    const securityLabel =
      securityScore >= 85
        ? "Aman"
        : securityScore >= 65
          ? "Waspada"
          : "Perlu Tindakan"
    const securityDescription =
      securityScore >= 85
        ? "Belum terlihat eskalasi risiko yang signifikan."
        : securityScore >= 65
          ? "Ada indikator yang perlu dipantau lebih ketat."
          : "Butuh evaluasi operasional dan tindak lanjut lapangan."

    return {
      totalMonitoringItems,
      distributionRate,
      pendingRate,
      securityScore,
      securityLabel,
      securityDescription,
      riskScore,
      riskLabel,
      riskDescription,
      foodReportRatio:
        totalMonitoringItems > 0
          ? (data.totalFoodReports / totalMonitoringItems) * 100
          : 0,
      complaintRatio:
        totalMonitoringItems > 0
          ? (data.totalStudentComplaints / totalMonitoringItems) * 100
          : 0,
    }
  }, [data])

  const statCards = [
    {
      title: "Jumlah Batch",
      value: data.totalBatches,
      description: "Batch makanan yang sudah tercatat di sistem.",
      icon: LayoutDashboardIcon,
      color:
        "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20 border-blue-500/20",
    },
    {
      title: "Distribusi Aktif",
      value: data.totalDistributions,
      description: "Seluruh pengiriman yang sedang dipantau.",
      icon: TruckIcon,
      color:
        "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-500/20 border-indigo-500/20",
    },
    {
      title: "Laporan Sekolah",
      value: data.totalFoodReports,
      description: "Masalah makanan yang masuk dari sekolah.",
      icon: FileWarningIcon,
      color:
        "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20 border-amber-500/20",
    },
    {
      title: "Keluhan Siswa",
      value: data.totalStudentComplaints,
      description: "Keluhan pascakonsumsi yang perlu ditindaklanjuti.",
      icon: UsersIcon,
      color:
        "text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/20 border-rose-500/20",
    },
  ]

  const securityColorClass = useMemo(() => {
    if (summary.securityScore >= 85) return "from-emerald-500 to-teal-500"
    if (summary.securityScore >= 65) return "from-amber-500 to-orange-500"
    return "from-rose-500 to-red-500"
  }, [summary.securityScore])

  return (
    <DashboardShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.title} className="border-border/70 bg-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="pr-2 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div
                  className={`shrink-0 rounded-xl border p-2.5 ${item.color}`}
                >
                  <Icon className="size-4.5" />
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                <p className="text-3xl font-bold tracking-tight">
                  {loading ? "..." : item.value.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  Status Keamanan & Distribusi
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gambaran kesehatan operasional dari sisi keamanan pangan dan
                  pengiriman.
                </p>
              </div>
              <div className="rounded-full bg-muted p-2 text-muted-foreground">
                <ShieldCheckIcon className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">Indeks Keamanan</span>
                <span className="font-semibold">
                  {loading ? "..." : summary.securityLabel}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${securityColorClass} transition-all duration-500`}
                  style={{
                    width: loading
                      ? "18%"
                      : formatPercentage(summary.securityScore),
                  }}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {loading
                  ? "Menghitung indikator keamanan..."
                  : summary.securityDescription}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TruckIcon className="size-4 text-indigo-500" />
                  Distribusi Diterima
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {loading ? "..." : formatPercentage(summary.distributionRate)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {loading
                    ? "Memuat status distribusi..."
                    : `${data.deliveredDistributions} dari ${data.totalDistributions} distribusi sudah selesai.`}
                </p>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangleIcon className="size-4 text-rose-500" />
                  Distribusi Pending
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {loading
                    ? "..."
                    : data.pendingDistributions.toLocaleString("id-ID")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {loading
                    ? "Memuat antrian distribusi..."
                    : `${formatPercentage(summary.pendingRate)} pengiriman masih menunggu tindak lanjut.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Tren Risiko</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dibentuk dari laporan makanan, keluhan siswa, dan pengiriman
                  pending.
                </p>
              </div>
              <div className="rounded-full bg-muted p-2 text-muted-foreground">
                <TrendingUpIcon className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Skor Risiko Operasional</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {loading ? "..." : formatPercentage(summary.riskScore)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {loading
                  ? "Menghitung tren risiko..."
                  : summary.riskDescription}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>Kontribusi Laporan Makanan</span>
                  <span>
                    {loading
                      ? "..."
                      : formatPercentage(summary.foodReportRatio)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    style={{
                      width: loading
                        ? "8%"
                        : formatPercentage(summary.foodReportRatio),
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>Kontribusi Keluhan Siswa</span>
                  <span>
                    {loading ? "..." : formatPercentage(summary.complaintRatio)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                    style={{
                      width: loading
                        ? "8%"
                        : formatPercentage(summary.complaintRatio),
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>Tekanan Distribusi Pending</span>
                  <span>
                    {loading ? "..." : formatPercentage(summary.pendingRate)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                    style={{
                      width: loading
                        ? "8%"
                        : formatPercentage(summary.pendingRate),
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="border-border/70">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Laporan & Keluhan</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pantau sinyal masalah dari sekolah dan siswa dalam satu blok.
                </p>
              </div>
              <div className="rounded-full bg-muted p-2 text-muted-foreground">
                <ClipboardCheckIcon className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Laporan Makanan</span>
                <span className="text-lg font-bold text-foreground">
                  {loading
                    ? "..."
                    : data.totalFoodReports.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Pengaduan terkait kualitas, suhu, atau keterlambatan makanan.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Keluhan Siswa</span>
                <span className="text-lg font-bold text-foreground">
                  {loading
                    ? "..."
                    : data.totalStudentComplaints.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Laporan gejala atau dampak setelah konsumsi yang perlu
                ditindaklanjuti.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">
                  Total Item Monitoring
                </span>
                <span className="text-lg font-bold text-primary">
                  {loading
                    ? "..."
                    : summary.totalMonitoringItems.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Gabungan seluruh laporan sekolah yang menjadi bahan evaluasi
                harian.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive" aria-live="polite">
              {error}
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  )
}
