import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/features/auth/AuthProvider"
import { api, type DashboardAnalytics } from "@/services/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/components/layout/DashboardShell"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  Clock3Icon,
  FileWarningIcon,
  PackageCheckIcon,
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
  dailyActivity: [],
  distributionActivity: [],
  latestMonitoring: [],
}

function getLastSevenDaysLabel() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 6)

  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  })

  return `${formatter.format(start)} - ${formatter.format(now)}`
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
}

function formatPercentage(value: number) {
  return `${Math.round(clampPercentage(value))}%`
}

function getEmptyWeeklyActivity() {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 6 + index)

    return {
      label: String(date.getDate()),
      value: 0,
    }
  })
}

export function DashboardPage() {
  const { profile } = useAuth()
  const dashboardCacheKey = profile
    ? `${pageCacheKeys.dashboardAnalytics}:${profile.role}:${profile.id}`
    : `${pageCacheKeys.dashboardAnalytics}:guest`
  const cachedAnalytics = getCachedPageData<DashboardAnalytics>(
    dashboardCacheKey
  )
  const [analyticsState, setAnalyticsState] = useState<{
    data: DashboardAnalytics | null
    key: string
  }>(() => ({
    data: cachedAnalytics ?? null,
    key: dashboardCacheKey,
  }))
  const [loadingState, setLoadingState] = useState<{
    key: string
    value: boolean
  }>(() => ({
    key: dashboardCacheKey,
    value: !cachedAnalytics,
  }))
  const [error, setError] = useState<string | null>(null)
  const periodLabel = getLastSevenDaysLabel()
  const analytics =
    analyticsState.key === dashboardCacheKey
      ? analyticsState.data
      : cachedAnalytics ?? null
  const loading =
    loadingState.key === dashboardCacheKey
      ? loadingState.value
      : !cachedAnalytics

  useEffect(() => {
    let isMounted = true
    const cached = getCachedPageData<DashboardAnalytics>(dashboardCacheKey)

    const load = async (showLoading = false) => {
      if (showLoading) {
        setLoadingState({ key: dashboardCacheKey, value: true })
      }

      try {
        const response = await api.dashboard.analytics()
        if (!isMounted) return
        setAnalyticsState({
          data: setCachedPageData(dashboardCacheKey, response.data),
          key: dashboardCacheKey,
        })
        setError(null)
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
        }
      } finally {
        if (isMounted) {
          setLoadingState({ key: dashboardCacheKey, value: false })
        }
      }
    }

    void load(!cached)
    const realtimeIntervalId = window.setInterval(() => {
      void load(false)
    }, 15_000)

    return () => {
      isMounted = false
      window.clearInterval(realtimeIntervalId)
    }
  }, [dashboardCacheKey])

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

  const summaryCards = [
    {
      title: "Jumlah Batch",
      value: data.totalBatches,
      note: "7 hari terakhir",
      icon: PackageCheckIcon,
    },
    {
      title: "Distribusi Aktif",
      value: data.totalDistributions,
      note: "7 hari terakhir",
      icon: TruckIcon,
    },
    {
      title: "Laporan Sekolah",
      value: data.totalFoodReports,
      note: "7 hari terakhir",
      icon: FileWarningIcon,
    },
    {
      title: "Keluhan Siswa",
      value: data.totalStudentComplaints,
      note: "7 hari terakhir",
      icon: UsersIcon,
    },
  ]

  const chartBars = useMemo(() => {
    const activity = data.dailyActivity?.length
      ? data.dailyActivity
      : getEmptyWeeklyActivity()
    const maxValue = Math.max(...activity.map((item) => item.value), 1)

    return activity.map((item) => ({
      ...item,
      height: clampPercentage((item.value / maxValue) * 100),
    }))
  }, [data.dailyActivity])

  const monitoringRows =
    data.latestMonitoring && data.latestMonitoring.length > 0
      ? data.latestMonitoring
      : [
          {
            id: "MBG-MONITOR",
            category: "Monitoring",
            origin: "Sistem",
            destination: "Belum ada data baru",
            total: 0,
            status: "Kosong",
            tone: "warning" as const,
            updatedAt: new Date().toISOString(),
          },
        ]

  const distributionBars = useMemo(() => {
    const activity = data.distributionActivity?.length
      ? data.distributionActivity
      : getEmptyWeeklyActivity()
    const maxValue = Math.max(...activity.map((item) => item.value), 1)

    return activity.map((item) => ({
      ...item,
      height: clampPercentage((item.value / maxValue) * 100),
    }))
  }, [data.distributionActivity])
  const dayCards = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("id-ID", { weekday: "short" })
    const today = new Date()

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - 6 + index)

      return {
        day: formatter.format(date),
        date: String(date.getDate()).padStart(2, "0"),
        active: index < Math.round(summary.securityScore / 18),
      }
    })
  }, [summary.securityScore])

  return (
    <DashboardShell title="Dashboard" variant="dashboard">
      <div className="flex items-center gap-2 rounded-xl border border-[#e9edf4] bg-white px-4 py-3 text-sm shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <AlertTriangleIcon className="size-4 text-amber-500" />
        <span className="text-muted-foreground">
          Kamu punya{" "}
          <strong className="font-semibold text-foreground">
            {loading
              ? "..."
              : data.pendingDistributions.toLocaleString("id-ID")}
          </strong>{" "}
          distribusi menunggu yang perlu dicek hari ini.
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_0.75fr]">
        <Card className="overflow-hidden rounded-xl border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
          <CardHeader className="p-5 pb-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#0528f2]">
                  <TrendingUpIcon className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Analitik Pengiriman
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Ringkasan batch, distribusi, dan laporan masuk 7 hari terakhir.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#eef1f6] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {item.title}
                      </p>
                      <Icon className="size-4 text-[#0528f2]" />
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <p className="text-xl font-semibold">
                        {loading ? "..." : item.value.toLocaleString("id-ID")}
                      </p>
                      <span className="pb-0.5 text-[11px] font-medium text-muted-foreground">
                        {item.note}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="relative h-64 rounded-xl border border-[#eef1f6] bg-white px-4 pt-7 shadow-inner">
              <div className="absolute inset-x-4 top-10 border-t border-dashed border-[#d9dee8]" />
              <div className="absolute top-5 left-5 rounded-md bg-[#20242c] px-2 py-1 text-[10px] font-semibold text-white">
                7 hari terakhir
              </div>
              <div className="flex h-full items-end gap-1.5">
                {chartBars.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className={
                        item.value > 0
                          ? "w-full max-w-8 rounded-full bg-[#0528f2] shadow-[0_12px_26px_rgba(5,40,242,0.25)]"
                          : "w-full max-w-8 rounded-full bg-[#eef0f4]"
                      }
                      style={{ height: `${Math.max(18, item.height * 1.65)}px` }}
                      title={`${item.value} aktivitas pada tanggal ${item.label}`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#0528f2]">
                  <ShieldCheckIcon className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Skor Keamanan</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Tingkat keamanan operasional
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 pt-2">
            <div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-semibold tracking-tight">
                  {loading ? "..." : formatPercentage(summary.securityScore)}
                </p>
                <span className="pb-1 text-xs font-medium text-muted-foreground">
                  {periodLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {loading ? "Memuat status..." : summary.securityLabel}
              </p>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {dayCards.map((item) => (
                <div
                  key={`${item.day}-${item.date}`}
                  className={
                    item.active
                      ? "rounded-full bg-[#0528f2] px-1 py-2 text-center text-white"
                      : "rounded-full border border-[#edf0f4] bg-white px-1 py-2 text-center text-muted-foreground"
                  }
                >
                  <p className="text-[9px]">{item.day}</p>
                  <p className="text-xs font-semibold">{item.date}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-[#eef1f6] bg-white p-3 text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#0528f2]" />
                  Distribusi selesai
                </span>
                <span className="font-semibold text-emerald-500">
                  {loading ? "..." : data.deliveredDistributions}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#eef1f6] bg-white p-3 text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#5b78ff]" />
                  Dalam proses
                </span>
                <span className="font-semibold text-amber-500">
                  {loading ? "..." : data.pendingDistributions}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#eef1f6] bg-white p-3 text-xs">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#96a7ff]" />
                  Menunggu evaluasi
                </span>
                <span className="font-semibold text-rose-500">
                  {loading ? "..." : summary.totalMonitoringItems}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.55fr]">
        <Card className="overflow-hidden rounded-xl border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#0528f2]">
                <ClipboardCheckIcon className="size-4" />
              </div>
              <CardTitle className="text-base">Ringkasan Monitoring</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="table-scroll-area">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-y border-[#edf0f4] bg-white text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Kategori</th>
                    <th className="px-5 py-3 font-medium">Asal</th>
                    <th className="px-5 py-3 font-medium">Tujuan</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringRows.map((row) => (
                    <tr key={row.id} className="border-b border-[#edf0f4]">
                      <td className="px-5 py-4 font-semibold text-[#111827]">
                        {row.category}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {row.origin}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {row.destination}
                      </td>
                      <td className="px-5 py-4 font-medium">
                        {loading ? "..." : row.total.toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            row.tone === "danger"
                              ? "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600"
                              : row.tone === "warning"
                                ? "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600"
                                : "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600"
                          }
                        >
                          <CheckCircle2Icon className="size-3.5" />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5 pb-3">
            <div>
              <CardTitle className="text-base">Total Distribusi</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Distribusi 7 hari terakhir
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-semibold">
                {loading
                  ? "..."
                  : data.totalDistributions.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="flex h-44 items-end gap-4">
              {distributionBars.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-36 w-full max-w-10 items-end rounded-full bg-[#eef0f4]">
                    <div
                      className={
                        item.value > 0
                          ? "w-full rounded-full bg-[#0528f2]"
                          : "w-full rounded-full bg-[#dfe3ec]"
                      }
                      style={{ height: `${Math.max(18, item.height)}%` }}
                      title={`${item.value} distribusi pada tanggal ${item.label}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-[#eef1f6] bg-white p-3 text-xs leading-relaxed text-muted-foreground">
              <Clock3Icon className="mr-1 inline size-3.5 text-[#0528f2]" />
              Distribusi meningkat{" "}
              <span className="font-semibold text-[#0528f2]">
                {loading ? "..." : formatPercentage(summary.distributionRate)}
              </span>{" "}
              dari seluruh pengiriman aktif.
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
