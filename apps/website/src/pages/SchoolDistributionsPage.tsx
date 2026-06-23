import { useEffect, useState } from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { AlertToast } from "@/components/ui/alert-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type SchoolDistribution } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"

export function SchoolDistributionsPage() {
  const cachedDistributions = getCachedPageData<SchoolDistribution[]>(
    pageCacheKeys.schoolDistributions
  )
  const [distributions, setDistributions] = useState<SchoolDistribution[]>(
    () => cachedDistributions ?? []
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!cachedDistributions)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [confirmTarget, setConfirmTarget] = useState<{
    distribution: SchoolDistribution
    status: "DITERIMA" | "DITOLAK"
  } | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadData() {
    if (cachedDistributions) {
      setDistributions(cachedDistributions)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.schoolDistributions.list()
      setDistributions(
        setCachedPageData(
          pageCacheKeys.schoolDistributions,
          response.distributions
        )
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal memuat distribusi."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    return subscribePageCache<SchoolDistribution[]>(
      pageCacheKeys.schoolDistributions,
      (cachedData) => {
        if (cachedData) {
          setDistributions(cachedData)
          setIsLoading(false)
        }
      }
    )
  }, [])

  function downloadQr(distribution: SchoolDistribution) {
    const svg = document.getElementById(`qr-${distribution.id}`)

    if (!(svg instanceof SVGElement)) {
      setError("QR belum siap untuk diunduh.")
      return
    }

    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    const source = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)
    const image = new Image()

    image.onload = () => {
      const padding = 24
      const size = Math.max(image.width, image.height) + padding * 2
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext("2d")

      if (!context) {
        URL.revokeObjectURL(svgUrl)
        setError("QR gagal dikonversi ke PNG.")
        return
      }

      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, size, size)
      context.drawImage(image, padding, padding)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(svgUrl)

        if (!blob) {
          setError("QR gagal dikonversi ke PNG.")
          return
        }

        const pngUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = pngUrl
        link.download = `QR-${distribution.batch.id}.png`
        link.click()
        URL.revokeObjectURL(pngUrl)
      }, "image/png")
    }

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      setError("QR gagal dikonversi ke PNG.")
    }

    image.src = svgUrl
  }

  async function updateStatus(
    distribution: SchoolDistribution,
    status: "DITERIMA" | "DITOLAK",
    note?: string
  ) {
    setError(null)
    setSuccess(null)

    if (status === "DITOLAK" && !note?.trim()) {
      setError("Catatan wajib diisi jika makanan ditolak.")
      return
    }

    try {
      const response = await api.schoolDistributions.updateStatus(
        distribution.id,
        {
          status,
          ...(note?.trim() ? { rejectedReason: note.trim() } : {}),
        }
      )

      setDistributions((current) =>
        setCachedPageData(
          pageCacheKeys.schoolDistributions,
          current.map((item) =>
            item.id === response.distribution.id ? response.distribution : item
          )
        )
      )
      setNotes((current) => ({ ...current, [distribution.id]: "" }))
      setSuccess(
        status === "DITERIMA"
          ? "Penerimaan makanan berhasil diselesaikan."
          : "Penerimaan makanan berhasil ditolak."
      )
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Gagal memperbarui status."
      )
    }
  }

  function openStatusConfirmation(
    distribution: SchoolDistribution,
    status: "DITERIMA" | "DITOLAK"
  ) {
    const note = notes[distribution.id]

    if (status === "DITOLAK" && !note?.trim()) {
      setError("Catatan wajib diisi jika makanan ditolak.")
      return
    }

    setConfirmTarget({ distribution, status })
  }

  async function confirmStatusUpdate() {
    if (!confirmTarget) return

    await updateStatus(
      confirmTarget.distribution,
      confirmTarget.status,
      notes[confirmTarget.distribution.id]
    )
    setConfirmTarget(null)
  }

  return (
    <DashboardShell title="Validasi Penerimaan">
      {success ? (
        <AlertToast
          title="Berhasil"
          description={success}
          onClose={() => setSuccess(null)}
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
            Sekolah
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Validasi Penerimaan
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Validasi penerimaan makanan manual. Isi catatan bila diperlukan, lalu pilih Selesai atau Ditolak.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="border-b p-4">
          <h1 className="text-lg font-semibold">Makanan Masuk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Batch makanan yang dikirim SPPG akan tampil di sini untuk divalidasi.
          </p>
        </div>

        <div className="grid gap-4 p-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-3 h-4 w-64" />
                  <Skeleton className="mt-4 h-24 w-24" />
                </div>
              ))
            : null}

          {distributions.map((distribution) => {
            const qrUrl = `${window.location.origin}/batch-info/${distribution.batch.id}`
            const isFinal =
              distribution.status === "DITERIMA" ||
              distribution.status === "DITOLAK"

            return (
              <article
                key={distribution.id}
                className="grid gap-4 rounded-lg border p-4 md:grid-cols-[140px_1fr_auto]"
              >
                <div className="grid w-fit gap-2">
                <div className="w-fit rounded-lg border bg-white p-2">
                  <QRCodeSVG id={`qr-${distribution.id}`} value={qrUrl} size={112} />
                </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQr(distribution)}
                  >
                    Unduh QR
                  </Button>
                </div>
                <div>
                  <h2 className="font-semibold">{distribution.batch.id}</h2>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Menu</dt>
                      <dd className="font-medium">
                        {distribution.batch.menu?.name ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Porsi</dt>
                      <dd className="font-medium">
                        {distribution.jumlahPorsi.toLocaleString("id-ID")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Waktu kirim</dt>
                      <dd className="font-medium">
                        {distribution.distribution.waktuKirim
                          ? new Date(
                              distribution.distribution.waktuKirim
                            ).toLocaleString("id-ID")
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status penerimaan</dt>
                      <dd className="font-medium">{distribution.status}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status batch</dt>
                      <dd className="font-medium">
                        {distribution.batch.status ?? "-"}
                      </dd>
                    </div>
                  </dl>
                  {distribution.rejectedReason ? (
                    <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      Catatan ditolak: {distribution.rejectedReason}
                    </p>
                  ) : null}
                  {!isFinal ? (
                    <label className="mt-4 grid gap-2 text-sm font-medium">
                      Catatan
                      <textarea
                        value={notes[distribution.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [distribution.id]: event.target.value,
                          }))
                        }
                        className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        placeholder="Contoh: kondisi makanan baik, jumlah sesuai, atau alasan penolakan."
                      />
                    </label>
                  ) : null}
                </div>
                <div className="flex gap-2 md:flex-col">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isFinal}
                    onClick={() =>
                      openStatusConfirmation(
                        distribution,
                        "DITERIMA"
                      )
                    }
                  >
                    <CheckIcon />
                    Selesai
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isFinal}
                    onClick={() =>
                      openStatusConfirmation(
                        distribution,
                        "DITOLAK"
                      )
                    }
                  >
                    <XIcon />
                    Ditolak
                  </Button>
                </div>
              </article>
            )
          })}

          {!isLoading && distributions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Belum ada makanan masuk untuk divalidasi.
            </div>
          ) : null}
        </div>
      </section>

      <AlertDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              {confirmTarget?.status === "DITERIMA" ? <CheckIcon /> : <XIcon />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {confirmTarget?.status === "DITERIMA"
                ? "Selesaikan penerimaan?"
                : "Tolak penerimaan?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.status === "DITERIMA"
                ? `Batch ${confirmTarget.distribution.batch.id} akan ditandai diterima.`
                : `Batch ${confirmTarget?.distribution.batch.id} akan ditandai ditolak dengan catatan yang sudah diisi.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmTarget?.status === "DITOLAK" ? "destructive" : "default"}
              onClick={(event) => {
                event.preventDefault()
                void confirmStatusUpdate()
              }}
            >
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
