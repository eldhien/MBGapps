import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/ui/table-pagination"
import type {
  BatchSummary,
  DashboardAnalytics,
  FoodReport,
  FoodReportCategory,
  SchoolAccount,
} from "@/lib/api"
import { useAuth } from "@/features/auth/AuthProvider"
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
import { useSearchParams } from "react-router-dom"

const categoryOptions: { label: string; value: FoodReportCategory }[] = [
  { label: "Basi", value: "BASI" },
  { label: "Rusak", value: "RUSAK" },
  { label: "Terlambat", value: "TERLAMBAT" },
  { label: "Suhu Tidak Sesuai", value: "SUHU_TIDAK_SESUAI" },
  { label: "Lainnya", value: "LAINNYA" },
]

const categoryIcons: Record<
  FoodReportCategory,
  React.ComponentType<{ className?: string }>
> = {
  BASI: AlertTriangleIcon,
  RUSAK: PackageXIcon,
  TERLAMBAT: ClockIcon,
  SUHU_TIDAK_SESUAI: ThermometerIcon,
  LAINNYA: HelpCircleIcon,
}

const categoryColors: Record<FoodReportCategory, string> = {
  BASI: "text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/20 border-rose-500/20",
  RUSAK:
    "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20 border-amber-500/20",
  TERLAMBAT:
    "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/20 border-blue-500/20",
  SUHU_TIDAK_SESUAI:
    "text-orange-600 bg-orange-500/10 dark:text-orange-400 dark:bg-orange-500/20 border-orange-500/20",
  LAINNYA:
    "text-slate-600 bg-slate-500/10 dark:text-slate-400 dark:bg-slate-500/20 border-slate-500/20",
}

const initialForm = {
  batchId: "",
  kategoriLainnya: "",
  deskripsi: "",
  kategori: "BASI" as FoodReportCategory,
}

const REPORTS_PER_PAGE = 10

function formatCategory(category: FoodReportCategory) {
  return (
    categoryOptions.find((item) => item.value === category)?.label ?? category
  )
}

