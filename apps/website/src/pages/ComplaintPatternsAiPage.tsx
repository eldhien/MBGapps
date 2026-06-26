import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIcon,
  AlertTriangleIcon,
  BrainCircuitIcon,
  ClockIcon,
  RefreshCwIcon,
  SchoolIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SchoolAccount, StudentComplaint } from "@/lib/api"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"

type DangerCategory = "Ringan" | "Sedang" | "Berat"

type ComplaintPattern = {
  action: string
  category: DangerCategory
  complaints: StudentComplaint[]
  latestDate: Date | null
  schools: string[]
  symptom: string
  totalComplaints: number
  totalStudents: number
}

const symptomCatalog = [
  {
    category: "Ringan",
    label: "Ruam merah",
    keywords: ["ruam merah", "kemerahan"],
  },
  {
    category: "Ringan",
    label: "Alergi ringan",
    keywords: [
      "gatal",
      "kesemutan di bibir",
      "kesemutan di lidah",
      "bersin",
      "sedikit bentol",
      "bentol merah di satu area",
    ],
  },
  {
    category: "Sedang",
    label: "Diare",
    keywords: ["diare", "mencret", "bab cair", "buang air"],
  },
  {
    category: "Sedang",
    label: "Tipes",
    keywords: ["tipes", "typhus", "tifus", "demam tifoid"],
  },
  {
    category: "Sedang",
    label: "Alergi sedang",
    keywords: [
      "kram perut",
      "mual",
      "muntah",
      "bibir bengkak",
      "kelopak mata bengkak",
      "bentol merah menyebar",
      "bentol merah menyebar luas",
      "biduran menyebar",
    ],
  },
  {
    category: "Berat",
    label: "Pingsan",
    keywords: ["pingsan", "hampir pingsan"],
  },
  {
    category: "Berat",
    label: "Sesak napas",
    keywords: ["sesak napas", "sulit bernapas", "nafas sesak"],
  },
  {
    category: "Berat",
    label: "Kejang-kejang",
    keywords: ["kejang", "kejang-kejang"],
  },
  {
    category: "Berat",
    label: "Alergi berat",
    keywords: [
      "tenggorokan terasa tercekik",
      "sulit menelan",
      "lemas drastis",
      "pusing hampir pingsan",
      "kulit pucat",
      "bibir membiru",
      "bengkak parah",
      "biduran menyebar luas",
    ],
  },
] satisfies {
  category: DangerCategory
  label: string
  keywords: string[]
}[]

const categoryRank: Record<DangerCategory, number> = {
  Ringan: 1,
  Sedang: 2,
  Berat: 3,
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "-"

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
}

function detectSymptoms(gejala: string) {
  const normalized = normalizeText(gejala)
  const matches = symptomCatalog
    .filter((item) =>
      item.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))
    )
    .map((item) => ({
      category: item.category,
      label: item.label,
    }))

  return matches.length
    ? matches
    : [{ category: "Ringan" as const, label: "Gejala lain" }]
}

function getComplaintDate(complaint: StudentComplaint) {
  const date = new Date(complaint.waktuKejadian ?? complaint.createdAt)
  return Number.isNaN(date.getTime()) ? null : date
}

function getCategory(
  detectedCategory: DangerCategory,
  totalStudents: number,
  totalComplaints: number,
  totalSchools: number
): DangerCategory {
  if (detectedCategory === "Berat") return "Berat"
  if (detectedCategory === "Sedang") return "Sedang"

  if (totalStudents >= 12 || totalComplaints >= 5 || totalSchools >= 3) {
    return "Berat"
  }

  if (totalStudents >= 5 || totalComplaints >= 3 || totalSchools >= 2) {
    return "Sedang"
  }

  return "Ringan"
}

function getCategoryClass(category: DangerCategory) {
  if (category === "Berat") {
    return "border-destructive/30 bg-destructive/5 text-destructive"
  }

  if (category === "Sedang") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
}

