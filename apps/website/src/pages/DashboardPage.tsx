import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/features/auth/AuthProvider"
import { formatRole } from "@/features/auth/types"
import { getVisibleNavigation } from "@/features/navigation/navigation"
import { api, type DashboardAnalytics } from "@/lib/api"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
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
  const { profile } = useAuth()
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.dashboard.analytics()
        setAnalytics(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const data = analytics ?? emptyAnalytics
  const visibleNavigation = getVisibleNavigation(profile?.role)
  const quickLinks = visibleNavigation.filter((page) => page.path !== "/dashboard").slice(0, 4)

  const summary = useMemo(() => {
    const totalMonitoringItems = data.totalFoodReports + data.totalStudentComplaints
    const distributionRate =
      data.totalDistributions > 0
        ? (data.deliveredDistributions / data.totalDistributions) * 100
        : 0
    const pendingRate =
      data.totalDistributions > 0
        ? (data.pendingDistributions / data.totalDistributions) * 100
        : 0
    const securityScore = clampPercentage(
      100 - data.totalFoodReports * 9 - data.totalStudentComplaints * 12 - pendingRate * 0.35
    )
    const riskScore = clampPercentage(
      data.totalFoodReports * 12 + data.totalStudentComplaints * 18 + pendingRate * 0.65
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
      securityScore >= 85 ? "Aman" : securityScore >= 65 ? "Waspada" : "Perlu Tindakan"
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
        totalMonitoringItems > 0 ? (data.totalFoodReports / totalMonitoringItems) * 100 : 0,
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
      color: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20 border-blue-500/20",
    },
    {
      title: "Distribusi Aktif",
      value: data.totalDistributions,
      description: "Seluruh pengiriman yang sedang dipantau.",
      icon: TruckIcon,
      color: "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-500/20 border-indigo-500/20",
    },
    {
      title: "Laporan Sekolah",
      value: data.totalFoodReports,
      description: "Masalah makanan yang masuk dari sekolah.",
      icon: FileWarningIcon,
      color: "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20 border-amber-500/20",
    },
    {
      title: "Keluhan Siswa",
      value: data.totalStudentComplaints,
      description: "Keluhan pascakonsumsi yang perlu ditindaklanjuti.",
      icon: UsersIcon,
      color: "text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/20 border-rose-500/20",
    },
  ]

  const focusItems = [
    {
      title: "Status keamanan",
      description: `${summary.securityLabel} dengan skor ${formatPercentage(summary.securityScore)}.`,
    },
    {
      title: "Distribusi",
      description: `${formatPercentage(summary.distributionRate)} pengiriman sudah diterima dan ${data.pendingDistributions} masih pending.`,
    },
    {
      title: "Laporan sekolah",
      description: `${data.totalFoodReports} laporan makanan dan ${data.totalStudentComplaints} keluhan siswa sedang menjadi sinyal pemantauan.`,
    },
    {
      title: "Tren risiko",
      description: `${summary.riskLabel} dengan fokus utama pada percepatan tindak lanjut lapangan.`,
    },
  ]

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const securityColorClass = useMemo(() => {
    if (summary.securityScore >= 85) return "from-emerald-500 to-teal-500"
    if (summary.securityScore >= 65) return "from-amber-500 to-orange-500"
    return "from-rose-500 to-red-500"
  }, [summary.securityScore])

  return (
    <DashboardShell title="Dashboard">
      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/60 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <CardContent className="p-0">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] relative z-1">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border bg-background px-3 py-1 font-medium">
                  {formatRole(profile?.role)}
                </span>
                <span className="rounded-full border bg-background px-3 py-1 font-medium">
                  {todayLabel}
                </span>
                <span className="rounded-full border bg-background px-3 py-1 font-medium text-emerald-600 dark:text-emerald-400">
                  Update real-time
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Dashboard Analitik Operasional MBG
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Satu tampilan ringkas untuk memantau jumlah batch, status keamanan,
                  distribusi, laporan sekolah, dan tren risiko pada seluruh alur MBG.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-background/80 p-4 hover:shadow-xs transition-shadow">
                  <p className="text-xs text-muted-foreground font-medium">Skor Keamanan</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {loading ? "..." : formatPercentage(summary.securityScore)}
                  </p>
                </div>
                <div className="rounded-xl border bg-background/80 p-4 hover:shadow-xs transition-shadow">
                  <p className="text-xs text-muted-foreground font-medium">Distribusi Sukses</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {loading ? "..." : formatPercentage(summary.distributionRate)}
                  </p>
                </div>
                <div className="rounded-xl border bg-background/80 p-4 hover:shadow-xs transition-shadow">
                  <p className="text-xs text-muted-foreground font-medium">Tren Risiko</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {loading ? "..." : summary.riskLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/85 p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Fokus Hari Ini</p>
                  <p className="text-xs text-muted-foreground">
                    Ringkasan cepat untuk monitoring operasional.
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <TrendingUpIcon className="size-5" />
                </div>
              </div>
              <div className="mt-5 space-y-3.5">
                {focusItems.map((item) => (
                  <div key={item.title} className="rounded-xl border bg-muted/40 p-3.5 hover:bg-muted/70 transition-colors">
                    <p className="text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {loading ? "Memuat insight..." : item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.title} className="border-border/70 hover-card-effect bg-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground pr-2">
                    {item.description}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 border shrink-0 ${item.color}`}>
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
                <CardTitle className="text-lg">Status Keamanan & Distribusi</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gambaran kesehatan operasional dari sisi keamanan pangan dan pengiriman.
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
                <span className="font-semibold">{loading ? "..." : summary.securityLabel}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${securityColorClass} transition-all duration-500`}
                  style={{ width: loading ? "18%" : formatPercentage(summary.securityScore) }}
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {loading ? "Menghitung indikator keamanan..." : summary.securityDescription}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
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

              <div className="rounded-xl border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangleIcon className="size-4 text-rose-500" />
                  Distribusi Pending
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {loading ? "..." : data.pendingDistributions.toLocaleString("id-ID")}
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
                  Dibentuk dari laporan makanan, keluhan siswa, dan pengiriman pending.
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
                {loading ? "Menghitung tren risiko..." : summary.riskDescription}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>Kontribusi Laporan Makanan</span>
                  <span>{loading ? "..." : formatPercentage(summary.foodReportRatio)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    style={{ width: loading ? "8%" : formatPercentage(summary.foodReportRatio) }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>Kontribusi Keluhan Siswa</span>
                  <span>{loading ? "..." : formatPercentage(summary.complaintRatio)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                    style={{ width: loading ? "8%" : formatPercentage(summary.complaintRatio) }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>Tekanan Distribusi Pending</span>
                  <span>{loading ? "..." : formatPercentage(summary.pendingRate)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                    style={{ width: loading ? "8%" : formatPercentage(summary.pendingRate) }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
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
            <div className="rounded-xl border bg-card p-4 hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Laporan Makanan</span>
                <span className="text-lg font-bold text-foreground">
                  {loading ? "..." : data.totalFoodReports.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Pengaduan terkait kualitas, suhu, atau keterlambatan makanan.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Keluhan Siswa</span>
                <span className="text-lg font-bold text-foreground">
                  {loading ? "..." : data.totalStudentComplaints.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Laporan gejala atau dampak setelah konsumsi yang perlu ditindaklanjuti.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Total Item Monitoring</span>
                <span className="text-lg font-bold text-primary">
                  {loading
                    ? "..."
                    : summary.totalMonitoringItems.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Gabungan seluruh laporan sekolah yang menjadi bahan evaluasi harian.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Akses Cepat Fitur Utama</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Masuk ke fitur utama yang relevan untuk peran Anda.
                </p>
              </div>
              <div className="rounded-full bg-muted p-2 text-muted-foreground">
                <ArrowRightIcon className="size-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickLinks.length > 0 ? (
              quickLinks.map((page) => (
                <div
                  key={page.path}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between hover-card-effect"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{page.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {page.features[0]}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shadow-xs cursor-pointer">
                    <Link to={page.path}>Buka fitur</Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm font-medium">Belum ada fitur tambahan</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dashboard tetap menampilkan kondisi inti operasional untuk role ini.
                </p>
              </div>
            )}
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
