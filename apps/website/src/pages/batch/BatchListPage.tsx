import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { PlusIcon, TruckIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function BatchListPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [deliveryForm, setDeliveryForm] = useState({
    driverId: "",
    noKendaraan: "",
    jamKeberangkatan: "",
  })
  const [fotoJadi, setFotoJadi] = useState<File | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [batchData, userData] = await Promise.all([
        api.batches.list(),
        api.users.list()
      ])
      setBatches(batchData)
      setUsers(userData.users)
    } catch (err: any) {
      setError(err.message || "Gagal memuat data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenDelivery = (batch: any) => {
    setSelectedBatch(batch)
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setDeliveryForm({
      driverId: batch.driverId || "",
      noKendaraan: batch.noKendaraan || "",
      jamKeberangkatan: batch.jamKeberangkatan ? new Date(batch.jamKeberangkatan).toISOString().slice(0, 16) : now.toISOString().slice(0, 16),
    })
    setFotoJadi(null)
    setIsDeliveryDialogOpen(true)
  }

  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fotoJadi) {
      setError("Foto Makanan Jadi wajib diunggah")
      return
    }
    
    setIsUpdating(true)
    try {
      await api.batches.updateDelivery(selectedBatch.id, deliveryForm)
      await api.batches.uploadPhoto(selectedBatch.id, fotoJadi, "MAKANAN_JADI")
      setIsDeliveryDialogOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.message || "Gagal update pengiriman")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <DashboardShell title="Produksi Batch">
      {error && (
        <AlertToast
          title="Terjadi kesalahan"
          description={error}
          variant="destructive"
          onClose={() => setError(null)}
        />
      )}

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Daftar Batch Produksi</h1>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-32" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {batches.length} batch terdaftar
              </p>
            )}
          </div>
          <Link to="/batch/create">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Buat Batch
            </Button>
          </Link>
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
                    Belum ada batch produksi.
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
                          <Button variant="secondary" size="sm" onClick={() => handleOpenDelivery(batch)}>
                            <TruckIcon className="w-4 h-4 mr-1" /> Kirim
                          </Button>
                        )}
                        <Link to={`/batch-info/${batch.id}`} target="_blank">
                          <Button variant="outline" size="sm">
                            Lihat QR
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmitDelivery}>
            <DialogHeader>
              <DialogTitle>Update Pengiriman (Tahap 2)</DialogTitle>
              <DialogDescription>Lengkapi detail pengiriman untuk Batch {selectedBatch?.id}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Foto Makanan Jadi (Wajib)</label>
                <Input
                  type="file"
                  accept="image/*"
                  required
                  onChange={e => setFotoJadi(e.target.files?.[0] || null)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Driver</label>
                <select
                  value={deliveryForm.driverId}
                  onChange={e => setDeliveryForm({...deliveryForm, driverId: e.target.value})}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                >
                  <option value="">Pilih Driver...</option>
                  {users.filter(u => u.role === "DRIVER").map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">No Kendaraan</label>
                <Input value={deliveryForm.noKendaraan} onChange={e => setDeliveryForm({...deliveryForm, noKendaraan: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Jam Berangkat</label>
                <Input type="datetime-local" value={deliveryForm.jamKeberangkatan} onChange={e => setDeliveryForm({...deliveryForm, jamKeberangkatan: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeliveryDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isUpdating}>{isUpdating ? "Menyimpan..." : "Simpan & Kirim"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