function getAction(category: DangerCategory, schoolsCount: number) {
  if (category === "Berat") {
    return schoolsCount > 1
      ? "Prioritaskan audit batch, cek sampel menu, dan koordinasikan tindak lanjut medis lintas sekolah."
      : "Prioritaskan audit batch, cek sampel menu, dan koordinasikan tindak lanjut medis dengan sekolah terkait."
  }

  if (category === "Sedang" || schoolsCount > 1) {
    return "Bandingkan menu dan waktu distribusi pada sekolah terkait sebelum produksi berikutnya."
  }

  return "Pantau keluhan lanjutan dan pastikan tindakan awal sekolah sudah terdokumentasi."
}

function getCategoryEvaluationDescription(category: DangerCategory) {
  if (category === "Berat") {
    return "Kategori berat membutuhkan evaluasi segera pada keamanan batch, kondisi distribusi, dan koordinasi medis karena berpotensi berdampak serius."
  }

  if (category === "Sedang") {
    return "Kategori sedang perlu evaluasi pada kebersihan produksi, suhu makanan, waktu simpan, dan pola distribusi agar keluhan tidak meluas."
  }

  return "Kategori ringan difokuskan untuk pemantauan ulang, validasi bahan pemicu, dan dokumentasi agar tidak berkembang menjadi pola berulang."
}

function getEvaluationFocus(pattern: ComplaintPattern) {
  const symptom = normalizeText(pattern.symptom)
  const focus = new Set<string>()

  if (pattern.category === "Ringan") {
    focus.add("Pantau apakah keluhan muncul kembali pada menu atau batch berikutnya.")
    focus.add("Validasi bahan menu yang berpotensi memicu reaksi ringan pada siswa.")
    focus.add("Pastikan catatan keluhan sekolah lengkap untuk pembanding evaluasi berikutnya.")
  }

  if (pattern.category === "Sedang") {
    focus.add("Cocokkan keluhan dengan batch, menu, dan jam distribusi terkait.")
    focus.add("Periksa suhu, waktu simpan, dan kondisi makanan sebelum dikirim.")
    focus.add("Evaluasi kebersihan bahan baku, air, alat masak, dan area pengemasan.")
  }

  if (pattern.category === "Berat") {
    focus.add("Tahan sementara batch/menu terkait sampai evaluasi selesai.")
    focus.add("Cek sampel makanan, catatan produksi, dan kondisi distribusi pada hari kejadian.")
    focus.add("Aktifkan eskalasi medis dan dokumentasikan kronologi penanganan sekolah.")
  }

  if (
    symptom.includes("alergi") ||
    symptom.includes("ruam") ||
    symptom.includes("bentol")
  ) {
    focus.add("Audit komposisi menu, bahan pemicu alergi, dan potensi kontaminasi silang.")
    focus.add("Pastikan informasi alergen dikomunikasikan ke sekolah penerima.")
  }

  if (
    symptom.includes("diare") ||
    symptom.includes("tipes") ||
    symptom.includes("mual")
  ) {
    focus.add("Cek tingkat kematangan makanan serta jeda waktu masak ke konsumsi.")
  }

  if (
    pattern.category === "Berat" ||
    symptom.includes("pingsan") ||
    symptom.includes("sesak") ||
    symptom.includes("kejang")
  ) {
    focus.add("Pastikan SOP darurat dan kontak rujukan kesehatan sekolah berjalan.")
  }

  if (pattern.schools.length > 1) {
    focus.add("Bandingkan pola antar sekolah: menu sama, rute distribusi, dan waktu konsumsi.")
  }

  return Array.from(focus).slice(0, 4)
}

function createSchoolNameMap(schools: SchoolAccount[]) {
  return new Map(
    schools.flatMap((school) => [
      [school.id, school.account?.username ?? school.name] as const,
      ...(school.account?.id
        ? [[school.account.id, school.account.username] as const]
        : []),
    ])
  )
}

