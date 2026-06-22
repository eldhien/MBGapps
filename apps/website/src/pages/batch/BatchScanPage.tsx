import { api } from "@/lib/api"
import { PackagePlusIcon } from "lucide-react"
import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"

export function BatchScanPage() {
  const params = useParams()
  const id = params["*"] || params.id
  const [batch, setBatch] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.batches.get(id)
      .then(setBatch)
      .catch(err => setError(err.message || "Gagal memuat detail batch"))
      .finally(() => setIsLoading(false))
  }, [id])

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
                  <dd className="font-medium">{batch.driver?.username || "-"}</dd>
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
                const totalBiaya = v.bahan?.reduce((acc: number, b: any) => acc + Number(b.harga || 0), 0) || 0;
                
                // Group bahan by kategori
                const groupedBahan = {
                  MAKANAN_POKOK: v.bahan?.filter((b: any) => b.kategori === "MAKANAN_POKOK") || [],
                  LAUK_PAUK: v.bahan?.filter((b: any) => b.kategori === "LAUK_PAUK") || [],
                  SAYUR: v.bahan?.filter((b: any) => b.kategori === "SAYUR") || [],
                  BUAH: v.bahan?.filter((b: any) => b.kategori === "BUAH") || [],
                  SUSU: v.bahan?.filter((b: any) => b.kategori === "SUSU") || [],
                  LAINNYA: v.bahan?.filter((b: any) => !b.kategori) || [] // for legacy data
                };

                const kategoriLabels = [
                  { id: "MAKANAN_POKOK", label: "Makanan Pokok" },
                  { id: "LAUK_PAUK", label: "Lauk Pauk" },
                  { id: "SAYUR", label: "Sayur-sayuran" },
                  { id: "BUAH", label: "Buah-buahan" },
                  { id: "SUSU", label: "Susu" },
                  { id: "LAINNYA", label: "Bahan Lainnya (Legacy)" }
                ];

                return (
                  <div key={vIdx} className="overflow-hidden rounded-xl border bg-muted/5">
                    {/* Selalu tampilkan header varian */}
                    <div className="border-b bg-muted/20 px-4 py-3 flex justify-between items-center">
                      <h4 className="font-semibold text-sm">{v.namaVarian || "Varian"}</h4>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {v.jumlahPorsi} Porsi
                      </span>
                    </div>
                    
                    <div className="p-5">
                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Kandungan Gizi (Per Porsi/Nampan)</h5>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-8">
                        <div className="text-center bg-background rounded-lg border p-3 shadow-sm">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Energi</p>
                          <p className="font-semibold text-base text-primary">{v.energi || "0"} <span className="text-xs font-normal text-muted-foreground">kkal</span></p>
                        </div>
                        <div className="text-center bg-background rounded-lg border p-3 shadow-sm">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Protein</p>
                          <p className="font-semibold text-base text-primary">{v.protein || "0"} <span className="text-xs font-normal text-muted-foreground">g</span></p>
                        </div>
                        <div className="text-center bg-background rounded-lg border p-3 shadow-sm">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Lemak</p>
                          <p className="font-semibold text-base text-primary">{v.lemak || "0"} <span className="text-xs font-normal text-muted-foreground">g</span></p>
                        </div>
                        <div className="text-center bg-background rounded-lg border p-3 shadow-sm">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Karbohidrat</p>
                          <p className="font-semibold text-base text-primary">{v.karbohidrat || "0"} <span className="text-xs font-normal text-muted-foreground">g</span></p>
                        </div>
                        <div className="text-center bg-background rounded-lg border p-3 shadow-sm">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Serat</p>
                          <p className="font-semibold text-base text-primary">{v.serat || "0"} <span className="text-xs font-normal text-muted-foreground">g</span></p>
                        </div>
                      </div>

                      <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Daftar Bahan & Harga (5 Kategori)</h5>
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
                              const bahanList = groupedBahan[kat.id as keyof typeof groupedBahan];
                              if (bahanList.length === 0) return null;
                              
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
                                      <td className="px-4 py-2.5 text-right font-medium">Rp {(b.harga || 0).toLocaleString('id-ID')}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
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
                              <td className="px-4 py-3 text-right font-bold text-primary text-base">Rp {totalBiaya.toLocaleString('id-ID')}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {batch.varian && batch.varian.length > 0 && (
              <div className="mt-6 flex justify-end p-4 bg-primary/5 rounded-xl border">
                <p className="font-bold text-lg">
                  Total Biaya Keseluruhan Batch: <span className="text-primary">Rp {batch.varian.reduce((accV: number, v: any) => accV + (v.bahan?.reduce((acc: number, b: any) => acc + Number(b.harga || 0), 0) || 0), 0).toLocaleString('id-ID')}</span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <h3 className="mb-4 font-semibold text-muted-foreground">Alokasi Sekolah</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Sekolah</th>
                    <th className="pb-2 text-right font-medium">Porsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batch.sekolah?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2">{s.sekolah?.username || "Unknown"}</td>
                      <td className="py-2 text-right font-medium">{s.porsi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
