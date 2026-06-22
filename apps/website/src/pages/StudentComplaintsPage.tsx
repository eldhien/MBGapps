import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { BatchSummary, StudentComplaint } from "@/lib/api"
import { api } from "@/lib/api"
import { DashboardShell } from "@/pages/components/DashboardShell"
import {
  ActivityIcon,
  ClipboardIcon,
  SchoolIcon,
  UsersRoundIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent } from "react"

function getCurrentDateTimeLocal() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}

const initialForm = {
  batchId: "",
  gejala: "",
  jumlahSiswa: "1",
  tindakan: "",
  waktuKejadian: getCurrentDateTimeLocal(),
}

export function StudentComplaintsPage() {
  const [complaints, setComplaints] = useState<StudentComplaint[]>([])
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [complaintsResponse, batchesResponse] = await Promise.allSettled([
        api.studentComplaints.list(),
        api.batches.list(),
      ])

      if (complaintsResponse.status === "fulfilled") {
        setComplaints(complaintsResponse.value.data)
      } else {
        throw complaintsResponse.reason
      }

      if (batchesResponse.status === "fulfilled") {
        setBatches(batchesResponse.value.data)
      } else {
        setBatches([])
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
      await api.studentComplaints.create(payload)
      setForm({
        ...initialForm,
        waktuKejadian: getCurrentDateTimeLocal(),
      })
      setSuccessMessage("Keluhan siswa berhasil disimpan.")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setSubmitting(false)
    }
  }

  const summary = useMemo(() => {
    const totalAffectedStudents = complaints.reduce(
      (total, item) => total + item.jumlahSiswa,
      0
    )

    return {
      latest:
        complaints[0]?.waktuKejadian
          ? new Date(complaints[0].waktuKejadian).toLocaleString("id-ID")
          : "Belum ada keluhan",
      totalAffectedStudents,
      totalCases: complaints.length,
    }
  }, [complaints])

  return (
    <DashboardShell title="Keluhan Siswa">
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

      <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/60 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] relative z-1">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <SchoolIcon className="size-4 text-rose-500 animate-pulse" />
              Pelaporan Keluhan Siswa Pascakonsumsi
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Simpan Kejadian Siswa Terdampak secara Terpusat
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Gunakan formulir untuk mencatat jumlah siswa terdampak, gejala fisik, waktu mulai dirasakan,
                serta tindakan medis awal agar koordinasi dengan puskesmas/SPPG berjalan cepat.
              </p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2">
            {[
              {
                icon: ClipboardIcon,
                label: "Total Laporan",
                value: summary.totalCases,
                color: "text-blue-500 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20",
              },
              {
                icon: UsersRoundIcon,
                label: "Siswa Terdampak",
                value: summary.totalAffectedStudents,
                color: "text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20",
              },
              {
                icon: ActivityIcon,
                label: "Update Terakhir",
                value: loading ? "..." : summary.latest,
                color: "text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20",
              },
              {
                icon: SchoolIcon,
                label: "Fokus Penanganan",
                value: "Respon Cepat",
                color: "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20",
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div key={item.label} className="rounded-2xl border bg-background/80 p-4 hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className={`p-1 rounded-md ${item.color}`}>
                      <Icon className="size-3.5" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold truncate leading-none">{item.value}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
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

                <label className="grid gap-2 text-sm font-semibold">
                  Waktu Kejadian
                  <input
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    type="datetime-local"
                    value={form.waktuKejadian}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        waktuKejadian: event.target.value,
                      }))
                    }
                  />
                </label>
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
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchIdUnik} · {batch.namaMenu}
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

        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Riwayat Keluhan</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pantau laporan keluhan siswa yang terdata di sekolah ini untuk monitoring tindak lanjut medis.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border p-5 space-y-3">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-3/4" />
                  </div>
                ))
              : null}

            {!loading && complaints.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Belum ada keluhan siswa yang tercatat.
              </div>
            ) : null}

            {!loading
              ? complaints.map((complaint) => (
                  <article key={complaint.id} className="rounded-2xl border bg-card p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 size-10 flex items-center justify-center border border-rose-500/20 font-bold text-sm shrink-0">
                          {complaint.jumlahSiswa}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm leading-none text-foreground">Siswa Terdampak</h3>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {new Date(complaint.waktuKejadian).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground border">
                        Batch: {complaint.batchId ? "Tersambung" : "Belum dipilih"}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Gejala
                        </p>
                        <p className="leading-relaxed text-muted-foreground">
                          {complaint.gejala}
                        </p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Tindakan Awal
                        </p>
                        <p className="leading-relaxed text-muted-foreground">
                          {complaint.tindakan}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              : null}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  )
}
