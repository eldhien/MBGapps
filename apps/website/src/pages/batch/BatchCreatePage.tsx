import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

type KomposisiItem = {
  namaBahan: string
}

const createEmptyKomposisi = (): KomposisiItem => ({ namaBahan: "" })

export function BatchCreatePage() {
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [createdBatch, setCreatedBatch] = useState<any>(null)
  const [fotoMakanan, setFotoMakanan] = useState<File | null>(null)
  const [komposisi, setKomposisi] = useState<KomposisiItem[]>([
    createEmptyKomposisi(),
  ])
  const [form, setForm] = useState({
    jumlahPorsi: "",
    namaMenu: "",
    waktuMulai: "",
    waktuSelesai: "",
  })

  const cleanedKomposisi = useMemo(
    () =>
      komposisi
        .map((item) => item.namaBahan.trim())
        .filter((namaBahan) => namaBahan.length > 0),
    [komposisi]
  )

  const resetForm = () => {
    setCreatedBatch(null)
    setFotoMakanan(null)
    setKomposisi([createEmptyKomposisi()])
    setForm({
      jumlahPorsi: "",
      namaMenu: "",
      waktuMulai: "",
      waktuSelesai: "",
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (cleanedKomposisi.length === 0) {
      setError("Minimal isi 1 komposisi makanan")
      return
    }

    if (!fotoMakanan) {
      setError("Foto makanan wajib diunggah")
      return
    }

    setIsLoading(true)

    try {
      const totalPorsi = Number(form.jumlahPorsi)
      const result = await api.productionBatches.create({
        namaMenu: form.namaMenu.trim(),
        totalPorsi,
        waktuMulai: form.waktuMulai || undefined,
        waktuSelesai: form.waktuSelesai || undefined,
        varian: [
          {
            namaVarian: "Utama",
            jumlahPorsi: totalPorsi,
            bahan: cleanedKomposisi.map((namaBahan) => ({
              harga: 0,
              jumlah: 0,
              kategori: null,
              namaBahan,
              satuan: "item",
            })),
          },
        ],
      })

      await api.productionBatches.uploadPhoto(
        result.id,
        fotoMakanan,
        "MAKANAN_JADI"
      )

      const cachedBatches = getCachedPageData<any[]>(
        pageCacheKeys.productionBatches
      )
      if (cachedBatches) {
        setCachedPageData(pageCacheKeys.productionBatches, [
          result,
          ...cachedBatches,
        ])
      }

      setCreatedBatch(result)
    } catch (err: any) {
      setError(err.message || "Gagal membuat batch")
    } finally {
      setIsLoading(false)
    }
  }

  if (createdBatch) {
    const qrUrl = `${window.location.origin}/batch-info/${createdBatch.id}`

    return (
      <DashboardShell title="Batch Berhasil Dibuat">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-primary/5 p-6 text-center">
            <h2 className="mb-2 text-2xl font-bold">{createdBatch.id}</h2>
            <p className="text-muted-foreground">
              Batch berhasil disimpan dan QR Code sudah dibuat.
            </p>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-muted-foreground">
                Informasi Batch
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Nama Menu</dt>
                  <dd className="font-medium">
                    {createdBatch.menu?.name || form.namaMenu}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Jumlah Porsi</dt>
                  <dd className="font-medium">{createdBatch.totalPorsi}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Waktu Produksi</dt>
                  <dd className="font-medium text-right">
                    {form.waktuMulai || "-"} sampai {form.waktuSelesai || "-"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col items-center justify-center border-l pl-6">
              <p className="mb-3 text-sm font-medium">QR Code Batch</p>
              <div className="rounded-xl border bg-white p-3 shadow-sm">
                <QRCodeSVG value={qrUrl} size={150} />
              </div>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => window.open(qrUrl, "_blank")}
              >
                Buka Halaman Scan
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t p-6">
            <Button variant="outline" onClick={() => navigate("/batch")}>
              Kembali ke Daftar
            </Button>
            <Button onClick={resetForm}>Buat Batch Baru</Button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell title="Buat Batch Produksi">
      {error && (
        <AlertToast
          title="Terjadi kesalahan"
          description={error}
          variant="destructive"
          onClose={() => setError(null)}
        />
      )}

      <section className="pb-1">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Produksi makanan
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Upload Batch
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Buat batch produksi baru dengan nama menu, porsi, komposisi, waktu produksi, dan foto makanan.
          </p>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-xl border bg-card p-6"
      >
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nama Menu</label>
            <Input
              required
              placeholder="Contoh: Nasi ayam sayur"
              value={form.namaMenu}
              onChange={(event) =>
                setForm({ ...form, namaMenu: event.target.value })
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Jumlah Porsi
            </label>
            <Input
              required
              min={1}
              type="number"
              placeholder="Contoh: 500"
              value={form.jumlahPorsi}
              onChange={(event) =>
                setForm({ ...form, jumlahPorsi: event.target.value })
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Waktu Mulai Produksi
            </label>
            <Input
              required
              type="datetime-local"
              value={form.waktuMulai}
              onChange={(event) =>
                setForm({ ...form, waktuMulai: event.target.value })
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Waktu Selesai Produksi
            </label>
            <Input
              required
              type="datetime-local"
              value={form.waktuSelesai}
              onChange={(event) =>
                setForm({ ...form, waktuSelesai: event.target.value })
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Foto Makanan
            </label>
            <Input
              required
              type="file"
              accept="image/*"
              onChange={(event) =>
                setFotoMakanan(event.target.files?.[0] || null)
              }
            />
          </div>
        </section>

        <section className="border-t pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Komposisi Makanan</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setKomposisi([...komposisi, createEmptyKomposisi()])}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Komposisi
            </Button>
          </div>

          <div className="space-y-3">
            {komposisi.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  required
                  placeholder="Contoh: Nasi, ayam, sayur bayam"
                  value={item.namaBahan}
                  onChange={(event) => {
                    const nextKomposisi = [...komposisi]
                    nextKomposisi[index] = { namaBahan: event.target.value }
                    setKomposisi(nextKomposisi)
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={komposisi.length === 1}
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    setKomposisi(
                      komposisi.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-4 border-t pt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/batch")}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Simpan Batch & Generate QR"}
          </Button>
        </div>
      </form>
    </DashboardShell>
  )
}
