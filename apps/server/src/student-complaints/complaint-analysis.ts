type DangerCategory = "Ringan" | "Sedang" | "Berat"
type AnalysisPeriod = "24h" | "7d" | "30d" | "all"
type TrendStatus = "Normal" | "Meningkat" | "Akselerasi Tinggi"

type ComplaintInput = {
  batchId: string | null
  createdAt: Date
  gejala: string
  id: string
  jumlahSiswa: number
  sekolahId: string
  sekolahUsername?: string
  waktuKejadian: Date
}

type SchoolInput = {
  aliases?: string[]
  id: string
  name: string
}

type BatchContext = {
  id: string
  driverName: string | null
  menuName: string | null
  route: string | null
  status: string | null
  distributions: {
    id: string
    status: string
    waktuKirim: Date | null
    schools: {
      schoolId: string
      schoolName: string
      status: string
    }[]
  }[]
}

type SymptomMatch = {
  category: DangerCategory
  confidence: number
  label: string
  matchedText: string
}

const categoryRank: Record<DangerCategory, number> = {
  Ringan: 1,
  Sedang: 2,
  Berat: 3,
}

// ─── 1. EXPANDED SYMPTOM CATALOG ─────────────────────────────────────────────
// Menambahkan kosakata lokal (bahasa daerah), slang medis, dan sinonim
// untuk meningkatkan cakupan deteksi gejala dari laporan teks bebas.
const symptomCatalog = [
  {
    category: "Ringan",
    label: "Ruam merah",
    keywords: [
      "ruam merah",
      "kemerahan",
      "merah merah",
      "kulit merah",
      "kulit memerah",
      "bintik merah",
      "bercak merah",
      "kulit kemerahan",
    ],
  },
  {
    category: "Ringan",
    label: "Alergi ringan",
    keywords: [
      "gatal",
      "gatel",
      "bentol",
      "bentol-bentol",
      "biduran",
      "bersin",
      "kesemutan bibir",
      "urtikaria",
      "alergi ringan",
      "kulit gatal",
      "gatal-gatal",
    ],
  },
  {
    category: "Sedang",
    label: "Diare",
    keywords: [
      "diare",
      "mencret",
      "mising-mising",
      "mising mising",
      "bab cair",
      "buang air cair",
      "sakit perut",
      "sakit weteng",
      "perut mulas",
      "mencret-mencret",
      "buang air terus",
      "bab terus",
      "perut sakit",
    ],
  },
  {
    category: "Sedang",
    label: "Demam/tifoid",
    keywords: [
      "tipes",
      "typhus",
      "tifus",
      "demam tifoid",
      "typhoid",
      "demam",
      "panas badan",
      "badan panas",
      "greges",
      "meriang",
      "panas tinggi",
      "suhu tinggi",
    ],
  },
  {
    category: "Sedang",
    label: "Mual muntah",
    keywords: [
      "mual",
      "muntah",
      "enek",
      "enek-enek",
      "kram perut",
      "perut melilit",
      "sebah",
      "mau muntah",
      "rasa mual",
      "perut begah",
      "begah",
      "puyeng",
      "mumet",
      "pusing",
      "sakit kepala",
    ],
  },
  {
    category: "Sedang",
    label: "Alergi sedang",
    keywords: [
      "bibir bengkak",
      "mata bengkak",
      "biduran menyebar",
      "bengkak",
      "alergi sedang",
      "wajah bengkak",
      "muka bengkak",
    ],
  },
  {
    category: "Berat",
    label: "Pingsan",
    keywords: [
      "pingsan",
      "hampir pingsan",
      "hilang kesadaran",
      "kolaps",
      "tidak sadarkan diri",
      "jatuh pingsan",
      "sawan",
      "nggliyeng",
    ],
  },
  {
    category: "Berat",
    label: "Sesak napas",
    keywords: [
      "sesak napas",
      "sulit bernapas",
      "nafas sesak",
      "napas berat",
      "sulit nafas",
      "napas pendek",
      "megap-megap",
      "napas susah",
    ],
  },
  {
    category: "Berat",
    label: "Kejang-kejang",
    keywords: ["kejang", "kejang kejang", "step", "kaget-kaget", "tubuh kaku"],
  },
  {
    category: "Berat",
    label: "Alergi berat",
    keywords: [
      "sulit menelan",
      "tenggorokan tercekik",
      "bibir membiru",
      "kulit pucat",
      "lemas drastis",
      "bengkak parah",
      "anaphylaxis",
      "anafilaktik",
      "reaksi anafilaktik",
      "tubuh lemas",
      "lemas banget",
      "kulit membiru",
      "bibir biru",
    ],
  },
  {
    category: "Berat",
    label: "Keracunan/reaksi serius",
    keywords: [
      "keracunan",
      "buih dari mulut",
      "mengeluarkan buih",
      "mulut berbuih",
      "reaksi serius",
      "mabuk makanan",
      "food poisoning",
      "muntah darah",
      "berak darah",
    ],
  },
] satisfies {
  category: DangerCategory
  label: string
  keywords: string[]
}[]