function getSchoolName(
  complaint: StudentComplaint,
  schoolNameById: Map<string, string>
) {
  return (
    schoolNameById.get(complaint.sekolahId) ??
    complaint.sekolahUsername ??
    "Sekolah tidak diketahui"
  )
}

function analyzeComplaintPatterns(
  complaints: StudentComplaint[],
  schools: SchoolAccount[]
) {
  const schoolNameById = createSchoolNameMap(schools)
  const grouped = new Map<
    string,
    {
      category: DangerCategory
      complaints: StudentComplaint[]
      latestDate: Date | null
      schools: Set<string>
      totalStudents: number
    }
  >()

  complaints.forEach((complaint) => {
    detectSymptoms(complaint.gejala).forEach((symptom) => {
      const current =
        grouped.get(symptom.label) ??
        {
          category: "Ringan" as DangerCategory,
          complaints: [],
          latestDate: null,
          schools: new Set<string>(),
          totalStudents: 0,
        }

      const date = getComplaintDate(complaint)
      current.complaints.push(complaint)
      current.totalStudents += Number(complaint.jumlahSiswa ?? 0)
      current.schools.add(getSchoolName(complaint, schoolNameById))
      if (categoryRank[symptom.category] > categoryRank[current.category]) {
        current.category = symptom.category
      }

      if (date && (!current.latestDate || date > current.latestDate)) {
        current.latestDate = date
      }

      grouped.set(symptom.label, current)
    })
  })

  return Array.from(grouped.entries())
    .map(([symptom, value]): ComplaintPattern => {
      const schoolsList = Array.from(value.schools).sort()
      const category = getCategory(
        value.category,
        value.totalStudents,
        value.complaints.length,
        schoolsList.length
      )

      return {
        action: getAction(category, schoolsList.length),
        category,
        complaints: value.complaints,
        latestDate: value.latestDate,
        schools: schoolsList,
        symptom,
        totalComplaints: value.complaints.length,
        totalStudents: value.totalStudents,
      }
    })
    .sort((a, b) => {
      return (
        categoryRank[b.category] - categoryRank[a.category] ||
        b.totalStudents - a.totalStudents ||
        b.totalComplaints - a.totalComplaints
      )
    })
}

function getDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

