import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/AuthProvider"
import type {
  BatchSummary,
  DashboardAnalytics,
  SchoolAccount,
  StudentComplaint,
} from "@/lib/api"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
} from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

function getCurrentDateTimeLocal() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function parseDateTimeLocal(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function formatDateTimeLabel(value: string) {
  const date = parseDateTimeLocal(value)

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function updateDatePart(currentValue: string, selectedDate: Date) {
  const current = parseDateTimeLocal(currentValue)
  selectedDate.setHours(current.getHours(), current.getMinutes(), 0, 0)

  return toDateTimeLocalValue(selectedDate)
}

function updateTimePart(currentValue: string, timeValue: string) {
  const [hours = "0", minutes = "0"] = timeValue.split(":")
  const current = parseDateTimeLocal(currentValue)
  current.setHours(Number(hours), Number(minutes), 0, 0)

  return toDateTimeLocalValue(current)
}

const initialForm = {
  batchId: "",
  gejala: "",
  jumlahSiswa: "1",
  tindakan: "",
  waktuKejadian: getCurrentDateTimeLocal(),
}

const COMPLAINTS_PER_PAGE = 10

export function StudentComplaintsPage({
  mode = "create",
}: {
  mode?: "create" | "history"
}) {
  const { profile } = useAuth()
  const cachedComplaints = getCachedPageData<StudentComplaint[]>(
    pageCacheKeys.studentComplaints
  )
  const cachedBatches = getCachedPageData<BatchSummary[]>(pageCacheKeys.batches)
  const [complaints, setComplaints] = useState<StudentComplaint[]>(
    cachedComplaints ?? []
  )
  const [batches, setBatches] = useState<BatchSummary[]>(cachedBatches ?? [])
  const [schools, setSchools] = useState<SchoolAccount[]>(
    () => getCachedPageData<SchoolAccount[]>(pageCacheKeys.schoolAccounts) ?? []
  )
  const [loading, setLoading] = useState(!cachedComplaints)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [form, setForm] = useState(initialForm)
  const selectableBatches = batches.filter((batch) =>
    ["DITERIMA", "DITOLAK", "SELESAI"].includes(batch.status)
  )
  const totalPages = Math.max(
    1,
    Math.ceil(complaints.length / COMPLAINTS_PER_PAGE)
  )
  const paginatedComplaints = complaints.slice(
    (currentPage - 1) * COMPLAINTS_PER_PAGE,
    currentPage * COMPLAINTS_PER_PAGE
  )

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const loadData = async (force = false) => {
    let usedCache = false

    if (!force) {
      const complaintsCache = getCachedPageData<StudentComplaint[]>(
        pageCacheKeys.studentComplaints
      )
      const batchesCache = getCachedPageData<BatchSummary[]>(
        pageCacheKeys.batches
      )

      if (complaintsCache) {
        setComplaints(complaintsCache)
        setBatches(batchesCache ?? [])
        setLoading(false)
        usedCache = true
      }
    }

    if (!usedCache) setLoading(true)
    setError(null)

    try {
      const [complaintsResponse, batchesResponse, schoolsResponse] =
        await Promise.allSettled([
          api.studentComplaints.list(),
          api.batches.list(),
          profile?.role === "SEKOLAH"
            ? Promise.resolve({ schools: [] as SchoolAccount[] })
            : api.schoolAccounts.list(),
        ])

      if (complaintsResponse.status === "fulfilled") {
        setComplaints(
          setCachedPageData(
            pageCacheKeys.studentComplaints,
            complaintsResponse.value.data
          )
        )
      } else if (!usedCache) {
        throw complaintsResponse.reason
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

    const payload = {
      jumlahSiswa: Number(form.jumlahSiswa),
      gejala: form.gejala.trim(),
      waktuKejadian: form.waktuKejadian,
      tindakan: form.tindakan.trim(),
      ...(form.batchId ? { batchId: form.batchId } : {}),
    }

    if (
      !payload.jumlahSiswa ||
      payload.jumlahSiswa < 1 ||
      !payload.gejala ||
      !payload.waktuKejadian ||
      !payload.tindakan
    ) {
      setError("Semua field wajib diisi dengan benar.")
      setSubmitting(false)
      return
    }

    try {
      const response = await api.studentComplaints.create(payload)
      setComplaints((currentComplaints) =>
        setCachedPageData(pageCacheKeys.studentComplaints, [
          response.data,
          ...currentComplaints,
        ])
      )
      setCurrentPage(1)

      const dashboardCache = getCachedPageData<DashboardAnalytics>(
        pageCacheKeys.dashboardAnalytics
      )

      if (dashboardCache) {
        setCachedPageData(pageCacheKeys.dashboardAnalytics, {
          ...dashboardCache,
          totalStudentComplaints: dashboardCache.totalStudentComplaints + 1,
        })
      }

      setForm({
        ...initialForm,
        waktuKejadian: getCurrentDateTimeLocal(),
      })
      setSuccessMessage("Keluhan siswa berhasil disimpan.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setSubmitting(false)
    }
  }

  const isCreatePage = mode === "create"
  const showSchoolReporter = profile?.role !== "SEKOLAH"
  const pageTitle = isCreatePage ? "Buat Keluhan Siswa" : "Riwayat Keluhan"
  const reporterNameById = new Map(
    schools.flatMap((school) => [
      [school.id, school.account?.username ?? school.name] as const,
      ...(school.account?.id
        ? [[school.account.id, school.account.username] as const]
        : []),
    ])
  )

  function getReporterName(complaint: StudentComplaint) {
    return (
      reporterNameById.get(complaint.sekolahId) ??
      complaint.sekolahUsername ??
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
            {isCreatePage ? "Buat Keluhan Siswa" : "Riwayat Keluhan Siswa"}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {isCreatePage
              ? "Catat jumlah siswa terdampak, gejala, waktu kejadian, dan tindakan awal."
              : "Pantau keluhan siswa yang sudah tercatat untuk tindak lanjut."}
          </p>
        </div>
      </section>

      <section className="grid gap-6">
        {isCreatePage ? (
          <Card className="overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
            <CardHeader className="border-b border-[#edf0f4] px-5 py-4">
              <CardTitle className="text-base font-semibold text-[#111827]">
                Detail Keluhan
              </CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Isi jumlah siswa, waktu kejadian, gejala, dan tindakan awal.
              </p>
            </CardHeader>
            <CardContent className="p-5">
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                    Jumlah Siswa Terdampak
                    <input
                      className="h-11 rounded-xl border border-[#e3e7ef] bg-white px-3 text-sm font-medium shadow-xs outline-none focus-visible:border-[#0528f2] focus-visible:ring-2 focus-visible:ring-[#0528f2]/10"
                      type="number"
                      min={1}
                      value={form.jumlahSiswa}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          jumlahSiswa: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="grid gap-2 text-sm font-semibold text-[#111827]">
                    Waktu Kejadian
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 justify-start rounded-xl border-[#e3e7ef] px-3 text-left text-sm font-medium shadow-xs hover:bg-[#f8fafc]"
                        >
                          <CalendarIcon className="size-4 text-muted-foreground" />
                          <span>{formatDateTimeLabel(form.waktuKejadian)}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80 p-3">
                        <Calendar
                          selected={parseDateTimeLocal(form.waktuKejadian)}
                          onSelect={(date) =>
                            setForm((current) => ({
                              ...current,
                              waktuKejadian: updateDatePart(
                                current.waktuKejadian,
                                date
                              ),
                            }))
                          }
                        />
                        <label className="mt-3 grid gap-2 border-t pt-3 text-sm font-medium text-[#111827]">
                          <span className="inline-flex items-center gap-2">
                            <ClockIcon className="size-4 text-muted-foreground" />
                            Jam kejadian
                          </span>
                          <input
                            className="h-10 rounded-lg border border-[#e3e7ef] bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-[#0528f2] focus-visible:ring-2 focus-visible:ring-[#0528f2]/10"
                            type="time"
                            value={form.waktuKejadian.slice(11, 16)}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                waktuKejadian: updateTimePart(
                                  current.waktuKejadian,
                                  event.target.value
                                ),
                              }))
                            }
                          />
                        </label>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

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
                  Gejala yang Dirasakan
                  <textarea
                    className="min-h-24 rounded-xl border border-[#e3e7ef] bg-white px-3 py-3 text-sm shadow-xs outline-none focus-visible:border-[#0528f2] focus-visible:ring-2 focus-visible:ring-[#0528f2]/10"
                    placeholder="Contoh: Mual, sakit perut melilit, pusing kepala, muntah-muntah ringan."
                    value={form.gejala}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        gejala: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-[#111827]">
                  Tindakan Awal Medis
                  <textarea
                    className="min-h-24 rounded-xl border border-[#e3e7ef] bg-white px-3 py-3 text-sm shadow-xs outline-none focus-visible:border-[#0528f2] focus-visible:ring-2 focus-visible:ring-[#0528f2]/10"
                    placeholder="Contoh: Observasi di UKS sekolah, pemberian air kelapa/susu hangat, merujuk 3 siswa ke puskesmas terdekat."
                    value={form.tindakan}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tindakan: event.target.value,
                      }))
                    }
                  />
                </label>

                <Button
                  disabled={submitting}
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#0528f2] text-white shadow-xs transition-all hover:bg-[#0422c8] hover:shadow-md"
                >
                  {submitting
                    ? "Menyimpan Keluhan..."
                    : "Simpan Laporan Keluhan"}
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
                  Riwayat Keluhan
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Pantau laporan keluhan siswa untuk monitoring tindak lanjut
                  medis.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#4b5563]">
                {complaints.length} keluhan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[#edf0f4] bg-[#fcfcfd] text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-5 py-3 font-semibold">Waktu</th>
                    {showSchoolReporter ? (
                      <th className="px-5 py-3 font-semibold">
                        Sekolah Pelapor
                      </th>
                    ) : null}
                    <th className="w-28 px-5 py-3 font-semibold">Siswa</th>
                    <th className="px-5 py-3 font-semibold">Gejala</th>
                    <th className="px-5 py-3 font-semibold">Tindakan</th>
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
                            <Skeleton className="h-4 w-16" />
                          </td>
                          <td className="px-5 py-4">
                            <Skeleton className="h-4 w-56" />
                          </td>
                          <td className="px-5 py-4">
                            <Skeleton className="h-4 w-56" />
                          </td>
                        </tr>
                      ))
                    : null}

                  {!loading && complaints.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showSchoolReporter ? 5 : 4}
                        className="px-5 py-10 text-center text-muted-foreground"
                      >
                        Belum ada keluhan siswa yang tercatat.
                      </td>
                    </tr>
                  ) : null}

                  {!loading
                    ? paginatedComplaints.map((complaint) => (
                        <tr
                          key={complaint.id}
                          className="border-b border-[#edf0f4] last:border-0"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#111827]">
                              {new Date(
                                complaint.waktuKejadian
                              ).toLocaleDateString("id-ID")}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {new Date(
                                complaint.waktuKejadian
                              ).toLocaleTimeString("id-ID")}
                            </p>
                          </td>
                          {showSchoolReporter ? (
                            <td className="px-5 py-4">
                              <span className="font-medium">
                                {getReporterName(complaint)}
                              </span>
                            </td>
                          ) : null}
                          <td className="w-28 px-5 py-4">
                            <span className="inline-flex whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              {complaint.jumlahSiswa} siswa
                            </span>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">
                            <p className="line-clamp-2">{complaint.gejala}</p>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">
                            <p className="line-clamp-2">{complaint.tindakan}</p>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>

            {!loading && complaints.length > COMPLAINTS_PER_PAGE ? (
              <div className="flex items-center justify-center gap-2 border-t border-[#edf0f4] p-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                >
                  <ChevronLeftIcon />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const page = index + 1

                    return (
                      <button
                        key={page}
                        type="button"
                        className={
                          currentPage === page
                            ? "flex size-8 items-center justify-center rounded-lg bg-[#f3f4f6] text-sm font-semibold"
                            : "flex size-8 items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-[#f7f8fb]"
                        }
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </DashboardShell>
  )
}
