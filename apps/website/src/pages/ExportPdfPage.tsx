import { useCallback, useEffect, useMemo, useState } from "react"
import {
  BarChart3Icon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardListIcon,
  DownloadIcon,
  FileTextIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  TruckIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  api,
  type DashboardAnalytics,
  type FoodReport,
  type ProductionDistribution,
  type StudentComplaint,
} from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"

type ReportType = "production" | "distribution" | "risk" | "complaints"

type ProductionBatchReportItem = {
  createdAt?: string | null
  id: string
  jumlahPorsi?: number | null
  menu?: { name?: string | null } | null
  namaMenu?: string | null
  status?: string | null
  totalPorsi?: number | null
  waktuProduksi?: string | null
}

type ExportData = {
  analytics: DashboardAnalytics | null
  batches: ProductionBatchReportItem[]
  distributions: ProductionDistribution[]
  foodReports: FoodReport[]
  studentComplaints: StudentComplaint[]
}

const reportOptions: {
  description: string
  icon: typeof ClipboardListIcon
  label: string
  value: ReportType
}[] = [
  {
    value: "production",
    label: "Produksi",
    description: "Ringkasan batch, menu, porsi, dan status produksi.",
    icon: ClipboardListIcon,
  },
  {
    value: "distribution",
    label: "Distribusi",
    description: "Rekap pengiriman, sekolah tujuan, dan validasi penerimaan.",
    icon: TruckIcon,
  },
  {
    value: "risk",
    label: "Risiko",
    description: "Skor risiko operasional dari laporan dan distribusi pending.",
    icon: ShieldAlertIcon,
  },
  {
    value: "complaints",
    label: "Keluhan",
    description: "Daftar laporan makanan dan keluhan siswa.",
    icon: FileTextIcon,
  },
]