export function FoodReportsPage({
  mode = "create",
}: {
  mode?: "create" | "history"
}) {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const prefilledBatchId = searchParams.get("batchId") ?? ""
  const selectedReportId = searchParams.get("reportId") ?? ""
  const cachedReports = getCachedPageData<FoodReport[]>(
    pageCacheKeys.foodReports
  )
  const cachedBatches = getCachedPageData<BatchSummary[]>(pageCacheKeys.batches)
  const [reports, setReports] = useState<FoodReport[]>(cachedReports ?? [])
  const [batches, setBatches] = useState<BatchSummary[]>(cachedBatches ?? [])
  const [schools, setSchools] = useState<SchoolAccount[]>(
    () => getCachedPageData<SchoolAccount[]>(pageCacheKeys.schoolAccounts) ?? []
  )
  const [loading, setLoading] = useState(!cachedReports)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [form, setForm] = useState({
    ...initialForm,
    batchId: prefilledBatchId,
  })
  const selectableBatches = batches.filter((batch) =>
    ["DITERIMA", "DITOLAK", "SELESAI"].includes(batch.status)
  )
  const totalPages = Math.max(1, Math.ceil(reports.length / REPORTS_PER_PAGE))
  const paginatedReports = reports.slice(
    (currentPage - 1) * REPORTS_PER_PAGE,
    currentPage * REPORTS_PER_PAGE
  )

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    if (prefilledBatchId) {
      setForm((current) => ({ ...current, batchId: prefilledBatchId }))
    }
  }, [prefilledBatchId])

  useEffect(() => {
    if (!selectedReportId || mode !== "history") {
      return
    }

    const reportIndex = reports.findIndex(
      (report) => report.id === selectedReportId
    )

    if (reportIndex < 0) {
      return
    }

    setCurrentPage(Math.floor(reportIndex / REPORTS_PER_PAGE) + 1)

    window.setTimeout(() => {
      document
        .getElementById(`food-report-${selectedReportId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 80)
  }, [mode, reports, selectedReportId])

  const loadData = async (force = false) => {
    let usedCache = false

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
        usedCache = true
      }
    }

    if (!usedCache) setLoading(true)
    setError(null)

    try {
      const [reportsResponse, batchesResponse, schoolsResponse] =
        await Promise.allSettled([
          api.foodReports.list(),
          api.batches.list(),
          profile?.role === "SEKOLAH"
            ? Promise.resolve({ schools: [] as SchoolAccount[] })
            : api.schoolAccounts.list(),
        ])

      if (reportsResponse.status === "fulfilled") {
        setReports(
          setCachedPageData(
            pageCacheKeys.foodReports,
            reportsResponse.value.data
          )
        )
      } else if (!usedCache) {
        throw reportsResponse.reason
      }

      if (batchesResponse.status === "fulfilled") {
        setBatches(
          setCachedPageData(pageCacheKeys.batches, batchesResponse.value.data)
        )
      } else {
        setBatches([])
      }

      if (
        schoolsResponse.status === "fulfilled" &&
        schoolsResponse.value.schools.length
      ) {
        setSchools(
          setCachedPageData(
            pageCacheKeys.schoolAccounts,
            schoolsResponse.value.schools
          )
        )
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
      setError(
        "Deskripsi minimal 10 karakter agar laporan mudah ditindaklanjuti."
      )
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
      setCurrentPage(1)

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
  const showSchoolReporter = profile?.role !== "SEKOLAH"
  const pageTitle = isCreatePage ? "Buat Laporan Masalah" : "Riwayat Laporan"
  const reporterNameById = new Map(
    schools.flatMap((school) => [
      [school.id, school.account?.username ?? school.name] as const,
      ...(school.account?.id
        ? [[school.account.id, school.account.username] as const]
        : []),
    ])
  )

  function getReporterName(report: FoodReport) {
    return (
      reporterNameById.get(report.sekolahId) ??
      report.sekolahUsername ??
      "Sekolah tidak diketahui"
    )
  }

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
        <div>
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
          <Card className="overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
            <CardHeader className="border-b border-[#edf0f4] px-5 py-4">
              <CardTitle className="text-base font-semibold text-[#111827]">
                Detail Laporan
              </CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Isi kategori, batch terkait, dan deskripsi kejadian.
              </p>
            </CardHeader>
            <CardContent className="p-5">
              <form className="grid gap-5" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <span className="text-sm font-semibold text-[#111827]">
                    Kategori Masalah
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {categoryOptions.map((item) => {
                      const isActive = form.kategori === item.value
                      const CatIcon = categoryIcons[item.value]

                      return (
                        <button
                          key={item.value}
                          type="button"
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left text-sm transition-all ${
                            isActive
                              ? "border-[#0528f2] bg-[#f7f8ff] text-foreground ring-2 ring-[#0528f2]/10"
                              : "border-[#e6eaf1] bg-white text-muted-foreground hover:bg-[#f8fafc] hover:text-foreground"
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
                          <div
                            className={`shrink-0 rounded-lg border p-2 ${categoryColors[item.value]}`}
                          >
                            <CatIcon className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {item.label}
                            </p>
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
                  <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                    Kategori Lainnya
                    <input
                      className="h-11 rounded-xl border border-[#e3e7ef] bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-[#0528f2] focus-visible:ring-2 focus-visible:ring-[#0528f2]/10"
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

                <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                  Batch Terkait
                  <select
                    className="h-11 rounded-xl border border-[#e3e7ef] bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-[#0528f2] focus-visible:ring-2 focus-visible:ring-[#0528f2]/10"
                    value={form.batchId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        batchId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih nanti / tidak diketahui</option>
                    {selectableBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchIdUnik} - {batch.namaMenu}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                  Deskripsi Kejadian
                  <textarea
                    className="min-h-32 rounded-xl border border-[#e3e7ef] bg-white px-3 py-3 text-sm shadow-xs outline-none focus-visible:border-[#0528f2] focus-visible:ring-2 focus-visible:ring-[#0528f2]/10"
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

                <Button
                  disabled={submitting}
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#0528f2] text-white shadow-xs transition-all hover:bg-[#0422c8] hover:shadow-md"
                >
                  {submitting ? "Mengirim Laporan..." : "Kirim Laporan Masalah"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {!isCreatePage ? (
          <section className="overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-1 border-b border-[#edf0f4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#111827]">
                  Riwayat Laporan
                </h2>
                <p className="text-sm text-muted-foreground">
                  Data laporan masalah makanan dari sekolah.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#4b5563]">
                {reports.length} laporan
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-[#edf0f4] bg-[#fcfcfd] text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-5 py-3 font-semibold">Tanggal</th>
                    {showSchoolReporter ? (
                      <th className="px-5 py-3 font-semibold">
                        Sekolah Pelapor
                      </th>
                    ) : null}
                    <th className="px-5 py-3 font-semibold">Kategori</th>
                    <th className="px-5 py-3 font-semibold">Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <tr
                          key={index}
                          className="border-b border-[#edf0f4] last:border-0"
                        >
                          <td className="px-5 py-4">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          {showSchoolReporter ? (
                            <td className="px-5 py-4">
                              <Skeleton className="h-4 w-32" />
                            </td>
                          ) : null}
                          <td className="px-5 py-4">
                            <Skeleton className="h-4 w-28" />
                          </td>
                          <td className="px-5 py-4">
                            <Skeleton className="h-4 w-64" />
                          </td>
                        </tr>
                      ))
                    : null}

                  {!loading && reports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showSchoolReporter ? 4 : 3}
                        className="px-5 py-10 text-center text-muted-foreground"
                      >
                        Belum ada laporan masalah makanan yang terkirim.
                      </td>
                    </tr>
                  ) : null}

                  {!loading
                    ? paginatedReports.map((report) => {
                        const CatIcon =
                          categoryIcons[report.kategori] || HelpCircleIcon

                        return (
                          <tr
                            key={report.id}
                            id={`food-report-${report.id}`}
                            className={`border-b border-[#edf0f4] last:border-0 ${
                              report.id === selectedReportId
                                ? "bg-[#eef2ff] ring-1 ring-inset ring-[#0528f2]/20"
                                : ""
                            }`}
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-[#111827]">
                                {new Date(report.createdAt).toLocaleDateString(
                                  "id-ID"
                                )}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {new Date(report.createdAt).toLocaleTimeString(
                                  "id-ID"
                                )}
                              </p>
                            </td>
                            {showSchoolReporter ? (
                              <td className="px-5 py-4">
                                <span className="text-sm font-medium">
                                  {getReporterName(report)}
                                </span>
                              </td>
                            ) : null}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`rounded-md border p-1.5 ${categoryColors[report.kategori]}`}
                                >
                                  <CatIcon className="size-4" />
                                </div>
                                <span className="font-medium">
                                  {report.kategori === "LAINNYA" &&
                                  report.kategoriLainnya
                                    ? report.kategoriLainnya
                                    : formatCategory(report.kategori)}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground">
                              <p className="line-clamp-2">{report.deskripsi}</p>
                            </td>
                          </tr>
                        )
                      })
                    : null}
                </tbody>
              </table>
            </div>

            {!loading && reports.length > REPORTS_PER_PAGE ? (
              <TablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            ) : null}
          </section>
        ) : null}
      </section>
    </DashboardShell>
  )
}