// ─── 2. IMPROVED NEGATION DETECTION ──────────────────────────────────────────
// Memeriksa 6 kata sebelum kata kunci (diperluas dari 3) dan
// juga memeriksa apakah ada negasi dalam 20 karakter SETELAH kata kunci
// untuk menangani kalimat seperti "mual tapi sudah tidak jadi muntah".
const negationWords = [
  "tidak",
  "tdk",
  "nggak",
  "ga",
  "gak",
  "bukan",
  "tanpa",
  "belum",
  "sudah tidak",
  "sudah ga",
  "tak",
  "tiada",
]

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function levenshtein(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 0; i < a.length; i += 1) {
    const current = [i + 1]
    for (let j = 0; j < b.length; j += 1) {
      current[j + 1] =
        a[i] === b[j]
          ? previous[j]
          : Math.min(previous[j], previous[j + 1], current[j]) + 1
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[b.length]
}

function similarity(a: string, b: string) {
  const maxLength = Math.max(a.length, b.length)
  if (!maxLength) return 1
  return 1 - levenshtein(a, b) / maxLength
}

function hasNegationBefore(text: string, matchStart: number) {
  // Perlebar jendela dari 28 karakter (3 kata) menjadi 48 karakter (~6 kata)
  const prefix = text.slice(Math.max(0, matchStart - 48), matchStart).trim()
  const words = prefix.split(/\s+/).filter(Boolean)
  return words.slice(-6).some((word) => negationWords.includes(word))
}

function hasNegationAfter(text: string, matchEnd: number) {
  // Cek apakah negasi muncul dalam 30 karakter setelah kata kunci
  // menangkap pola: "mual ... sudah tidak jadi muntah"
  const suffix = text.slice(matchEnd, matchEnd + 30).trim()
  return negationWords.some((neg) => suffix.startsWith(neg))
}

function findKeywordMatch(text: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword)
  const exactIndex = text.indexOf(normalizedKeyword)

  if (exactIndex >= 0) {
    const matchEnd = exactIndex + normalizedKeyword.length
    if (
      hasNegationBefore(text, exactIndex) ||
      hasNegationAfter(text, matchEnd)
    ) {
      return null
    }
    return { confidence: 0.96, matchedText: keyword }
  }

  const keywordWords = normalizedKeyword.split(" ")
  const words = text.split(" ")
  const windowSize = keywordWords.length

  if (!windowSize || words.length < windowSize) {
    return null
  }

  for (let index = 0; index <= words.length - windowSize; index += 1) {
    const candidate = words.slice(index, index + windowSize).join(" ")
    const score = similarity(candidate, normalizedKeyword)
    const charIndex = text.indexOf(candidate)
    const charEnd = charIndex + candidate.length

    if (
      score >= 0.82 &&
      !hasNegationBefore(text, charIndex) &&
      !hasNegationAfter(text, charEnd)
    ) {
      return { confidence: Number((0.72 + score * 0.2).toFixed(2)), matchedText: candidate }
    }
  }

  return null
}

