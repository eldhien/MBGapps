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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { EyeIcon, PencilIcon, PlusIcon, Trash2Icon, TruckIcon, TriangleAlertIcon } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

type KomposisiItem = {
  namaBahan: string
}

const createEmptyKomposisi = (): KomposisiItem => ({ namaBahan: "" })

function toDateTimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function getBatchFoodPhotos(batch: any) {
  return [...(batch?.foto ?? [])]
    .filter((item: any) => !item.jenis || item.jenis === "MAKANAN_JADI")
    .sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
}

function getLatestFoodPhotoUrl(batch: any) {
  return getBatchFoodPhotos(batch)[0]?.url ?? null
}

export function BatchListPage({
  mode = "production",
}: {
  mode?: "production" | "distribution"
}) {
  const navigate = useNavigate()
  const cachedBatches = getCachedPageData<any[]>(pageCacheKeys.productionBatches)
  const [batches, setBatches] = useState<any[]>(() => cachedBatches ?? [])
  const [isLoading, setIsLoading] = useState(!cachedBatches)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editFotoMakanan, setEditFotoMakanan] = useState<File | null>(null)
  const [editFotoPreview, setEditFotoPreview] = useState<string | null>(null)
  const [zoomFotoUrl, setZoomFotoUrl] = useState<string | null>(null)
  const [editKomposisi, setEditKomposisi] = useState<KomposisiItem[]>([
    createEmptyKomposisi(),
  ])
  const [editForm, setEditForm] = useState({
    namaMenu: "",
    totalPorsi: 0,
    waktuMulai: "",
    waktuSelesai: "",
  })

  const loadData = async () => {
    if (cachedBatches) {
      setBatches(cachedBatches)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const batchData = await api.productionBatches.list()
      setBatches(setCachedPageData(pageCacheKeys.productionBatches, batchData))
    } catch (err: any) {
      setError(err.message || "Gagal memuat data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!editFotoMakanan) {
      setEditFotoPreview(null)
      return
    }

    const objectUrl = URL.createObjectURL(editFotoMakanan)
    setEditFotoPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [editFotoMakanan])

  async function deleteBatch() {
    if (!deleteTarget) return
    try {
      await api.productionBatches.delete(deleteTarget.id)
      setBatches((current) =>
        setCachedPageData(
          pageCacheKeys.productionBatches,
          current.filter((item) => item.id !== deleteTarget.id)
        )
      )
      setDeleteTarget(null)
    } catch (err: any) {
      setError(err.message || "Gagal menghapus batch")
    }
  }

  function openEditBatch(batch: any) {
    const bahan = batch.varian?.flatMap((varian: any) => varian.bahan ?? []) ?? []

    setEditTarget(batch)
    setEditFotoMakanan(null)
    setEditKomposisi(
      bahan.length
        ? bahan.map((item: any) => ({ namaBahan: item.namaBahan ?? "" }))
        : [createEmptyKomposisi()]
    )
    setEditForm({
      namaMenu: batch.menu?.name ?? "",
      totalPorsi: Number(batch.totalPorsi ?? 0),
      waktuMulai: toDateTimeLocal(batch.waktuMulai),
      waktuSelesai: toDateTimeLocal(batch.waktuSelesai),
    })
  }

  async function saveBatchEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editTarget) return

    try {
      const cleanedKomposisi = editKomposisi
        .map((item) => item.namaBahan.trim())
        .filter((namaBahan) => namaBahan.length > 0)

      if (cleanedKomposisi.length === 0) {
        setError("Minimal isi 1 komposisi makanan")
        return
      }

      let updated = await api.productionBatches.update(editTarget.id, {
        namaMenu: editForm.namaMenu.trim(),
        totalPorsi: editForm.totalPorsi,
        waktuMulai: editForm.waktuMulai || undefined,
        waktuSelesai: editForm.waktuSelesai || undefined,
        varian: [
          {
            namaVarian: "Utama",
            jumlahPorsi: editForm.totalPorsi,
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

      if (editFotoMakanan) {
        await api.productionBatches.uploadPhoto(
          editTarget.id,
          editFotoMakanan,
          "MAKANAN_JADI"
        )
        updated = await api.productionBatches.get(editTarget.id)
      }

      setBatches((current) =>
        setCachedPageData(
          pageCacheKeys.productionBatches,
          current.map((item) => (item.id === updated.id ? updated : item))
        )
      )
      setEditTarget(null)
      setEditFotoMakanan(null)
      setEditFotoPreview(null)
    } catch (err: any) {
      setError(err.message || "Gagal mengedit batch")
    }
  }

  useEffect(() => {
    return subscribePageCache<any[]>(
      pageCacheKeys.productionBatches,
      (cachedData) => {
        if (cachedData) {
          setBatches(cachedData)
          setIsLoading(false)
        }
      }
    )
  }, [])

  useEffect(() => {
    const syncCachedBatches = () => {
      const cachedData = getCachedPageData<any[]>(
        pageCacheKeys.productionBatches
      )

      if (cachedData) {
        setBatches(cachedData)
        setIsLoading(false)
      }
    }

    window.addEventListener("focus", syncCachedBatches)
    window.addEventListener("pageshow", syncCachedBatches)

    return () => {
      window.removeEventListener("focus", syncCachedBatches)
      window.removeEventListener("pageshow", syncCachedBatches)
    }
  }, [])

  return (
    <DashboardShell title={mode === "distribution" ? "Distribusi" : "Produksi Batch"}>
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
            Riwayat Batch Makanan
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Pantau batch produksi, status distribusi, QR, dan detail menu yang sudah dibuat.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {mode === "distribution"
                ? "Daftar Distribusi Batch"
                : "Daftar Batch Produksi"}
            </h1>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-32" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {batches.length} batch terdaftar
              </p>
            )}
          </div>
          {mode === "production" ? (
            <Link to="/batch/create">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Buat Batch
              </Button>
            </Link>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Batch ID</th>
                <th className="px-4 py-3 font-medium">Menu</th>
                <th className="px-4 py-3 font-medium">Total Porsi</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {mode === "distribution"
                      ? "Belum ada batch untuk distribusi."
                      : "Belum ada batch produksi."}
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{batch.id}</td>
                    <td className="px-4 py-3">{batch.menu?.name || "-"}</td>
                    <td className="px-4 py-3">{batch.totalPorsi}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(batch.status === "DRAFT" || batch.status === "DIPRODUKSI") && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/distribution?batchId=${encodeURIComponent(batch.id)}`
                              )
                            }
                          >
                            <TruckIcon className="w-4 h-4 mr-1" /> Kirim
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewTarget(batch)}
                        >
                          <EyeIcon className="w-4 h-4 mr-1" /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditBatch(batch)}
                        >
                          <PencilIcon className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(batch)}
                        >
                          <Trash2Icon className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={Boolean(viewTarget)} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Batch Produksi</DialogTitle>
            <DialogDescription>{viewTarget?.id}</DialogDescription>
          </DialogHeader>
          {viewTarget ? (
            <div className="grid gap-5">
              <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/20 p-4 text-center">
                <div className="rounded-lg border bg-white p-3">
                  <QRCodeSVG
                    value={`${window.location.origin}/batch-info/${viewTarget.id}`}
                    size={120}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID Batch</p>
                  <p className="break-all text-sm font-semibold">
                    {viewTarget.id}
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Foto makanan</p>
                {getLatestFoodPhotoUrl(viewTarget) ? (
                  <button
                    type="button"
                    className="group w-full overflow-hidden rounded-xl border bg-muted/20 text-left"
                    onClick={() => setZoomFotoUrl(getLatestFoodPhotoUrl(viewTarget))}
                  >
                    <img
                      src={getLatestFoodPhotoUrl(viewTarget)}
                      alt={`Foto makanan batch ${viewTarget.id}`}
                      className="h-24 w-full object-cover transition group-hover:opacity-90"
                    />
                    <span className="block border-t px-2 py-1 text-xs text-muted-foreground">
                      Klik untuk zoom
                    </span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Belum ada foto makanan.
                  </div>
                )}
              </div>
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Menu</dt>
                  <dd className="font-medium">{viewTarget.menu?.name ?? "-"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total porsi</dt>
                  <dd className="font-medium">{viewTarget.totalPorsi}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium">{viewTarget.status}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Driver</dt>
                  <dd className="font-medium">{viewTarget.driver?.name ?? "-"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Dibuat</dt>
                  <dd className="font-medium">
                    {new Date(viewTarget.createdAt).toLocaleString("id-ID")}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="flex max-h-[90svh] flex-col overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Batch Produksi</DialogTitle>
            <DialogDescription>{editTarget?.id}</DialogDescription>
          </DialogHeader>
          <form className="flex min-h-0 flex-col gap-4" onSubmit={saveBatchEdit}>
            <div className="max-h-[calc(90svh-10rem)] overflow-y-auto overscroll-contain pr-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Nama menu
                <Input
                  value={editForm.namaMenu}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      namaMenu: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Jumlah porsi
                <Input
                  min={1}
                  type="number"
                  value={editForm.totalPorsi}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      totalPorsi: Number(event.target.value),
                    }))
                  }
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Waktu mulai produksi
                <Input
                  type="datetime-local"
                  value={editForm.waktuMulai}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      waktuMulai: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Waktu selesai produksi
                <Input
                  type="datetime-local"
                  value={editForm.waktuSelesai}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      waktuSelesai: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <div className="grid gap-2 text-sm font-medium md:col-span-2">
                Foto makanan
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                  {(editFotoPreview || getLatestFoodPhotoUrl(editTarget)) ? (
                    <button
                      type="button"
                      className="group w-full overflow-hidden rounded-xl border bg-muted/20 text-left"
                      onClick={() =>
                        setZoomFotoUrl(editFotoPreview || getLatestFoodPhotoUrl(editTarget))
                      }
                    >
                      <img
                        src={editFotoPreview || getLatestFoodPhotoUrl(editTarget)}
                        alt={
                          editFotoPreview
                            ? "Preview foto makanan baru"
                            : `Foto makanan batch ${editTarget?.id}`
                        }
                        className="h-24 w-full object-cover transition group-hover:opacity-90"
                      />
                      <p className="border-t px-2 py-1 text-xs text-muted-foreground">
                        {editFotoPreview
                          ? "Preview foto baru. Klik zoom."
                          : "Foto saat ini. Klik zoom."}
                      </p>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Belum ada foto makanan.
                    </div>
                  )}
                  <div className="grid gap-2 rounded-xl border bg-muted/10 p-3">
                    <p className="text-xs font-normal text-muted-foreground">
                      Foto bisa diganti dengan memilih file baru.
                    </p>
                    <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
                      Ganti foto
                      <Input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) =>
                          setEditFotoMakanan(event.target.files?.[0] || null)
                        }
                      />
                    </label>
                    <p className="truncate text-xs font-normal text-muted-foreground">
                      {editFotoMakanan?.name ?? "Belum memilih file baru."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-4 grid gap-3 border-t pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold">Komposisi makanan</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditKomposisi((current) => [
                      ...current,
                      createEmptyKomposisi(),
                    ])
                  }
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Tambah Komposisi
                </Button>
              </div>

              <div className="max-h-44 space-y-3 overflow-y-auto overscroll-contain pr-1">
              {editKomposisi.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    required
                    placeholder="Contoh: Nasi, ayam, sayur bayam"
                    value={item.namaBahan}
                    onChange={(event) =>
                      setEditKomposisi((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { namaBahan: event.target.value }
                            : row
                        )
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={editKomposisi.length === 1}
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      setEditKomposisi((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
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

            <div className="-mx-4 -mb-4 flex justify-end gap-2 border-t bg-popover px-4 py-3">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {zoomFotoUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setZoomFotoUrl(null)}
        >
          <div
            className="relative max-h-[90svh] w-full max-w-5xl rounded-xl bg-popover p-3 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 bg-background/80"
              onClick={() => setZoomFotoUrl(null)}
            >
              ×
            </Button>
            <img
              src={zoomFotoUrl}
              alt="Preview foto makanan"
              className="max-h-[84svh] w-full rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Batch {deleteTarget?.id} akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                void deleteBatch()
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
