import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

export function BatchCreatePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [menus, setMenus] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [dapurCapacity, setDapurCapacity] = useState<number>(1000)

  const [form, setForm] = useState({
    menuId: "",
    waktuMulai: "",
    waktuSelesai: "",
    petugasId: "",
  })

  const [varian, setVarian] = useState<any[]>([
    {
      namaVarian: "Porsi Kecil",
      jumlahPorsi: 0,
      energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0,
      bahan: {
        MAKANAN_POKOK: [{ namaBahan: "", jumlah: "", harga: "" }],
        LAUK_PAUK: [{ namaBahan: "", jumlah: "", harga: "" }],
        SAYUR: [{ namaBahan: "", jumlah: "", harga: "" }],
        BUAH: [{ namaBahan: "", jumlah: "", harga: "" }],
        SUSU: [{ namaBahan: "", jumlah: "", harga: "" }],
      }
    }
  ])

  const [sekolah, setSekolah] = useState<any[]>([
    { sekolahId: "", porsi: 0 }
  ])

  const [fotoProses, setFotoProses] = useState<File | null>(null)

  const [createdBatch, setCreatedBatch] = useState<any>(null)
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false)
  const [newMenu, setNewMenu] = useState({ name: "", category: "MENU_UTAMA" })

  useEffect(() => {
    Promise.all([
      api.menus.list(),
      api.users.list(),
      api.settings.getDapurCapacity()
    ]).then(([m, u, c]) => {
      setMenus(m)
      setUsers(u.users)
      setDapurCapacity(c?.capacity || 1000)
    }).catch(err => console.error(err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const calculatedTotalPorsi = varian.reduce((acc, v) => acc + Number(v.jumlahPorsi), 0)

    // Validasi kapasitas dapur
    const totalPorsiSekolah = sekolah.reduce((acc, curr) => acc + Number(curr.porsi), 0)
    if (totalPorsiSekolah !== calculatedTotalPorsi) {
      setError(`Total porsi rincian sekolah (${totalPorsiSekolah}) tidak sama dengan total porsi dari varian (${calculatedTotalPorsi})`)
      setIsLoading(false)
      return
    }

    if (calculatedTotalPorsi > dapurCapacity) {
      setError(`Kapasitas dapur harian maksimal adalah ${dapurCapacity} porsi`)
      setIsLoading(false)
      return
    }

    if (!fotoProses) {
      setError("Foto Proses Masak wajib diunggah")
      setIsLoading(false)
      return
    }

    try {
      const varianPayload = varian.map(v => {
        const allBahan = Object.entries(v.bahan).flatMap(([kategori, list]: [string, any]) => 
          list.map((b: any) => ({ ...b, kategori, jumlah: Number(b.jumlah || 0), satuan: "gram", harga: Number(b.harga || 0) }))
        ).filter(b => b.namaBahan.trim() !== "")

        return {
          namaVarian: v.namaVarian,
          jumlahPorsi: Number(v.jumlahPorsi),
          energi: Number(v.energi),
          protein: Number(v.protein),
          lemak: Number(v.lemak),
          karbohidrat: Number(v.karbohidrat),
          serat: Number(v.serat),
          bahan: allBahan
        }
      })

      const result = await api.batches.create({
        ...form,
        waktuMulai: form.waktuMulai || undefined,
        waktuSelesai: form.waktuSelesai || undefined,
        petugasId: form.petugasId || undefined,
        totalPorsi: calculatedTotalPorsi,
        varian: varianPayload,
        sekolah: sekolah.filter(s => s.sekolahId && s.sekolahId.trim() !== "" && s.porsi > 0)
      })

      // Upload photos sequentially
      await api.batches.uploadPhoto(result.id, fotoProses, "PROSES_MASAK")

      setCreatedBatch(result)
    } catch (err: any) {
      setError(err.message || "Gagal membuat batch atau mengunggah foto")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await api.menus.create(newMenu)
      setMenus([...menus, created])
      setForm({ ...form, menuId: created.id })
      setIsMenuDialogOpen(false)
      setNewMenu({ name: "", category: "MENU_UTAMA" })
    } catch (err: any) {
      setError(err.message || "Gagal membuat menu")
    }
  }

  if (createdBatch) {
    const qrUrl = `${window.location.origin}/batch-info/${createdBatch.id}`
    return (
      <DashboardShell title="Batch Berhasil Dibuat">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-primary/5 p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Batch {createdBatch.id}</h2>
            <p className="text-muted-foreground">Berhasil disimpan. Berikut adalah rincian batch produksi Anda.</p>
          </div>

          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold text-muted-foreground">Informasi Umum</h3>
                <dl className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt>Menu</dt>
                    <dd className="font-medium">{createdBatch.menu?.name || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Kategori</dt>
                    <dd className="font-medium">{createdBatch.menu?.category || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Total Porsi</dt>
                    <dd className="font-medium">{createdBatch.totalPorsi}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Waktu Produksi</dt>
                    <dd className="font-medium">
                      {new Date(createdBatch.createdAt).toLocaleString("id-ID")}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col items-center justify-center border-l pl-6">
                <p className="text-sm font-medium mb-3">QR Code Batch</p>
                <div className="bg-white p-3 rounded-xl shadow-sm border">
                  <QRCodeSVG value={qrUrl} size={150} />
                </div>
                <Button variant="link" size="sm" className="mt-2" onClick={() => window.open(qrUrl, "_blank")}>
                  Buka Halaman Scan
                </Button>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4 border-t pt-6">
              <Button onClick={() => navigate("/batch")} variant="outline">Kembali ke Daftar</Button>
              <Button onClick={() => { 
                setCreatedBatch(null); 
                setForm({...form}); 
                setVarian([{
                  namaVarian: "Porsi Kecil", jumlahPorsi: 0, energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0,
                  bahan: {
                    MAKANAN_POKOK: [{ namaBahan: "", jumlah: "", harga: "" }],
                    LAUK_PAUK: [{ namaBahan: "", jumlah: "", harga: "" }],
                    SAYUR: [{ namaBahan: "", jumlah: "", harga: "" }],
                    BUAH: [{ namaBahan: "", jumlah: "", harga: "" }],
                    SUSU: [{ namaBahan: "", jumlah: "", harga: "" }],
                  }
                }]); 
                setSekolah([{ sekolahId: "", porsi: 0 }]); 
                setFotoProses(null); 
              }}>Buat Batch Baru</Button>
            </div>
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

      <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 rounded-xl border">
        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium block">Menu</label>
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setIsMenuDialogOpen(true)}>+ Menu Baru</Button>
            </div>
            <select
              required
              value={form.menuId}
              onChange={e => setForm({...form, menuId: e.target.value})}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
            >
              <option value="">Pilih Menu...</option>
              {menus.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Total Porsi (Otomatis)</label>
            <Input
              type="number"
              disabled
              value={varian.reduce((acc, v) => acc + Number(v.jumlahPorsi), 0)}
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">Dihitung dari akumulasi porsi tiap varian.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Waktu Mulai</label>
            <Input type="datetime-local" value={form.waktuMulai} onChange={e => setForm({...form, waktuMulai: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Waktu Selesai</label>
            <Input type="datetime-local" value={form.waktuSelesai} onChange={e => setForm({...form, waktuSelesai: e.target.value})} />
          </div>
        </section>

        <section className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Petugas Dapur</h3>
          <div className="max-w-md">
            <label className="text-sm font-medium mb-1 block">Nama Petugas</label>
            <select
              value={form.petugasId}
              onChange={e => setForm({...form, petugasId: e.target.value})}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
            >
              <option value="">Pilih Petugas...</option>
              {users.filter(u => u.role === "SPPG").map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Alokasi Sekolah</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setSekolah([...sekolah, { sekolahId: "", porsi: 0 }])}>
              <PlusIcon className="w-4 h-4 mr-2" /> Tambah Sekolah
            </Button>
          </div>
          <div className="space-y-3">
            {sekolah.map((s, idx) => (
              <div key={idx} className="flex gap-3 items-start bg-muted/5 p-3 rounded-md border">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Nama Sekolah</label>
                  <select
                    required
                    value={s.sekolahId}
                    onChange={e => {
                      const newSekolah = [...sekolah];
                      newSekolah[idx].sekolahId = e.target.value;
                      setSekolah(newSekolah);
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                  >
                    <option value="">Pilih Sekolah...</option>
                    {users.filter(u => u.role === "SEKOLAH").map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Jumlah Porsi</label>
                  <Input
                    type="number"
                    required
                    placeholder="0"
                    value={s.porsi}
                    onChange={e => {
                      const newSekolah = [...sekolah];
                      newSekolah[idx].porsi = Number(e.target.value);
                      setSekolah(newSekolah);
                    }}
                    className="w-full bg-background"
                  />
                </div>
                <div className="pt-5">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSekolah(sekolah.filter((_, i) => i !== idx))}>
                    <Trash2Icon className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Rincian Varian & Komposisi</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => setVarian([...varian, {
              namaVarian: "Varian Baru", jumlahPorsi: 0, energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0,
              bahan: { MAKANAN_POKOK: [], LAUK_PAUK: [], SAYUR: [], BUAH: [], SUSU: [] }
            }])}>
              <PlusIcon className="w-4 h-4 mr-2" /> Tambah Varian
            </Button>
          </div>
          
          <div className="space-y-8">
            {varian.map((v, vIdx) => {
              const totalBiaya = Object.values(v.bahan).flat().reduce((acc, curr: any) => acc + Number(curr.harga || 0), 0)
              
              return (
                <div key={vIdx} className="border rounded-xl p-5 bg-muted/5 relative shadow-sm">
                  {varian.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="absolute top-3 right-3 text-destructive hover:bg-destructive/10" onClick={() => setVarian(varian.filter((_, i) => i !== vIdx))}>
                      <Trash2Icon className="w-5 h-5" />
                    </Button>
                  )}
                  
                  <div className="grid gap-4 md:grid-cols-2 mb-6 pr-12">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Nama Varian (Misal: Porsi Kecil)</label>
                      <Input required placeholder="Misal: Porsi Kecil" value={v.namaVarian} onChange={e => { const nv = [...varian]; nv[vIdx].namaVarian = e.target.value; setVarian(nv); }} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Jumlah Porsi Varian</label>
                      <Input type="number" required placeholder="0" value={v.jumlahPorsi} onChange={e => { const nv = [...varian]; nv[vIdx].jumlahPorsi = Number(e.target.value); setVarian(nv); }} />
                    </div>
                  </div>

                  <h4 className="text-sm font-bold mb-3 border-b pb-2 text-muted-foreground uppercase tracking-wider">Ringkasan Kandungan Gizi (Per Nampan Varian Ini)</h4>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-5 mb-8">
                    <div className="bg-background rounded-lg border p-2">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Energi (kkal)</label>
                      <Input type="number" step="0.1" value={v.energi} onChange={e => { const nv = [...varian]; nv[vIdx].energi = Number(e.target.value); setVarian(nv); }} className="h-8 text-sm" />
                    </div>
                    <div className="bg-background rounded-lg border p-2">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Protein (g)</label>
                      <Input type="number" step="0.1" value={v.protein} onChange={e => { const nv = [...varian]; nv[vIdx].protein = Number(e.target.value); setVarian(nv); }} className="h-8 text-sm" />
                    </div>
                    <div className="bg-background rounded-lg border p-2">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Lemak (g)</label>
                      <Input type="number" step="0.1" value={v.lemak} onChange={e => { const nv = [...varian]; nv[vIdx].lemak = Number(e.target.value); setVarian(nv); }} className="h-8 text-sm" />
                    </div>
                    <div className="bg-background rounded-lg border p-2">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Karbohidrat (g)</label>
                      <Input type="number" step="0.1" value={v.karbohidrat} onChange={e => { const nv = [...varian]; nv[vIdx].karbohidrat = Number(e.target.value); setVarian(nv); }} className="h-8 text-sm" />
                    </div>
                    <div className="bg-background rounded-lg border p-2">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Serat (g)</label>
                      <Input type="number" step="0.1" value={v.serat} onChange={e => { const nv = [...varian]; nv[vIdx].serat = Number(e.target.value); setVarian(nv); }} className="h-8 text-sm" />
                    </div>
                  </div>

                  <h4 className="text-sm font-bold mb-3 border-b pb-2 text-muted-foreground uppercase tracking-wider">Komposisi Nampan (5 Kategori)</h4>
                  <div className="space-y-4">
                    {[
                      { id: "MAKANAN_POKOK", label: "1. Makanan Pokok (Karbohidrat)" },
                      { id: "LAUK_PAUK", label: "2. Lauk Pauk (Protein)" },
                      { id: "SAYUR", label: "3. Sayur-sayuran (Vitamin & Serat)" },
                      { id: "BUAH", label: "4. Buah-buahan (Vitamin & Antioksidan)" },
                      { id: "SUSU", label: "5. Susu (Pelengkap Nutrisi)" }
                    ].map(kategori => (
                      <div key={kategori.id} className="border rounded-lg bg-background p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-semibold text-xs text-muted-foreground uppercase">{kategori.label}</h5>
                          <Button type="button" variant="secondary" size="sm" className="h-7 text-xs" onClick={() => {
                            const nv = [...varian]
                            nv[vIdx].bahan[kategori.id].push({ namaBahan: "", jumlah: "", harga: "" })
                            setVarian(nv)
                          }}>
                            + Item
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {v.bahan[kategori.id].map((b: any, bIdx: number) => (
                            <div key={bIdx} className="flex gap-2 items-start bg-muted/10 p-2 rounded border">
                              <div className="flex-1 min-w-[120px]">
                                {bIdx === 0 && <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Nama Bahan</label>}
                                <Input required placeholder="Nama Bahan" value={b.namaBahan} onChange={e => {
                                  const nv = [...varian]
                                  nv[vIdx].bahan[kategori.id][bIdx].namaBahan = e.target.value
                                  setVarian(nv)
                                }} className="h-8 w-full text-xs" />
                              </div>
                              <div className="w-24">
                                {bIdx === 0 && <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Jml/Berat</label>}
                                <div className="relative">
                                  <Input type="number" required placeholder="0" value={b.jumlah} onChange={e => {
                                    const nv = [...varian]
                                    nv[vIdx].bahan[kategori.id][bIdx].jumlah = e.target.value
                                    setVarian(nv)
                                  }} className="h-8 w-full text-xs pr-7" />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">g</span>
                                </div>
                              </div>
                              <div className="w-28">
                                {bIdx === 0 && <label className="text-[10px] font-medium text-muted-foreground uppercase block mb-1">Harga (Rp)</label>}
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">Rp</span>
                                  <Input type="number" required placeholder="0" value={b.harga} onChange={e => {
                                    const nv = [...varian]
                                    nv[vIdx].bahan[kategori.id][bIdx].harga = e.target.value
                                    setVarian(nv)
                                  }} className="h-8 w-full text-xs pl-6" />
                                </div>
                              </div>
                              <div className={bIdx === 0 ? "pt-5" : "pt-0.5"}>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                  const nv = [...varian]
                                  nv[vIdx].bahan[kategori.id] = nv[vIdx].bahan[kategori.id].filter((_: any, i: number) => i !== bIdx)
                                  setVarian(nv)
                                }}>
                                  <Trash2Icon className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {v.bahan[kategori.id].length === 0 && (
                            <p className="text-[11px] text-muted-foreground italic px-1">Belum ada bahan ditambahkan.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t flex justify-end">
                    <p className="text-sm font-semibold">
                      Biaya Bahan Varian Ini: <span className="text-primary">Rp {(totalBiaya as number).toLocaleString('id-ID')}</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex justify-end p-4 bg-primary/5 rounded-xl border">
            <p className="font-bold text-lg">
              Total Biaya Keseluruhan Batch: <span className="text-primary">Rp {varian.reduce((accV, v) => accV + Object.values(v.bahan).flat().reduce((acc, curr: any) => acc + Number(curr.harga || 0), 0), 0).toLocaleString('id-ID')}</span>
            </p>
          </div>
        </section>

        <section className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Dokumentasi (Wajib)</h3>
          <div className="max-w-md">
            <label className="text-sm font-medium mb-1 block">Foto Proses Masak</label>
            <Input
              type="file"
              accept="image/*"
              required
              onChange={e => setFotoProses(e.target.files?.[0] || null)}
            />
          </div>
        </section>

        <div className="flex justify-end gap-4 border-t pt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/batch")}>Batal</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Menyimpan..." : "Simpan Batch & Generate QR"}</Button>
        </div>
      </form>

      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateMenu}>
            <DialogHeader>
              <DialogTitle>Tambah Menu Baru</DialogTitle>
              <DialogDescription>Tambahkan menu masakan baru ke dalam database.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nama Menu</label>
                <Input required value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} placeholder="Contoh: Nasi Goreng Ayam" />
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMenuDialogOpen(false)}>Batal</Button>
              <Button type="submit">Simpan Menu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
