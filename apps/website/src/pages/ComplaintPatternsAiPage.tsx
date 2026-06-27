import { useCallback, useEffect, useState } from "react"
import {
  ActivityIcon,
  AlertTriangleIcon,
  BrainCircuitIcon,
  ClockIcon,
  RefreshCwIcon,
  SchoolIcon,
  TruckIcon,
  UsersRoundIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  ComplaintAnalysis,
  ComplaintAnalysisPeriod,
  ComplaintDangerCategory,
} from "@/lib/api"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"

const periodOptions = [
  { label: "24 Jam", value: "24h" },
  { label: "7 Hari", value: "7d" },
  { label: "30 Hari", value: "30d" },
  { label: "Semua", value: "all" },
] satisfies { label: string; value: ComplaintAnalysisPeriod }[]

function formatDateTime(value: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getCategoryClass(category: ComplaintDangerCategory) {
  if (category === "Berat") {
    return "border-red-100 bg-red-50 text-red-600"
  }

  if (category === "Sedang") {
    return "border-amber-100 bg-amber-50 text-amber-700"
  }

  return "border-emerald-100 bg-emerald-50 text-emerald-700"
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function getComplaintAnalysisCacheKey(period: ComplaintAnalysisPeriod) {
  return `${pageCacheKeys.studentComplaintAnalysis}:${period}`
}

export function ComplaintPatternsAiPage() {
  const cachedInitialAnalysis = getCachedPageData<ComplaintAnalysis>(
    getComplaintAnalysisCacheKey("7d")
  )
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(
    cachedInitialAnalysis ?? null
  )
  const [period, setPeriod] = useState<ComplaintAnalysisPeriod>("7d")
  const [isLoading, setIsLoading] = useState(!cachedInitialAnalysis)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (force = false) => {
    const cacheKey = getComplaintAnalysisCacheKey(period)
    const cachedAnalysis = getCachedPageData<ComplaintAnalysis>(cacheKey)

    if (!force && cachedAnalysis) {
      setAnalysis(cachedAnalysis)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.studentComplaints.analysis(period)
      setAnalysis(setCachedPageData(cacheKey, response.data))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat analisis keluhan siswa."
      )
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  const topPattern = analysis?.summary.topPattern ?? null
  const patterns = analysis?.patterns ?? []

  const stats = [
    {
      label: "Keluhan dianalisis",
      value: analysis?.stats.totalComplaints.toLocaleString("id-ID") ?? "0",
      icon: BrainCircuitIcon,
    },
    {
      label: "Siswa terdampak",
      value: analysis?.stats.totalStudents.toLocaleString("id-ID") ?? "0",
      icon: UsersRoundIcon,
    },
    {
      label: "Pola lintas sekolah",
      value: analysis?.stats.crossSchoolPatterns.toLocaleString("id-ID") ?? "0",
      icon: SchoolIcon,
    },
    {
      label: "Kategori berat",
      value: analysis?.stats.severePatterns.toLocaleString("id-ID") ?? "0",
      icon: AlertTriangleIcon,
    },
  ]

  return (
    <DashboardShell title="Deteksi Pola Keluhan Siswa (AI)">
      <div className="space-y-6">
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Deteksi Pola Keluhan Siswa (AI)
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Analisis pola gejala, sekolah terdampak, dan rekomendasi tindak
              lanjut dari data keluhan siswa.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex rounded-xl border border-[#e3e7ef] bg-white p-1">
              {periodOptions.map((item) => {
                const isActive = period === item.value

                return (
                  <Button
                    key={item.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`h-8 cursor-pointer rounded-lg px-3 ${
                      isActive
                        ? "bg-[#0528f2] text-white hover:bg-[#0528f2] hover:text-white"
                        : "text-muted-foreground hover:bg-[#f7f9ff] hover:text-[#0528f2]"
                    }`}
                    onClick={() => setPeriod(item.value)}
                  >
                    {item.label}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              className="h-10 cursor-pointer rounded-xl border-[#e3e7ef] bg-white"
              onClick={() => void loadData(true)}
              pending={isLoading}
              disabled={isLoading}
            >
              <RefreshCwIcon className="size-4" />
              Refresh
            </Button>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon

            return (
              <section
                key={item.label}
                className="rounded-xl border border-[#edf0f4] bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#0528f2]">
                    <Icon className="size-4" />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold">
                  {isLoading ? "..." : item.value}
                </p>
              </section>
            )
          })}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#edf0f4] px-6 py-5">
              <h2 className="text-lg font-semibold">Kesimpulan AI</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ringkasan pola tertinggi dan evaluasi yang perlu dilakukan.
              </p>
            </div>
            <div className="space-y-4 p-6">
              {isLoading ? (
                <div className="rounded-xl border border-[#edf0f4] bg-[#fbfcff] p-4 text-sm text-muted-foreground">
                  Memuat analisis keluhan siswa...
                </div>
              ) : null}

              {!isLoading && !patterns.length ? (
                <div className="rounded-xl border border-dashed border-[#d8deea] p-6 text-center text-sm text-muted-foreground">
                  Belum ada data keluhan siswa pada periode ini.
                </div>
              ) : null}

              {!isLoading && topPattern ? (
                <>
                  <div className="rounded-xl border border-[#edf0f4] bg-[#fbfcff] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#0528f2]">
                        <BrainCircuitIcon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {analysis?.summary.conclusion}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Pola teratas adalah {topPattern.symptom.toLowerCase()}{" "}
                          dengan{" "}
                          {topPattern.totalStudents.toLocaleString("id-ID")} siswa
                          terdampak dari{" "}
                          {topPattern.schools.length.toLocaleString("id-ID")}{" "}
                          sekolah. Confidence{" "}
                          {formatPercent(topPattern.confidence)}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#edf0f4] bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(topPattern.category)}`}
                      >
                        Kategori {topPattern.category}
                      </span>
                      <span className="rounded-full border border-[#edf0f4] bg-[#f8fafc] px-2.5 py-1 text-xs font-semibold">
                        Confidence {formatPercent(topPattern.confidence)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Update terakhir {formatDateTime(topPattern.latestDate)}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold">
                      Rekomendasi tindak lanjut
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {topPattern.action}
                    </p>
                  </div>

                  {analysis?.summary.evaluationFocus.length ? (
                    <div className="rounded-xl border border-[#edf0f4] bg-white p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="size-4 text-[#0528f2]" />
                        <p className="text-sm font-semibold">
                          Yang harus dievaluasi SPPG
                        </p>
                      </div>
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                        {analysis.summary.evaluationFocus.map((focus) => (
                          <li key={focus}>{focus}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-2 border-b border-[#edf0f4] px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pola Terdeteksi</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Diurutkan dari pola dengan risiko dan dampak tertinggi.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[#edf0f4] bg-[#f8fafc] px-3 py-1.5 text-sm font-semibold">
                {patterns.length.toLocaleString("id-ID")} pola
              </span>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.symptom}
                    className="rounded-xl border border-[#edf0f4] bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">
                            {pattern.symptom}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(pattern.category)}`}
                          >
                            {pattern.category}
                          </span>
                          <span className="rounded-full border border-[#edf0f4] bg-[#f8fafc] px-2.5 py-1 text-xs font-semibold">
                            {formatPercent(pattern.confidence)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {pattern.totalComplaints.toLocaleString("id-ID")}{" "}
                          keluhan,{" "}
                          {pattern.totalStudents.toLocaleString("id-ID")} siswa
                          terdampak, muncul di{" "}
                          {pattern.schools.length.toLocaleString("id-ID")}{" "}
                          sekolah.
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <ActivityIcon className="size-4" />
                        {formatDateTime(pattern.latestDate)}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {pattern.schools.slice(0, 4).map((school) => (
                        <span
                          key={school}
                          className="rounded-full border border-[#edf0f4] bg-[#f8fafc] px-2.5 py-1 text-xs font-medium"
                        >
                          {school}
                        </span>
                      ))}
                      {pattern.schools.length > 4 ? (
                        <span className="rounded-full border border-[#edf0f4] bg-[#f8fafc] px-2.5 py-1 text-xs font-medium">
                          +{pattern.schools.length - 4} sekolah
                        </span>
                      ) : null}
                    </div>

                    {pattern.matchedTerms.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pattern.matchedTerms.map((term) => (
                          <span
                            key={term}
                            className="rounded-full border border-[#dce3ff] bg-[#f7f9ff] px-2.5 py-1 text-xs font-semibold text-[#0528f2]"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {pattern.riskReasons.length ? (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                        <span className="font-semibold">Alasan kategori:</span>{" "}
                        {pattern.riskReasons.join(" ")}
                      </div>
                    ) : null}

                    {pattern.batches.length ? (
                      <div className="mt-3 space-y-2 rounded-xl border border-[#edf0f4] bg-[#fbfcff] p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <TruckIcon className="size-4 text-[#0528f2]" />
                          Konteks batch/menu/distribusi
                        </div>
                        {pattern.batches.slice(0, 3).map((batch) => (
                          <div
                            key={batch.id}
                            className="text-sm leading-6 text-muted-foreground"
                          >
                            <span className="font-semibold text-foreground">
                              {batch.id}
                            </span>{" "}
                            - {batch.menuName ?? "Menu tidak diketahui"} -
                            status {batch.status ?? "-"}
                            {batch.driverName ? ` - ${batch.driverName}` : ""}
                            {batch.route ? ` - ${batch.route}` : ""}
                            {batch.distributions[0] ? (
                              <span>
                                {" "}
                                - kirim{" "}
                                {formatDateTime(batch.distributions[0].waktuKirim)}{" "}
                                ({batch.distributions[0].status})
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-xl bg-[#fbfcff] p-3 text-sm leading-6 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Saran AI:
                      </span>{" "}
                      {pattern.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {analysis ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Analisis server dibuat {formatDateTime(analysis.generatedAt)}
          </div>
        ) : null}
      </div>
    </DashboardShell>
  )
}
