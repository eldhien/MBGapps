import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { CameraIcon, ImageUpIcon, StopCircleIcon } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import React, { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import jsQR from "jsqr"

function getBatchIdFromQr(rawValue: string) {
  const trimmedValue = rawValue.trim()

  try {
    const url = new URL(trimmedValue)
    const marker = "/batch-info/"
    const markerIndex = url.pathname.indexOf(marker)

    if (markerIndex >= 0) {
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    }
  } catch {
    // Raw QR content may already be the batch ID.
  }

  const marker = "/batch-info/"
  const markerIndex = trimmedValue.indexOf(marker)

  if (markerIndex >= 0) {
    return decodeURIComponent(trimmedValue.slice(markerIndex + marker.length))
  }

  return trimmedValue
}

async function createQrDetector() {
  const BarcodeDetector = (window as any).BarcodeDetector

  if (!BarcodeDetector) {
    throw new Error(
      "Browser belum mendukung scan QR otomatis. Coba Chrome/Edge terbaru atau upload gambar QR."
    )
  }

  return new BarcodeDetector({ formats: ["qr_code"] })
}

async function decodeQrFromImageFile(file: File) {
  const imageBitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = imageBitmap.width
  canvas.height = imageBitmap.height
  const context = canvas.getContext("2d")

  if (!context) {
    imageBitmap.close()
    throw new Error("Gambar QR tidak bisa diproses.")
  }

  context.drawImage(imageBitmap, 0, 0)
  imageBitmap.close()
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(imageData.data, imageData.width, imageData.height)

  return result?.data ?? null
}

export function BatchScanPage() {
  const params = useParams()
  const navigate = useNavigate()
  const id = params["*"] || params.id
  const [batch, setBatch] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [scannerMessage, setScannerMessage] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scanTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    api.productionBatches.get(id)
      .then(setBatch)
      .catch((err) => setError(err.message || "Gagal memuat detail batch"))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  function openBatchFromQr(rawValue: string) {
    const batchId = getBatchIdFromQr(rawValue)

    if (!batchId) {
      setError("QR tidak berisi ID batch yang valid.")
      return
    }

    stopCamera()
    navigate(`/batch-info/${encodeURIComponent(batchId)}`)
  }

  function stopCamera() {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsCameraActive(false)
  }

  async function startCamera() {
    setError(null)
    setScannerMessage(null)

    try {
      const detector = await createQrDetector()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsCameraActive(true)
      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current

        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return
        }

        try {
          const results = await detector.detect(video)
          const value = results?.[0]?.rawValue

          if (value) {
            openBatchFromQr(value)
          }
        } catch {
          // Keep scanning; intermittent detector errors happen while video warms up.
        }
      }, 500)
    } catch (err) {
      stopCamera()
      setError(
        err instanceof Error
          ? err.message
          : "Kamera tidak bisa dibuka untuk scan QR."
      )
    }
  }

  async function handleQrUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    setError(null)
    setScannerMessage("Membaca QR dari gambar...")

    try {
      const value = await decodeQrFromImageFile(file)

      if (!value) {
        setError("QR tidak ditemukan pada gambar yang diupload.")
        return
      }

      openBatchFromQr(value)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membaca QR dari gambar."
      )
    } finally {
      setScannerMessage(null)
      event.target.value = ""
    }
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-8">
        {error ? (
          <AlertToast
            title="Scan QR gagal"
            description={error}
            variant="destructive"
            onClose={() => setError(null)}
          />
        ) : null}
        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-primary/5 p-6">
            <h1 className="text-2xl font-bold tracking-tight">Scan QR Batch</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Scan QR lewat kamera atau upload gambar QR dari perangkat.
            </p>
          </div>
          <div className="grid gap-4 p-6">
            <div className="overflow-hidden rounded-xl border bg-black">
              <video
                ref={videoRef}
                className="aspect-video w-full object-cover"
                muted
                playsInline
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={isCameraActive ? stopCamera : startCamera}
              >
                {isCameraActive ? <StopCircleIcon /> : <CameraIcon />}
                {isCameraActive ? "Stop Kamera" : "Scan via Kamera"}
              </Button>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
                <ImageUpIcon className="mr-2 h-4 w-4" />
                Upload QR
                <Input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleQrUpload}
                />
              </label>
            </div>
            {scannerMessage ? (
              <p className="text-sm text-muted-foreground">{scannerMessage}</p>
            ) : null}
            <p className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              Jika kamera tidak muncul, pastikan izin kamera browser sudah diaktifkan.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Memuat...</div>
  }

  if (error || !batch) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Error</h1>
        <p className="mt-2 text-muted-foreground">{error || "Batch tidak ditemukan"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-primary/5 p-6 text-center flex flex-col items-center">
          <div className="mb-4 rounded-xl bg-white p-4 shadow-sm inline-block">
            <QRCodeSVG value={`${window.location.origin}/batch-info/${batch.id}`} size={160} level="H" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{batch.id}</h1>
          <p className="text-muted-foreground">Detail Batch Produksi</p>
          <div className="mt-4 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Status: {batch.status}
          </div>
        </div>

        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-muted-foreground">Informasi Umum</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Menu</dt>
                  <dd className="font-medium">{batch.menu?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Kategori</dt>
                  <dd className="font-medium">{batch.menu?.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Total Porsi</dt>
                  <dd className="font-medium">{batch.totalPorsi}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Waktu Produksi</dt>
                  <dd className="font-medium">
                    {new Date(batch.createdAt).toLocaleString("id-ID")}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-semibold text-muted-foreground">Petugas & Pengiriman</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Petugas Dapur</dt>
                  <dd className="font-medium">{batch.petugas?.username || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Driver</dt>
                  <dd className="font-medium">{batch.driver?.name || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>No Kendaraan</dt>
                  <dd className="font-medium">{batch.noKendaraan || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Jam Berangkat</dt>
                  <dd className="font-medium">
                    {batch.jamKeberangkatan ? new Date(batch.jamKeberangkatan).toLocaleString("id-ID") : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="mb-4 font-semibold text-muted-foreground">Ringkasan Kandungan Gizi & Komposisi (Per Nampan)</h3>
            <div className="space-y-6">
              {batch.varian?.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Tidak ada data komposisi.</p>
              )}
              {batch.varian?.map((v: any, vIdx: number) => {
                const totalBiaya = v.bahan?.reduce((acc: number, b: any) => acc + Number(b.harga || 0), 0) || 0
                const groupedBahan = {
                  MAKANAN_POKOK: v.bahan?.filter((b: any) => b.kategori === "MAKANAN_POKOK") || [],
                  LAUK_PAUK: v.bahan?.filter((b: any) => b.kategori === "LAUK_PAUK") || [],
                  SAYUR: v.bahan?.filter((b: any) => b.kategori === "SAYUR") || [],
                  BUAH: v.bahan?.filter((b: any) => b.kategori === "BUAH") || [],
                  SUSU: v.bahan?.filter((b: any) => b.kategori === "SUSU") || [],
                  LAINNYA: v.bahan?.filter((b: any) => !b.kategori) || []
                }
                const kategoriLabels = [
                  { id: "MAKANAN_POKOK", label: "Makanan Pokok" },
                  { id: "LAUK_PAUK", label: "Lauk Pauk" },
                  { id: "SAYUR", label: "Sayur-sayuran" },
                  { id: "BUAH", label: "Buah-buahan" },
                  { id: "SUSU", label: "Susu" },
                  { id: "LAINNYA", label: "Bahan Lainnya" }
                ]

                return (
                  <div key={vIdx} className="overflow-hidden rounded-xl border bg-muted/5">
                    <div className="border-b bg-muted/20 px-4 py-3 flex justify-between items-center">
                      <h4 className="font-semibold text-sm">{v.namaVarian || "Varian"}</h4>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {v.jumlahPorsi} Porsi
                      </span>
                    </div>
                    <div className="p-5">
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Daftar Bahan</h5>
                      <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground bg-muted/20">
                              <th className="px-4 py-3 font-medium">Bahan & Kategori</th>
                              <th className="px-4 py-3 text-right font-medium">Jumlah / Berat</th>
                              <th className="px-4 py-3 text-right font-medium">Harga</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {kategoriLabels.map(kat => {
                              const bahanList = groupedBahan[kat.id as keyof typeof groupedBahan]
                              if (bahanList.length === 0) return null
                              return (
                                <React.Fragment key={kat.id}>
                                  <tr className="bg-muted/5">
                                    <td colSpan={3} className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase">
                                      {kat.label}
                                    </td>
                                  </tr>
                                  {bahanList.map((b: any, bIdx: number) => (
                                    <tr key={`${kat.id}-${bIdx}`} className="hover:bg-muted/5 transition-colors">
                                      <td className="px-4 py-2.5 font-medium">{b.namaBahan}</td>
                                      <td className="px-4 py-2.5 text-right text-muted-foreground">{b.jumlah ? `${b.jumlah} ` : ""}{b.satuan}</td>
                                      <td className="px-4 py-2.5 text-right font-medium">Rp {(b.harga || 0).toLocaleString("id-ID")}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              )
                            })}
                            {v.bahan?.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">Belum ada bahan</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-primary/5 border-t">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-right font-semibold text-muted-foreground">Total Biaya Komposisi:</td>
                              <td className="px-4 py-3 text-right font-bold text-primary text-base">Rp {totalBiaya.toLocaleString("id-ID")}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {batch.foto && batch.foto.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 font-semibold text-muted-foreground">Dokumentasi</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {batch.foto.map((f: any, i: number) => (
                  <div key={i} className="overflow-hidden rounded-lg border">
                    <img src={f.url} alt={f.jenis} className="aspect-video w-full object-cover" />
                    <div className="bg-muted p-2 text-center text-xs font-medium">
                      {f.jenis === "PROSES_MASAK" ? "Proses Masak" : "Makanan Jadi"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