export function ComplaintPatternsAiPage() {
  const cachedComplaints = getCachedPageData<StudentComplaint[]>(
    pageCacheKeys.studentComplaints
  )
  const cachedSchools = getCachedPageData<SchoolAccount[]>(
    pageCacheKeys.schoolAccounts
  )
  const [complaints, setComplaints] = useState<StudentComplaint[]>(
    cachedComplaints ?? []
  )
  const [schools, setSchools] = useState<SchoolAccount[]>(cachedSchools ?? [])
  const [isLoading, setIsLoading] = useState(!cachedComplaints)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [complaintsResponse, schoolsResponse] = await Promise.allSettled([
        api.studentComplaints.list(),
        api.schoolAccounts.list(),
      ])

      if (complaintsResponse.status === "fulfilled") {
        setComplaints(
          setCachedPageData(
            pageCacheKeys.studentComplaints,
            complaintsResponse.value.data
          )
        )
      } else {
        throw complaintsResponse.reason
      }

      if (schoolsResponse.status === "fulfilled") {
        setSchools(
          setCachedPageData(
            pageCacheKeys.schoolAccounts,
            schoolsResponse.value.schools
          )
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat data analisis keluhan."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  const analysis = useMemo(
    () => analyzeComplaintPatterns(complaints, schools),
    [complaints, schools]
  )
  const crossSchoolPatterns = analysis.filter(
    (pattern) => pattern.schools.length > 1
  )
  const severePatterns = analysis.filter(
    (pattern) => pattern.category === "Berat"
  )
  const last7Days = getDaysAgo(6)
  const recentComplaints = complaints.filter((complaint) => {
    const date = getComplaintDate(complaint)
    return date ? date >= last7Days : false
  })
  const totalStudents = complaints.reduce(
    (total, complaint) => total + Number(complaint.jumlahSiswa ?? 0),
    0
  )
  const topPattern = analysis[0]
  const evaluationPatterns = crossSchoolPatterns.length
    ? crossSchoolPatterns
    : topPattern
      ? [topPattern]
      : []
  const evaluationFocusItems = Array.from(
    new Set(evaluationPatterns.flatMap((pattern) => getEvaluationFocus(pattern)))
  ).slice(0, 5)

  const stats = [
    {
      label: "Keluhan dianalisis",
      value: complaints.length.toLocaleString("id-ID"),
      icon: BrainCircuitIcon,
    },
    {
      label: "Siswa terdampak",
      value: totalStudents.toLocaleString("id-ID"),
      icon: UsersRoundIcon,
    },
    {
      label: "Pola lintas sekolah",
      value: crossSchoolPatterns.length.toLocaleString("id-ID"),
      icon: SchoolIcon,
    },
    {
      label: "Keluhan 7 hari",
      value: recentComplaints.length.toLocaleString("id-ID"),
      icon: ClockIcon,
    },
  ]

  return (
    <DashboardShell title="Deteksi Pola Keluhan Siswa (AI)">
      <div className="space-y-4">
        <section className="rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <SparklesIcon className="size-4" />
                AI evaluasi SPPG
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Deteksi Pola Keluhan Siswa (AI)
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Menganalisis gejala, jumlah siswa terdampak, waktu kejadian, dan
                sekolah pelapor untuk menemukan pola keluhan lintas sekolah.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={loadData}
              pending={isLoading}
              disabled={isLoading}
            >
              <RefreshCwIcon className="size-4" />
              Refresh Analisis
            </Button>
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
                Ringkasan otomatis untuk membantu prioritas evaluasi SPPG.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Memuat analisis keluhan siswa...
                </div>
              ) : null}

              {!isLoading && complaints.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Belum ada data keluhan siswa untuk dianalisis.
                </div>
              ) : null}

              {!isLoading && complaints.length > 0 ? (
                <>
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BrainCircuitIcon className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {severePatterns.length > 0
                            ? "Ada pola kategori berat yang perlu ditindaklanjuti."
                            : crossSchoolPatterns.length > 0
                              ? "Ada pola keluhan yang muncul di lebih dari satu sekolah."
                              : "Belum terlihat pola lintas sekolah yang kuat."}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {topPattern
                            ? `Pola teratas adalah ${topPattern.symptom.toLowerCase()} dengan ${topPattern.totalStudents.toLocaleString("id-ID")} siswa terdampak dari ${topPattern.schools.length.toLocaleString("id-ID")} sekolah.`
                            : "AI akan menampilkan ringkasan setelah data keluhan tersedia."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {topPattern ? (
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(topPattern.category)}`}
                        >
                          Kategori {topPattern.category}
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
                  ) : null}

                  {topPattern && evaluationFocusItems.length > 0 ? (
                    <div className="rounded-lg border bg-background p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangleIcon className="size-4 text-primary" />
                          <p className="text-sm font-medium">
                            Yang harus dievaluasi SPPG
                          </p>
                        </div>
                        <span
                          className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getCategoryClass(topPattern.category)}`}
                        >
                          {topPattern.category}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {getCategoryEvaluationDescription(topPattern.category)}
                      </p>
                      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                        {evaluationFocusItems.map((focus) => (
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
                Diurutkan berdasarkan kategori bahaya, jumlah siswa, dan
                frekuensi keluhan.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!isLoading && analysis.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Belum ada pola yang bisa ditampilkan.
                  </div>
                ) : null}

                {analysis.map((pattern) => (
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

      </div>
    </DashboardShell>
  )
}
