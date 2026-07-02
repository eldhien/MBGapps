import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/services/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
} from "@/lib/page-cache"
import { dateTimeLocalToISOString } from "@/lib/production"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { CheckCircle2Icon, ImageIcon, PlusIcon, Trash2Icon } from "lucide-react"
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
        waktuMulai: dateTimeLocalToISOString(form.waktuMulai),
        waktuSelesai: dateTimeLocalToISOString(form.waktuSelesai),
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

      const cachedBatches = getCachedPageData<unknown[]>(
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat batch")
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

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden"
      >
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Tambahkan Batch Baru
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Isi detail produksi, unggah foto makanan, lalu simpan batch.
            </p>
          </div>
        </div>

        <div className="grid w-full max-w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <section className="grid w-full min-w-0 gap-4 md:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-medium">
                Nama Menu
                <Input
                  required
                  placeholder="Contoh: Nasi ayam sayur"
                  value={form.namaMenu}
                  className="h-11 rounded-xl border-[#e3e7ef] bg-white"
                  onChange={(event) =>
                    setForm({ ...form, namaMenu: event.target.value })
                  }
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
                Jumlah Porsi
                <Input
                  required
                  type="number"
                  inputMode="numeric"
                  step="1"
                  placeholder="Contoh: 500"
                  value={form.jumlahPorsi}
                  className="h-11 rounded-xl border-[#e3e7ef] bg-white"
                  onChange={(event) =>
                    setForm({ ...form, jumlahPorsi: event.target.value })
                  }
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
                Waktu Mulai Produksi
                <Input
                  required
                  type="datetime-local"
                  value={form.waktuMulai}
                  className="h-11 rounded-xl border-[#e3e7ef] bg-white"
                  onChange={(event) =>
                    setForm({ ...form, waktuMulai: event.target.value })
                  }
                />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-medium">
                Waktu Selesai Produksi
                <Input
                  required
                  type="datetime-local"
                  value={form.waktuSelesai}
                  className="h-11 rounded-xl border-[#e3e7ef] bg-white"
                  onChange={(event) =>
                    setForm({ ...form, waktuSelesai: event.target.value })
                  }
                />
              </label>
            </section>

            <section className="min-w-0 rounded-2xl bg-[#fbfcff] p-4 ring-1 ring-[#eef1f6]">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Komposisi Makanan</h2>
                  <p className="text-sm text-muted-foreground">
                    Masukkan bahan utama yang dipakai pada menu.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-[#e3e7ef] bg-white"
                  onClick={() =>
                    setKomposisi([...komposisi, createEmptyKomposisi()])
                  }
                >
                  <PlusIcon />
                  Tambah
                </Button>
              </div>

              <div className="grid gap-3">
                {komposisi.map((item, index) => (
                  <div key={index} className="flex min-w-0 gap-2">
                    <Input
                      required
                      placeholder="Contoh: Nasi, ayam, sayur bayam"
                      value={item.namaBahan}
                      className="h-11 min-w-0 rounded-xl border-[#e3e7ef] bg-white"
                      onChange={(event) => {
                        const nextKomposisi = [...komposisi]
                        nextKomposisi[index] = {
                          namaBahan: event.target.value,
                        }
                        setKomposisi(nextKomposisi)
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={komposisi.length === 1}
                      className="size-11 shrink-0 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() =>
                        setKomposisi(
                          komposisi.filter(
                            (_, itemIndex) => itemIndex !== index
                          )
                        )
                      }
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 lg:grid-cols-1">
            <section className="min-w-0 rounded-2xl bg-[#fbfcff] p-4 ring-1 ring-[#eef1f6]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#0528f2]">
                  <ImageIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">Foto Makanan</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload foto makanan jadi.
                  </p>
                </div>
              </div>

              <label className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d8deea] bg-white px-4 py-5 text-center transition hover:border-[#0528f2] hover:bg-[#f7f9ff]">
                <Input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    setFotoMakanan(event.target.files?.[0] || null)
                  }
                />
                {fotoMakanan ? (
                  <>
                    <CheckCircle2Icon className="mb-2 size-7 text-[#0528f2]" />
                    <span className="max-w-full truncate text-sm font-semibold">
                      {fotoMakanan.name}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Klik untuk ganti
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="mb-2 size-7 text-muted-foreground" />
                    <span className="text-sm font-semibold">Pilih foto</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG, atau WEBP
                    </span>
                  </>
                )}
              </label>
            </section>

            <section className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-[#eef1f6]">
              <h2 className="font-semibold">Ringkasan</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Menu</dt>
                  <dd className="max-w-40 min-w-0 truncate font-semibold">
                    {form.namaMenu || "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Porsi</dt>
                  <dd className="font-semibold">{form.jumlahPorsi || "0"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Komposisi</dt>
                  <dd className="font-semibold">{cleanedKomposisi.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Foto</dt>
                  <dd className="font-semibold">
                    {fotoMakanan ? "Siap" : "Belum"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 cursor-pointer rounded-xl border-[#e3e7ef]"
            onClick={() => navigate("/batch")}
          >
            Batal
          </Button>
          <Button
            type="submit"
            pending={isLoading}
            disabled={isLoading}
            className="h-10 cursor-pointer rounded-xl bg-[#0528f2] px-4 text-white hover:bg-[#0528f2]"
          >
            {isLoading ? "Menyimpan..." : "Simpan Batch"}
          </Button>
        </div>
      </form>
    </DashboardShell>
  )
}
