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
  SchoolDistribution,
  StudentComplaint,
} from "@/lib/api"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { CalendarIcon, ClockIcon } from "lucide-react"
import { useCallback, useEffect, useState, type FormEvent } from "react"

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

function mapSchoolDistributionsToBatches(
  distributions: SchoolDistribution[]
): BatchSummary[] {
  const batchById = new Map<string, BatchSummary>()

  distributions.forEach((item) => {
    if (!batchById.has(item.batch.id)) {
      batchById.set(item.batch.id, {
        id: item.batch.id,
        batchIdUnik: item.batch.id,
        jumlahPorsi: item.jumlahPorsi,
        namaMenu: item.batch.menu?.name ?? "Menu tidak diketahui",
        status: item.status,
        waktuProduksi:
          item.batch.createdAt ??
          item.distribution.waktuKirim ??
          new Date().toISOString(),
      })
    }
  })

  return Array.from(batchById.values())
}

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
  const [schools, setSchools] = useState<SchoolAccount[]>(() =>
    getCachedPageData<SchoolAccount[]>(pageCacheKeys.schoolAccounts) ?? []
  )
  const [loading, setLoading] = useState(!cachedComplaints)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)
  const selectableBatches = batches

  const loadData = useCallback(async (force = false) => {
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
      const [complaintsResponse, batchesResponse, schoolsResponse] = await Promise.allSettled([
        api.studentComplaints.list(),
        profile?.role === "SEKOLAH"
          ? api.schoolDistributions.list().then((response) => ({
              data: mapSchoolDistributionsToBatches(response.distributions),
            })).catch(() => api.batches.list())
          : api.batches.list(),
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

      if (schoolsResponse.status === "fulfilled" && schoolsResponse.value.schools.length) {
        setSchools(
          setCachedPageData(pageCacheKeys.schoolAccounts, schoolsResponse.value.schools)
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

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
  const historyGridClass = showSchoolReporter
    ? "md:grid-cols-[0.9fr_0.8fr_0.55fr_1.2fr_1.2fr_0.7fr]"
    : "md:grid-cols-[0.9fr_0.55fr_1.2fr_1.2fr_0.7fr]"
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
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Keluhan siswa
          </p>
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
        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Laporkan Keluhan Siswa</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Formulir pelaporan dampak pascakonsumsi untuk melacak penanganan dan mitigasi risiko.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Jumlah Siswa Terdampak
                  <input
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 font-medium"
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

                <div className="grid gap-2 text-sm font-semibold">
                  Waktu Kejadian
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 justify-start rounded-xl px-3 text-left text-sm font-medium shadow-xs"
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
                      <label className="mt-3 grid gap-2 border-t pt-3 text-sm font-medium">
                        <span className="inline-flex items-center gap-2">
                          <ClockIcon className="size-4 text-muted-foreground" />
                          Jam kejadian
                        </span>
                        <input
                          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

              <label className="grid gap-2 text-sm font-semibold">
                Batch Terkait
                <select
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                      {batch.batchIdUnik} - {batch.namaMenu} ({batch.status})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Gejala yang Dirasakan
                <textarea
                  className="min-h-24 rounded-xl border border-input bg-background px-3 py-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

              <label className="grid gap-2 text-sm font-semibold">
                Tindakan Awal Medis
                <textarea
                  className="min-h-24 rounded-xl border border-input bg-background px-3 py-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

              <Button disabled={submitting} type="submit" className="w-full h-11 rounded-xl shadow-xs hover:shadow-md transition-all">
                {submitting ? "Menyimpan Keluhan..." : "Simpan Laporan Keluhan"}
              </Button>
            </form>
          </CardContent>
        </Card>
        ) : null}

        {!isCreatePage ? (
        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Riwayat Keluhan</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pantau laporan keluhan siswa yang terdata di sekolah ini untuk monitoring tindak lanjut medis.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {loading ? (
              <div className="overflow-hidden rounded-xl border">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className={`grid gap-3 border-b p-4 last:border-0 ${historyGridClass}`}
                  >
                    <Skeleton className="h-5 w-32" />
                    {showSchoolReporter ? <Skeleton className="h-5 w-32" /> : null}
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && complaints.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Belum ada keluhan siswa yang tercatat.
              </div>
            ) : null}

            {!loading && complaints.length > 0 ? (
              <div className="overflow-hidden rounded-xl border">
                <div className={`hidden gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground md:grid ${historyGridClass}`}>
                  <span>Waktu</span>
                  {showSchoolReporter ? <span>Sekolah Pelapor</span> : null}
                  <span>Siswa</span>
                  <span>Gejala</span>
                  <span>Tindakan</span>
                  <span>Batch</span>
                </div>
                {complaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className={`grid gap-3 border-b p-4 last:border-0 md:items-center ${historyGridClass}`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(complaint.waktuKejadian).toLocaleDateString(
                          "id-ID"
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(complaint.waktuKejadian).toLocaleTimeString(
                          "id-ID"
                        )}
                      </p>
                    </div>
                    {showSchoolReporter ? (
                      <span className="text-sm font-medium">
                        {getReporterName(complaint)}
                      </span>
                    ) : null}
                    <span className="inline-flex w-fit rounded-full border bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      {complaint.jumlahSiswa}
                    </span>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {complaint.gejala}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {complaint.tindakan}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      {complaint.batchId ? "Ada" : "-"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
        ) : null}
      </section>
    </DashboardShell>
  )
}