const emptyAnalytics: DashboardAnalytics = {
  totalBatches: 0,
  totalDistributions: 0,
  pendingDistributions: 0,
  deliveredDistributions: 0,
  totalFoodReports: 0,
  totalStudentComplaints: 0,
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatDateOnly(value: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`))
}

function formatNumber(value: number) {
  return value.toLocaleString("id-ID")
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
}

function formatPercentage(value: number) {
  return `${Math.round(clampPercentage(value))}%`
}

function toDateInputValue(date: Date) {
  const value = new Date(date)
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 10)
}

function getDefaultDateRange() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    dateFrom: toDateInputValue(startOfMonth),
    dateTo: toDateInputValue(now),
  }
}

function getDateRangeLabel(dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return "Semua data"
  if (dateFrom && dateTo) {
    return `${formatDateOnly(dateFrom)} - ${formatDateOnly(dateTo)}`
  }
  if (dateFrom) return `Mulai ${formatDateOnly(dateFrom)}`
  return `Sampai ${formatDateOnly(dateTo)}`
}

function parseRangeStart(value: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseRangeEnd(value: string) {
  if (!value) return null
  const date = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isDateInRange(value: string | null | undefined, dateFrom: string, dateTo: string) {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const start = parseRangeStart(dateFrom)
  const end = parseRangeEnd(dateTo)

  if (start && date < start) return false
  if (end && date > end) return false

  return true
}

function createFilteredAnalytics(data: ExportData): DashboardAnalytics {
  const schoolDistributionItems = data.distributions.flatMap(
    (distribution) => distribution.schools
  )

  return {
    totalBatches: data.batches.length,
    totalDistributions: schoolDistributionItems.length,
    pendingDistributions: schoolDistributionItems.filter(
      (item) => item.status === "MENUNGGU"
    ).length,
    deliveredDistributions: schoolDistributionItems.filter(
      (item) => item.status === "DITERIMA"
    ).length,
    totalFoodReports: data.foodReports.length,
    totalStudentComplaints: data.studentComplaints.length,
  }
}

function filterExportData(data: ExportData, dateFrom: string, dateTo: string) {
  const filtered: ExportData = {
    analytics: null,
    batches: data.batches.filter((batch) =>
      isDateInRange(batch.createdAt ?? batch.waktuProduksi, dateFrom, dateTo)
    ),
    distributions: data.distributions.filter((distribution) =>
      isDateInRange(
        distribution.waktuKirim ?? distribution.createdAt,
        dateFrom,
        dateTo
      )
    ),
    foodReports: data.foodReports.filter((report) =>
      isDateInRange(report.createdAt, dateFrom, dateTo)
    ),
    studentComplaints: data.studentComplaints.filter((complaint) =>
      isDateInRange(
        complaint.waktuKejadian ?? complaint.createdAt,
        dateFrom,
        dateTo
      )
    ),
  }

  return {
    ...filtered,
    analytics: createFilteredAnalytics(filtered),
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function capitalize(value: string) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function buildRows(items: string[][]) {
  return items
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")
}

function buildTable(headers: string[], rows: string[][], emptyText: string) {
  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.length ? buildRows(rows) : `<tr><td colspan="${headers.length}" class="empty">${escapeHtml(emptyText)}</td></tr>`}
      </tbody>
    </table>
  `
}

function getRiskSummary(analytics: DashboardAnalytics) {
  const totalMonitoringItems =
    analytics.totalFoodReports + analytics.totalStudentComplaints
  const pendingRate =
    analytics.totalDistributions > 0
      ? (analytics.pendingDistributions / analytics.totalDistributions) * 100
      : 0
  const riskScore = clampPercentage(
    analytics.totalFoodReports * 12 +
      analytics.totalStudentComplaints * 18 +
      pendingRate * 0.65
  )
  const securityScore = clampPercentage(
    100 -
      analytics.totalFoodReports * 9 -
      analytics.totalStudentComplaints * 12 -
      pendingRate * 0.35
  )

  return {
    complaintRatio:
      totalMonitoringItems > 0
        ? (analytics.totalStudentComplaints / totalMonitoringItems) * 100
        : 0,
    foodReportRatio:
      totalMonitoringItems > 0
        ? (analytics.totalFoodReports / totalMonitoringItems) * 100
        : 0,
    pendingRate,
    riskLabel:
      riskScore >= 70 ? "TINGGI" : riskScore >= 40 ? "SEDANG" : "RENDAH",
    riskScore,
    securityLabel:
      securityScore >= 85
        ? "Aman"
        : securityScore >= 65
          ? "Waspada"
          : "Perlu Tindakan",
    securityScore,
    totalMonitoringItems,
  }
}

function buildReportSections(selectedReports: ReportType[], data: ExportData, dateRangeLabel: string) {
  const analytics = data.analytics ?? emptyAnalytics
  const risk = getRiskSummary(analytics)

  const sections: string[] = []
  
  let sectionCounter = 1;
  const toRoman = (num: number) => ["", "I", "II", "III", "IV", "V", "VI", "VII"][num] || String(num)

  // I. RINGKASAN UMUM (Selalu ada)
  sections.push(`
    <section>
      <h2>${toRoman(sectionCounter++)}. RINGKASAN UMUM</h2>
      <div class="box-text">
        <p>Laporan ini disusun untuk memberikan gambaran menyeluruh mengenai pelaksanaan operasional Program Makan Bergizi Gratis (MBG) selama periode ${escapeHtml(dateRangeLabel)}, yang meliputi aktivitas produksi batch makanan, proses distribusi ke satuan pendidikan, indikator risiko operasional, serta rekapitulasi keluhan dan laporan permasalahan dari pihak sekolah maupun siswa.</p>
      </div>
    </section>
  `)

  if (selectedReports.includes("production")) {
    const rows = data.batches
      .slice(0, 50)
      .map((batch) => [
        escapeHtml(batch.id),
        escapeHtml(batch.menu?.name ?? batch.namaMenu ?? "-"),
        escapeHtml(formatNumber(Number(batch.totalPorsi ?? batch.jumlahPorsi ?? 0))),
        escapeHtml(capitalize(batch.status ?? "-")),
        escapeHtml(formatDate(batch.createdAt ?? batch.waktuProduksi)),
      ])

    sections.push(`
      <section>
        <h2>${toRoman(sectionCounter++)}. DATA PRODUKSI BATCH</h2>
        <p class="section-desc">Berikut adalah rekapitulasi seluruh batch produksi yang tercatat dalam sistem selama periode pelaporan, mencakup kode batch, menu, jumlah porsi, status produksi, serta tanggal dan waktu pencatatan.</p>
        ${buildTable(["Kode Batch", "Menu", "Porsi", "Status", "Tanggal & Waktu"], rows, "Belum ada data produksi.")}
        <p class="section-note">Catatan: Sejumlah entri menu merupakan data hasil pengujian sistem (data dummy) yang masih tercatat pada basis data produksi periode ini.</p>
      </section>
    `)
  }

  if (selectedReports.includes("distribution")) {
    const rows = data.distributions
      .slice(0, 50)
      .map((distribution) => [
        escapeHtml(distribution.batchId),
        escapeHtml(distribution.batch?.menu?.name ?? "-"),
        escapeHtml(formatDate(distribution.waktuKirim)),
        escapeHtml(formatNumber(distribution.schools.length)),
        escapeHtml(capitalize(distribution.status ?? "-")),
      ])

    sections.push(`
      <section>
        <h2>${toRoman(sectionCounter++)}. DATA DISTRIBUSI</h2>
        <p class="section-desc">Tabel berikut merangkum proses distribusi makanan dari hasil produksi batch ke satuan pendidikan tujuan, termasuk waktu pengiriman, jumlah sekolah penerima, serta status akhir pengiriman pada masing-masing batch.</p>
        ${buildTable(["Kode Batch", "Menu", "Waktu Kirim", "Jumlah Sekolah", "Status"], rows, "Belum ada data distribusi.")}
      </section>
    `)
  }

  if (selectedReports.includes("risk")) {
    const riskRows = [
      ["Distribusi Tertunda (Pending)", formatPercentage(risk.pendingRate)],
      ["Laporan Permasalahan Makanan", formatPercentage(risk.foodReportRatio)],
      ["Keluhan Siswa", formatPercentage(risk.complaintRatio)],
      ["Tekanan Akibat Distribusi Pending", formatPercentage(risk.pendingRate)],
    ]
    
    sections.push(`
      <section>
        <h2>${toRoman(sectionCounter++)}. ANALISIS RISIKO OPERASIONAL</h2>
        <p class="section-desc">Berdasarkan data yang tercatat pada periode pelaporan, tingkat risiko operasional secara keseluruhan berada pada kategori <strong>${escapeHtml(risk.riskLabel)}</strong>, dengan rincian indikator sebagai berikut.</p>
        <div class="risk-summary">
          <div class="risk-box"><strong>${formatPercentage(risk.riskScore)}</strong><small>SKOR RISIKO</small></div>
          <div class="risk-box"><strong>${formatPercentage(risk.securityScore)}</strong><small>INDEKS KEAMANAN</small></div>
          <div class="risk-box border-none"><strong>${escapeHtml(risk.securityLabel)}</strong><small>STATUS KEAMANAN</small></div>
        </div>
        ${buildTable(["Komponen Risiko", "Persentase"], riskRows, "Tidak ada data risiko.")}
        <p class="section-note">Catatan: Tingginya skor risiko pada periode ini terutama dipengaruhi oleh proporsi keluhan siswa yang relatif tinggi serta adanya distribusi yang masih berstatus tertunda. Disarankan adanya tindak lanjut prioritas terhadap kedua komponen tersebut.</p>
      </section>
    `)
  }

  if (selectedReports.includes("complaints")) {
    const foodReportRows = data.foodReports
      .slice(0, 30)
      .map((report) => [
        escapeHtml(formatDate(report.createdAt)),
        escapeHtml(report.sekolahUsername ?? report.sekolahId),
        escapeHtml(
          report.kategori === "LAINNYA"
            ? report.kategoriLainnya
            : report.kategori
        ),
        escapeHtml(capitalize(report.status ?? "-")),
        escapeHtml(report.deskripsi),
      ])
    const complaintRows = data.studentComplaints
      .slice(0, 30)
      .map((complaint) => [
        escapeHtml(formatDate(complaint.waktuKejadian)),
        escapeHtml(complaint.sekolahUsername ?? complaint.sekolahId),
        escapeHtml(formatNumber(complaint.jumlahSiswa)),
        escapeHtml(complaint.gejala),
        escapeHtml(complaint.tindakan),
      ])

    const sectionNum = sectionCounter++;
    sections.push(`
      <section>
        <h2>${toRoman(sectionNum)}. REKAPITULASI KELUHAN DAN LAPORAN SEKOLAH</h2>
        <h3>${sectionNum}.1 Laporan Permasalahan Makanan</h3>
        ${buildTable(["Tanggal", "Sekolah", "Kategori", "Status", "Deskripsi"], foodReportRows, "Belum ada laporan makanan.")}
        <h3>${sectionNum}.2 Keluhan Siswa</h3>
        ${buildTable(["Waktu", "Sekolah", "Jml. Siswa", "Gejala", "Tindakan"], complaintRows, "Belum ada keluhan siswa.")}
        <p class="section-note">Catatan: Beberapa entri pada tabel keluhan siswa di atas teridentifikasi sebagai data pengujian sistem (dummy) dan disarankan untuk ditinjau ulang validitasnya sebelum dijadikan dasar pengambilan keputusan operasional.</p>
      </section>
    `)
  }

  // VI. KESIMPULAN
  sections.push(`
    <section>
      <h2>${toRoman(sectionCounter++)}. KESIMPULAN</h2>
      <div class="box-text">
        <p>Secara umum, kegiatan produksi dan distribusi Program MBG pada periode ${escapeHtml(dateRangeLabel)} berjalan dengan volume yang cukup tinggi (${formatNumber(analytics.totalBatches)} batch dan ${formatNumber(analytics.totalDistributions)} distribusi), namun diiringi dengan tingkat risiko operasional yang tergolong ${escapeHtml(risk.riskLabel.toLowerCase())} akibat banyaknya keluhan siswa dan laporan permasalahan makanan yang belum tertangani. Diperlukan perhatian khusus dan tindak lanjut segera pada aspek keamanan pangan dan responsivitas penanganan keluhan agar kualitas layanan pada periode berikutnya dapat ditingkatkan.</p>
      </div>
    </section>
  `)

  return sections.join("")
}

function buildPdfTemplate(
  selectedReports: ReportType[],
  data: ExportData,
  dateRangeLabel: string
) {
  const analytics = data.analytics ?? emptyAnalytics
  
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("id-ID", {
    hour: '2-digit',
    minute: '2-digit'
  }).format(now).replace(':', '.');
  const generatedAt = `${dateStr}, pukul ${timeStr} WIB`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Laporan Kerja ${escapeHtml(dateRangeLabel)}</title>
  <style>
    @page { margin: 20mm; size: A4; }
    * { box-sizing: border-box; }
    body { background: #ffffff; color: #000000; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0; font-size: 11px; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .header-center { text-align: center; margin-bottom: 24px; }
    .header-center h1 { font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 1px; }
    .header-center .sub { font-size: 10px; color: #666; letter-spacing: 1px; margin-top: 4px; margin-bottom: 16px; text-transform: uppercase; }
    .header-center h2 { font-size: 14px; font-weight: bold; margin: 0; text-transform: uppercase; }
    
    .meta { margin-bottom: 16px; line-height: 1.8; font-size: 11px; }
    .meta strong { display: inline-block; width: 140px; }
    
    .summary-boxes { display: flex; border: 1px solid #000; margin-bottom: 32px; }
    .summary-box { flex: 1; text-align: center; padding: 12px 8px; border-right: 1px solid #000; }
    .summary-box:last-child { border-right: none; }
    .summary-box strong { display: block; font-size: 20px; margin-bottom: 4px; font-weight: bold; }
    .summary-box small { display: block; font-size: 10px; text-transform: uppercase; }
    
    h2 { font-size: 12px; font-weight: bold; margin: 24px 0 8px; text-transform: uppercase; }
    h3 { font-size: 11px; font-weight: bold; margin: 16px 0 6px; }
    
    .box-text { border: 1px solid #000; padding: 12px; margin-bottom: 16px; }
    .box-text p { margin: 0; line-height: 1.5; text-align: justify; }
    
    .section-desc { margin-bottom: 8px; line-height: 1.5; text-align: justify; }
    .section-note { margin-top: 6px; font-size: 10px; color: #555; text-align: justify; line-height: 1.4; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
    th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { font-weight: bold; }
    
    .risk-summary { display: flex; border: 1px solid #000; margin-bottom: 12px; }
    .risk-box { flex: 1; text-align: center; padding: 12px 8px; border-right: 1px solid #000; }
    .border-none { border-right: none; }
    .risk-box strong { display: block; font-size: 18px; margin-bottom: 4px; font-weight: bold; }
    .risk-box small { display: block; font-size: 10px; text-transform: uppercase; }
    
    footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 10px; color: #555; text-align: justify; line-height: 1.4; }
    
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header-center">
    <h1>MBG.App</h1>
    <div class="sub">Sistem Informasi Manajemen MBG</div>
    <h2>Laporan Kerja Bulanan</h2>
  </div>
  
  <div class="meta">
    <div><strong>Jenis Laporan:</strong> Laporan Operasional Otomatis Sistem MBG App</div>
    <div><strong>Departemen / Unit:</strong> Operasional Produksi &amp; Distribusi MBG</div>
    <div><strong>Periode Laporan:</strong> ${escapeHtml(dateRangeLabel)}</div>
    <div><strong>Tanggal Dibuat:</strong> ${escapeHtml(generatedAt)}</div>
  </div>
  
  <div class="summary-boxes">
    <div class="summary-box"><strong>${formatNumber(analytics.totalBatches)}</strong><small>BATCH</small></div>
    <div class="summary-box"><strong>${formatNumber(analytics.totalDistributions)}</strong><small>DISTRIBUSI</small></div>
    <div class="summary-box"><strong>${formatNumber(analytics.totalFoodReports)}</strong><small>LAPORAN</small></div>
    <div class="summary-box"><strong>${formatNumber(analytics.totalStudentComplaints)}</strong><small>KELUHAN</small></div>
  </div>
  
  ${buildReportSections(selectedReports, data, dateRangeLabel)}
  
  <footer>
    Dokumen ini dihasilkan secara otomatis oleh sistem MBG App berdasarkan data pada basis data operasional per ${escapeHtml(generatedAt)}. Laporan ini bersifat rekapitulatif dan ditujukan untuk mendukung proses pemantauan serta pengambilan keputusan internal terkait pelaksanaan Program Makan Bergizi Gratis (MBG).
  </footer>
</body>
</html>`
}
export function ExportPdfPage() {
  const defaultDateRange = useMemo(() => getDefaultDateRange(), [])
  const cachedAnalytics = getCachedPageData<DashboardAnalytics>(
    pageCacheKeys.dashboardAnalytics
  )
  const cachedBatches = getCachedPageData<ProductionBatchReportItem[]>(
    pageCacheKeys.productionBatches
  )
  const cachedDistributions = getCachedPageData<ProductionDistribution[]>(
    pageCacheKeys.productionDistributions
  )
  const cachedFoodReports = getCachedPageData<FoodReport[]>(
    pageCacheKeys.foodReports
  )
  const cachedComplaints = getCachedPageData<StudentComplaint[]>(
    pageCacheKeys.studentComplaints
  )
  const hasCachedExportData = Boolean(
    cachedAnalytics &&
      cachedBatches &&
      cachedDistributions &&
      cachedFoodReports &&
      cachedComplaints
  )
  const [selectedReports, setSelectedReports] = useState<ReportType[]>([
    "production",
    "distribution",
    "risk",
    "complaints",
  ])
  const [dateFrom, setDateFrom] = useState(defaultDateRange.dateFrom)
  const [dateTo, setDateTo] = useState(defaultDateRange.dateTo)
  const [data, setData] = useState<ExportData>({
    analytics: cachedAnalytics ?? null,
    batches: cachedBatches ?? [],
    distributions: cachedDistributions ?? [],
    foodReports: cachedFoodReports ?? [],
    studentComplaints: cachedComplaints ?? [],
  })
  const [isLoading, setIsLoading] = useState(!hasCachedExportData)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [
        analyticsResponse,
        batchesResponse,
        distributionResponse,
        foodReportsResponse,
        complaintsResponse,
      ] = await Promise.all([
        api.dashboard.analytics(),
        api.productionBatches.list(),
        api.productionDistributions.list(),
        api.foodReports.list(),
        api.studentComplaints.list(),
      ])

      setData({
        analytics: setCachedPageData(
          pageCacheKeys.dashboardAnalytics,
          analyticsResponse.data
        ),
        batches: setCachedPageData(
          pageCacheKeys.productionBatches,
          batchesResponse as ProductionBatchReportItem[]
        ),
        distributions: setCachedPageData(
          pageCacheKeys.productionDistributions,
          distributionResponse.distributions
        ),
        foodReports: setCachedPageData(
          pageCacheKeys.foodReports,
          foodReportsResponse.data
        ),
        studentComplaints: setCachedPageData(
          pageCacheKeys.studentComplaints,
          complaintsResponse.data
        ),
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data laporan."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasCachedExportData) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [hasCachedExportData, loadData])

  const filteredData = useMemo(
    () => filterExportData(data, dateFrom, dateTo),
    [data, dateFrom, dateTo]
  )
  const dateRangeLabel = useMemo(
    () => getDateRangeLabel(dateFrom, dateTo),
    [dateFrom, dateTo]
  )
  const dateRangeError = useMemo(() => {
    const start = parseRangeStart(dateFrom)
    const end = parseRangeEnd(dateTo)

    return start && end && start > end
      ? "Tanggal mulai tidak boleh lebih besar dari tanggal akhir."
      : null
  }, [dateFrom, dateTo])
  const analytics = filteredData.analytics ?? emptyAnalytics
  const riskSummary = useMemo(() => getRiskSummary(analytics), [analytics])
  const previewStats = [
    {
      label: "Batch produksi",
      value: filteredData.batches.length,
      icon: ClipboardListIcon,
    },
    {
      label: "Distribusi",
      value: filteredData.distributions.length,
      icon: TruckIcon,
    },
    {
      label: "Skor risiko",
      value: formatPercentage(riskSummary.riskScore),
      icon: BarChart3Icon,
    },
    {
      label: "Keluhan & laporan",
      value:
        filteredData.foodReports.length + filteredData.studentComplaints.length,
      icon: FileTextIcon,
    },
  ]

  function applyDatePreset(preset: "all" | "month" | "today" | "week" | "thirty") {
    const now = new Date()

    if (preset === "all") {
      setDateFrom("")
      setDateTo("")
      return
    }

    if (preset === "today") {
      const today = toDateInputValue(now)
      setDateFrom(today)
      setDateTo(today)
      return
    }

    if (preset === "week" || preset === "thirty") {
      const start = new Date(now)
      start.setDate(start.getDate() - (preset === "week" ? 6 : 29))
      setDateFrom(toDateInputValue(start))
      setDateTo(toDateInputValue(now))
      return
    }

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    setDateFrom(toDateInputValue(startOfMonth))
    setDateTo(toDateInputValue(now))
  }

  function toggleReport(reportType: ReportType) {
    setSelectedReports((current) =>
      current.includes(reportType)
        ? current.filter((item) => item !== reportType)
        : [...current, reportType]
    )
  }

  function handleDownloadPdf() {
    if (selectedReports.length === 0) {
      setError("Pilih minimal satu jenis laporan untuk diexport.")
      return
    }

    if (dateRangeError) {
      setError(dateRangeError)
      return
    }

    const iframe = document.createElement("iframe")
    iframe.title = "Preview PDF Laporan MBG"
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.style.opacity = "0"

    document.body.appendChild(iframe)

    const removeIframe = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
    }

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow

      if (!frameWindow) {
        removeIframe()
        setError("Gagal menyiapkan PDF. Coba ulangi beberapa saat lagi.")
        return
      }

      frameWindow.onafterprint = removeIframe
      frameWindow.focus()
      frameWindow.print()
      window.setTimeout(removeIframe, 60_000)
    }

    const iframeDocument =
      iframe.contentDocument ?? iframe.contentWindow?.document

    if (!iframeDocument) {
      removeIframe()
      setError("Gagal menyiapkan PDF. Coba ulangi beberapa saat lagi.")
      return
    }

    iframeDocument.open()
    iframeDocument.write(
      buildPdfTemplate(selectedReports, filteredData, dateRangeLabel)
    )
    iframeDocument.close()
  }

  return (
    <DashboardShell title="Export Laporan PDF">
      <div className="space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Export Laporan PDF
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Pilih periode dan bagian laporan yang ingin dicetak menjadi PDF.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-10 cursor-pointer rounded-xl border-[#e3e7ef] bg-white"
              onClick={loadData}
              pending={isLoading}
              disabled={isLoading}
            >
              <RefreshCwIcon className="size-4" />
              Refresh
            </Button>
            <Button
              className="h-10 cursor-pointer rounded-xl bg-[#0528f2] px-4 text-white hover:bg-[#0528f2]"
              onClick={handleDownloadPdf}
              disabled={isLoading || Boolean(dateRangeError)}
            >
              <DownloadIcon className="size-4" />
              Download PDF
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-2 border-b border-[#edf0f4] px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Parameter Laporan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Data PDF akan mengikuti periode yang dipilih.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#edf0f4] bg-[#f8fafc] px-3 py-1.5 text-sm font-semibold">
              <CalendarDaysIcon className="size-4 text-[#0528f2]" />
              {dateRangeLabel}
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Tanggal Mulai
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e3e7ef] bg-white px-3 text-sm outline-none transition focus:border-[#0528f2] focus:ring-3 focus:ring-[#0528f2]/10"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tanggal Akhir
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e3e7ef] bg-white px-3 text-sm outline-none transition focus:border-[#0528f2] focus:ring-3 focus:ring-[#0528f2]/10"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-full border-[#e3e7ef] bg-white"
                onClick={() => applyDatePreset("today")}
              >
                Hari Ini
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-full border-[#e3e7ef] bg-white"
                onClick={() => applyDatePreset("week")}
              >
                7 Hari
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-full border-[#e3e7ef] bg-white"
                onClick={() => applyDatePreset("thirty")}
              >
                30 Hari
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-full border-[#e3e7ef] bg-white"
                onClick={() => applyDatePreset("month")}
              >
                Bulan Ini
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer rounded-full text-muted-foreground hover:bg-[#f7f9ff] hover:text-[#0528f2]"
                onClick={() => applyDatePreset("all")}
              >
                Semua Data
              </Button>
            </div>

            {dateRangeError && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
                {dateRangeError}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#edf0f4] px-6 py-5">
              <h2 className="text-lg font-semibold">Jenis Laporan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pilih bagian yang ingin dimasukkan ke dokumen.
              </p>
            </div>
            <div className="space-y-3 p-6">
              {reportOptions.map((option) => {
                const Icon = option.icon
                const checked = selectedReports.includes(option.value)

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      checked
                        ? "border-[#0528f2] bg-[#f7f9ff]"
                        : "border-[#edf0f4] bg-white hover:bg-[#fbfcff]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleReport(option.value)}
                    />
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        checked
                          ? "bg-[#0528f2] text-white"
                          : "bg-[#eef2ff] text-[#0528f2]"
                      }`}
                    >
                      {checked ? (
                        <CheckIcon className="size-5" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </section>

          <section className="rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-2 border-b border-[#edf0f4] px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Preview Isi PDF</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ringkasan data yang akan masuk ke file laporan.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[#edf0f4] bg-[#f8fafc] px-3 py-1.5 text-sm font-semibold">
                {selectedReports.length} bagian dipilih
              </span>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {previewStats.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#edf0f4] bg-[#fbfcff] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {item.label}
                        </span>
                        <Icon className="size-4 shrink-0 text-[#0528f2]" />
                      </div>
                      <p className="mt-3 text-2xl font-bold">
                        {isLoading
                          ? "..."
                          : typeof item.value === "number"
                            ? formatNumber(item.value)
                            : item.value}
                      </p>
                    </div>
                  )
                })}
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
                  {error}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}
