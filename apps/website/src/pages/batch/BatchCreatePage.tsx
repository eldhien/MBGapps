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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (isLoading) {
      return
    }

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

      const uploadedPhoto = await api.productionBatches.uploadPhoto(
        result.id,
        fotoMakanan,
        "MAKANAN_JADI"
      )
      const createdBatch = {
        ...result,
        foto: [...(result.foto ?? []), uploadedPhoto],
      }

      const cachedBatches = getCachedPageData<any[]>(
        pageCacheKeys.productionBatches
      )
      if (cachedBatches) {
        setCachedPageData(pageCacheKeys.productionBatches, [
          createdBatch,
          ...cachedBatches,
        ])
      }

      navigate("/batch", {
        state: { success: "Batch berhasil disimpan." },
      })
    } catch (err: any) {
      setError(err.message || "Gagal membuat batch")
    } finally {
      setIsLoading(false)
    }
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
              type="number"
              inputMode="numeric"
              step="1"
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
          <Button type="submit" pending={isLoading} disabled={isLoading}>
            {isLoading ? "Menyimpan..." : "Simpan Batch"}
          </Button>
        </div>
      </form>
    </DashboardShell>
  )
}