function detectSymptoms(gejala: string): SymptomMatch[] {
  const text = normalizeText(gejala)
  const matches = symptomCatalog.flatMap((item) => {
    const best = item.keywords
      .map((keyword) => findKeywordMatch(text, keyword))
      .filter(Boolean)
      .sort((a, b) => (b?.confidence ?? 0) - (a?.confidence ?? 0))[0]

    return best
      ? [
          {
            category: item.category,
            confidence: best.confidence,
            label: item.label,
            matchedText: best.matchedText,
          },
        ]
      : []
  })

  return matches.length
    ? matches
    : [{ category: "Ringan", confidence: 0.45, label: "Gejala lain", matchedText: gejala }]
}

function getPeriodStart(period: AnalysisPeriod, now = new Date()) {
  if (period === "all") return null

  const date = new Date(now)
  const hours = period === "24h" ? 24 : period === "7d" ? 24 * 7 : 24 * 30
  date.setHours(date.getHours() - hours)
  return date
}

function getCategory(
  detectedCategory: DangerCategory,
  totalStudents: number,
  totalComplaints: number,
  totalSchools: number,
  batchCount: number
): DangerCategory {
  if (detectedCategory === "Berat") return "Berat"
  if (detectedCategory === "Sedang" && (totalStudents >= 8 || totalSchools >= 2)) return "Berat"
  if (detectedCategory === "Sedang") return "Sedang"
  if (totalStudents >= 12 || totalComplaints >= 5 || totalSchools >= 3 || batchCount >= 2) return "Berat"
  if (totalStudents >= 5 || totalComplaints >= 3 || totalSchools >= 2) return "Sedang"
  return "Ringan"
}

function getRiskReasons(input: {
  batchCount: number
  detectedCategory: DangerCategory
  matchedTerms: string[]
  totalComplaints: number
  totalSchools: number
  totalStudents: number
}) {
  const reasons = []

  if (input.detectedCategory === "Berat") {
    reasons.push(
      `Terdeteksi gejala berisiko tinggi: ${input.matchedTerms.slice(0, 3).join(", ")}.`
    )
  }

  if (input.detectedCategory === "Sedang" && input.totalStudents >= 8) {
    reasons.push("Gejala sedang meningkat menjadi berat karena siswa terdampak mencapai 8 orang atau lebih.")
  }

  if (input.detectedCategory === "Sedang" && input.totalSchools >= 2) {
    reasons.push("Gejala sedang muncul di lebih dari satu sekolah.")
  }

  if (input.totalStudents >= 12) {
    reasons.push("Jumlah siswa terdampak mencapai 12 orang atau lebih.")
  }

  if (input.totalComplaints >= 5) {
    reasons.push("Frekuensi keluhan mencapai 5 laporan atau lebih.")
  }

  if (input.totalSchools >= 3) {
    reasons.push("Keluhan muncul di 3 sekolah atau lebih.")
  }

  if (input.batchCount >= 2) {
    reasons.push("Keluhan terkait lebih dari satu batch.")
  }

  return reasons.length
    ? reasons
    : ["Kategori dihitung dari kombinasi jenis gejala, jumlah siswa, frekuensi keluhan, sekolah terdampak, dan konteks batch."]
}

