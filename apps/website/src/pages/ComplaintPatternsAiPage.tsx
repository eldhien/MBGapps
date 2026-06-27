import { useCallback, useEffect, useState } from "react"
import {
  ActivityIcon,
  AlertTriangleIcon,
  BrainCircuitIcon,
  ClockIcon,
  RefreshCwIcon,
  SchoolIcon,
  SparklesIcon,
  TruckIcon,
  UsersRoundIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  ComplaintAnalysis,
  ComplaintAnalysisPeriod,
  ComplaintDangerCategory,
} from "@/lib/api"
import { api } from "@/lib/api"
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
    return "border-destructive/30 bg-destructive/5 text-destructive"
  }

  if (category === "Sedang") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function ComplaintPatternsAiPage() {
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null)
  const [period, setPeriod] = useState<ComplaintAnalysisPeriod>("7d")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.studentComplaints.analysis(period)
      setAnalysis(response.data)
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
      <div className="space-y-4">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <SparklesIcon className="size-4" />
                AI evaluasi SPPG berbasis engine backend
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Deteksi Pola Keluhan Siswa (AI)
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Menganalisis gejala dengan synonym catalog, negation handling,
                fuzzy matching, confidence score, serta konteks batch, menu, dan
                distribusi.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex rounded-lg border bg-background p-1">
                {periodOptions.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={period === item.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPeriod(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={loadData}
                pending={isLoading}
                disabled={isLoading}
              >
                <RefreshCwIcon className="size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon

            return (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.label}
                    </span>
                    <Icon className="size-4 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-bold">
                    {isLoading ? "..." : item.value}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kesimpulan AI</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hasil dihitung di server agar konsisten dan mudah diaudit.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Memuat analisis keluhan siswa...
                </div>
              ) : null}

              {!isLoading && !patterns.length ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Belum ada data keluhan siswa pada periode ini.
                </div>
              ) : null}

              {!isLoading && topPattern ? (
                <>
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BrainCircuitIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {analysis?.summary.conclusion}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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

                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(topPattern.category)}`}
                      >
                        Kategori {topPattern.category}
                      </span>
                      <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                        Confidence {formatPercent(topPattern.confidence)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Update terakhir {formatDateTime(topPattern.latestDate)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium">
                      Rekomendasi tindak lanjut
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {topPattern.action}
                    </p>
                  </div>

                  {analysis?.summary.evaluationFocus.length ? (
                    <div className="rounded-lg border bg-background p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangleIcon className="size-4 text-primary" />
                        <p className="text-sm font-medium">
                          Yang harus dievaluasi SPPG
                        </p>
                      </div>
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                        {analysis.summary.evaluationFocus.map((focus) => (
                          <li key={focus}>{focus}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pola Terdeteksi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Diurutkan berdasarkan kategori, jumlah siswa, frekuensi, dan
                confidence.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {patterns.map((pattern) => (
                  <div key={pattern.symptom} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">
                            {pattern.symptom}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(pattern.category)}`}
                          >
                            {pattern.category}
                          </span>
                          <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium">
                            {formatPercent(pattern.confidence)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {pattern.totalComplaints.toLocaleString("id-ID")}{" "}
                          keluhan,{" "}
                          {pattern.totalStudents.toLocaleString("id-ID")} siswa
                          terdampak, muncul di{" "}
                          {pattern.schools.length.toLocaleString("id-ID")}{" "}
                          sekolah.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ActivityIcon className="size-4" />
                        {formatDateTime(pattern.latestDate)}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {pattern.schools.slice(0, 4).map((school) => (
                        <span
                          key={school}
                          className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium"
                        >
                          {school}
                        </span>
                      ))}
                      {pattern.schools.length > 4 ? (
                        <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium">
                          +{pattern.schools.length - 4} sekolah
                        </span>
                      ) : null}
                    </div>

                    {pattern.matchedTerms.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pattern.matchedTerms.map((term) => (
                          <span
                            key={term}
                            className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {pattern.riskReasons.length ? (
                      <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Alasan kategori:
                        </span>{" "}
                        {pattern.riskReasons.join(" ")}
                      </div>
                    ) : null}

                    {pattern.batches.length ? (
                      <div className="mt-3 space-y-2 rounded-lg border bg-background p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <TruckIcon className="size-4 text-primary" />
                          Konteks batch/menu/distribusi
                        </div>
                        {pattern.batches.slice(0, 3).map((batch) => (
                          <div
                            key={batch.id}
                            className="text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="font-medium text-foreground">
                              {batch.id}
                            </span>{" "}
                            - {batch.menuName ?? "Menu tidak diketahui"} · status{" "}
                            {batch.status ?? "-"}
                            {batch.driverName ? ` · ${batch.driverName}` : ""}
                            {batch.route ? ` · ${batch.route}` : ""}
                            {batch.distributions[0] ? (
                              <span>
                                {" "}
                                · kirim{" "}
                                {formatDateTime(batch.distributions[0].waktuKirim)}{" "}
                                ({batch.distributions[0].status})
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-lg bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Saran AI:
                      </span>{" "}
                      {pattern.action}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