// ─── 3. DYNAMIC ACTION RECOMMENDATIONS ───────────────────────────────────────
// Menyusun saran tindak lanjut secara dinamis menggunakan data spesifik:
// nama menu, nama driver, dan ID batch — bukan lagi templat teks generik.
function getAction(
  category: DangerCategory,
  schoolCount: number,
  batches: BatchContext[]
): string {
  const hasBatchContext = batches.length > 0
  const firstBatch = batches[0]
  const batchRef = firstBatch
    ? [
        firstBatch.id,
        firstBatch.menuName ? `menu: ${firstBatch.menuName}` : null,
        firstBatch.driverName ? `kurir: ${firstBatch.driverName}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : null

  if (category === "Berat") {
    if (hasBatchContext && batchRef) {
      return `Segera audit batch ${batchRef}. Tahan distribusi lanjutan bila perlu, cek sampel makanan, dan koordinasikan tindak lanjut medis.`
    }
    if (hasBatchContext) {
      return "Prioritaskan audit batch/menu terkait, cek sampel makanan, tahan distribusi lanjutan bila perlu, dan koordinasikan tindak lanjut medis."
    }
    return "Prioritaskan validasi keluhan, cek kronologi sekolah, dan koordinasikan tindak lanjut medis."
  }

  if (category === "Sedang" || schoolCount > 1) {
    if (hasBatchContext && batchRef) {
      return `Bandingkan menu dan jam distribusi batch ${batchRef} di sekolah terdampak sebelum produksi berikutnya.`
    }
    return "Bandingkan menu, jam distribusi, dan sekolah terdampak sebelum produksi berikutnya."
  }

  return "Pantau keluhan lanjutan dan pastikan tindakan awal sekolah sudah terdokumentasi."
}

function getEvaluationFocus(category: DangerCategory, symptom: string, schoolCount: number) {
  const focus = new Set<string>()
  const normalized = normalizeText(symptom)

  if (category === "Berat") {
    focus.add("Tahan sementara batch/menu terkait sampai evaluasi selesai.")
    focus.add("Cek sampel makanan, catatan produksi, suhu, dan kondisi distribusi.")
    focus.add("Aktifkan eskalasi medis dan dokumentasikan kronologi penanganan.")
  } else if (category === "Sedang") {
    focus.add("Cocokkan keluhan dengan batch, menu, dan jam distribusi terkait.")
    focus.add("Periksa waktu simpan, suhu makanan, air, bahan baku, dan area pengemasan.")
  } else {
    focus.add("Pantau apakah keluhan muncul kembali pada menu atau batch berikutnya.")
    focus.add("Validasi bahan menu yang berpotensi memicu reaksi ringan.")
  }

  if (normalized.includes("alergi") || normalized.includes("ruam") || normalized.includes("bentol")) {
    focus.add("Audit bahan pemicu alergi dan potensi kontaminasi silang.")
  }
  if (schoolCount > 1) {
    focus.add("Bandingkan pola antar sekolah: menu sama, rute distribusi, dan waktu konsumsi.")
  }

  return Array.from(focus).slice(0, 5)
}

function createSchoolNameMap(schools: SchoolInput[]) {
  return new Map(
    schools.flatMap((school) => [
      [school.id, school.name] as const,
      ...(school.aliases?.map((alias) => [alias, school.name] as const) ?? []),
    ])
  )
}

function getSchoolName(complaint: ComplaintInput, schoolNames: Map<string, string>) {
  return schoolNames.get(complaint.sekolahId) ?? complaint.sekolahUsername ?? complaint.sekolahId
}

// ─── 4. BATCH ANOMALY DETECTION ───────────────────────────────────────────────
// Mendeteksi ketika keluhan dari ≥3 sekolah berbeda berasal dari batch yang sama.
// Ini menandakan potensi kontaminasi/masalah pada satu siklus produksi.
function detectBatchAnomalies(
  complaints: ComplaintInput[],
  batchById: Map<string, BatchContext>,
  schoolNames: Map<string, string>
) {
  const batchSchools = new Map<string, Set<string>>()
  const batchComplaintCount = new Map<string, number>()

  for (const complaint of complaints) {
    if (!complaint.batchId) continue
    const schoolName = schoolNames.get(complaint.sekolahId) ?? complaint.sekolahUsername ?? complaint.sekolahId

    if (!batchSchools.has(complaint.batchId)) {
      batchSchools.set(complaint.batchId, new Set())
    }
    batchSchools.get(complaint.batchId)!.add(schoolName)
    batchComplaintCount.set(complaint.batchId, (batchComplaintCount.get(complaint.batchId) ?? 0) + 1)
  }

  const anomalies: {
    batchId: string
    menuName: string | null
    driverName: string | null
    affectedSchools: string[]
    totalComplaints: number
  }[] = []

  for (const [batchId, schools] of batchSchools.entries()) {
    if (schools.size >= 3) {
      const batch = batchById.get(batchId)
      anomalies.push({
        batchId,
        menuName: batch?.menuName ?? null,
        driverName: batch?.driverName ?? null,
        affectedSchools: Array.from(schools).sort(),
        totalComplaints: batchComplaintCount.get(batchId) ?? 0,
      })
    }
  }

  return anomalies.sort((a, b) => b.affectedSchools.length - a.affectedSchools.length)
}

// ─── 5. EXPONENTIAL TREND DETECTION ──────────────────────────────────────────
// Membandingkan jumlah keluhan 2 jam terakhir vs 2 jam sebelumnya.
// Jika rasio ≥ 3x → "Akselerasi Tinggi", ≥ 1.5x → "Meningkat", else "Normal".
function detectTrend(complaints: ComplaintInput[]): { status: TrendStatus; rate: number } {
  if (!complaints.length) return { status: "Normal", rate: 0 }

  const now = new Date()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

  const recent = complaints.filter(
    (c) => c.waktuKejadian >= twoHoursAgo && c.waktuKejadian < now
  ).length

  const previous = complaints.filter(
    (c) => c.waktuKejadian >= fourHoursAgo && c.waktuKejadian < twoHoursAgo
  ).length

  if (recent === 0 && previous === 0) return { status: "Normal", rate: 0 }

  // Jika sebelumnya tidak ada keluhan tapi sekarang ada, anggap sebagai lonjakan besar
  const rate = previous === 0 ? recent : Number((recent / previous).toFixed(2))

  let status: TrendStatus = "Normal"
  if (rate >= 3) status = "Akselerasi Tinggi"
  else if (rate >= 1.5) status = "Meningkat"

  return { status, rate }
}

export function buildComplaintAnalysis(input: {
  batches: BatchContext[]
  complaints: ComplaintInput[]
  period: AnalysisPeriod
  schools: SchoolInput[]
}) {
  const periodStart = getPeriodStart(input.period)
  const complaints = periodStart
    ? input.complaints.filter((complaint) => complaint.waktuKejadian >= periodStart)
    : input.complaints
  const schoolNames = createSchoolNameMap(input.schools)
  const batchById = new Map(input.batches.map((batch) => [batch.id, batch]))
  const grouped = new Map<string, any>()

  for (const complaint of complaints) {
    for (const symptom of detectSymptoms(complaint.gejala)) {
      const current =
      grouped.get(symptom.label) ??
        {
          batchIds: new Set<string>(),
          category: "Ringan" as DangerCategory,
          complaints: [],
          confidenceTotal: 0,
          latestDate: null as Date | null,
          matches: [] as string[],
          schools: new Set<string>(),
          totalStudents: 0,
        }
      const currentPattern = current as {
        batchIds: Set<string>
        category: DangerCategory
        complaints: ComplaintInput[]
        confidenceTotal: number
        latestDate: Date | null
        matches: string[]
        schools: Set<string>
        totalStudents: number
      }

      currentPattern.complaints.push(complaint)
      currentPattern.confidenceTotal += symptom.confidence
      currentPattern.matches.push(symptom.matchedText)
      currentPattern.schools.add(getSchoolName(complaint, schoolNames))
      currentPattern.totalStudents += complaint.jumlahSiswa
      if (complaint.batchId) currentPattern.batchIds.add(complaint.batchId)
      if (categoryRank[symptom.category] > categoryRank[currentPattern.category]) {
        currentPattern.category = symptom.category
      }
      if (!currentPattern.latestDate || complaint.waktuKejadian > currentPattern.latestDate) {
        currentPattern.latestDate = complaint.waktuKejadian
      }
      grouped.set(symptom.label, currentPattern)
    }
  }

  const patterns = Array.from(grouped.entries())
    .map(([symptom, value]) => {
      const schools = Array.from(value.schools).sort()
      const batchIds = Array.from(value.batchIds) as string[]
      const batches = batchIds.map((id) => batchById.get(id)).filter(Boolean) as BatchContext[]
      const category = getCategory(
        value.category,
        value.totalStudents,
        value.complaints.length,
        schools.length,
        batchIds.length
      )
      const matchedTerms = Array.from(new Set(value.matches)).slice(0, 5) as string[]
      const confidence = Math.min(
        0.99,
        value.confidenceTotal / value.complaints.length +
          Math.min(0.12, (value.complaints.length - 1) * 0.03) +
          Math.min(0.08, (schools.length - 1) * 0.03)
      )

      return {
        // Gunakan getAction dinamis dengan data batch aktual
        action: getAction(category, schools.length, batches),
        batches: batches.map((batch) => ({
          id: batch.id,
          driverName: batch.driverName,
          menuName: batch.menuName,
          route: batch.route,
          status: batch.status,
          distributions: batch.distributions.map((distribution) => ({
            id: distribution.id,
            status: distribution.status,
            waktuKirim: distribution.waktuKirim?.toISOString() ?? null,
            schools: distribution.schools,
          })),
        })),
        category,
        confidence: Number(confidence.toFixed(2)),
        evaluationFocus: getEvaluationFocus(category, symptom, schools.length),
        latestDate: value.latestDate?.toISOString() ?? null,
        matchedTerms,
        riskReasons: getRiskReasons({
          batchCount: batchIds.length,
          detectedCategory: value.category,
          matchedTerms,
          totalComplaints: value.complaints.length,
          totalSchools: schools.length,
          totalStudents: value.totalStudents,
        }),
        schools,
        symptom,
        totalComplaints: value.complaints.length,
        totalStudents: value.totalStudents,
      }
    })
    .sort(
      (a, b) =>
        categoryRank[b.category] - categoryRank[a.category] ||
        b.totalStudents - a.totalStudents ||
        b.totalComplaints - a.totalComplaints ||
        b.confidence - a.confidence
    )

  const totalStudents = complaints.reduce((total, complaint) => total + complaint.jumlahSiswa, 0)
  const crossSchoolPatterns = patterns.filter((pattern) => pattern.schools.length > 1)
  const severePatterns = patterns.filter((pattern) => pattern.category === "Berat")
  const topPattern = patterns[0] ?? null

  // Jalankan deteksi fitur baru
  const batchAnomalies = detectBatchAnomalies(complaints, batchById, schoolNames)
  const trend = detectTrend(complaints)

  return {
    generatedAt: new Date().toISOString(),
    period: input.period,
    summary: {
      conclusion: severePatterns.length
        ? "Ada pola kategori berat yang perlu ditindaklanjuti."
        : crossSchoolPatterns.length
          ? "Ada pola keluhan yang muncul di lebih dari satu sekolah."
          : patterns.length
            ? "Belum terlihat pola lintas sekolah yang kuat."
            : "Belum ada data keluhan untuk dianalisis.",
      evaluationFocus: Array.from(
        new Set((crossSchoolPatterns.length ? crossSchoolPatterns : topPattern ? [topPattern] : []).flatMap((pattern) => pattern.evaluationFocus))
      ).slice(0, 5),
      topPattern,
    },
    stats: {
      crossSchoolPatterns: crossSchoolPatterns.length,
      severePatterns: severePatterns.length,
      totalComplaints: complaints.length,
      totalStudents,
    },
    patterns,
    batchAnomalies,
    trend,
  }
}

export function normalizeAnalysisPeriod(value: unknown): AnalysisPeriod {
  return value === "24h" || value === "7d" || value === "30d" || value === "all"
    ? value
    : "7d"
}
