import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type BatchSummary } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import { cn } from "@/lib/utils"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { CheckCircle2Icon, FileTextIcon, FlagIcon, XCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusConfig(status: string) {
  if (status === "DITERIMA") {
    return {
      icon: CheckCircle2Icon,
      label: "Diterima",
      className:
        "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
    }
  }

  if (status === "DITOLAK") {
    return {
      icon: XCircleIcon,
      label: "Ditolak",
      className:
        "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
    }
  }

  return {
    icon: FileTextIcon,
    label: status,
    className:
      "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  }
}

export function BatchHistoryPage() {
  const navigate = useNavigate()
  const cachedBatches = getCachedPageData<BatchSummary[]>(pageCacheKeys.batches)
  const [batches, setBatches] = useState<BatchSummary[]>(cachedBatches ?? [])
  const [isLoading, setIsLoading] = useState(!cachedBatches)
  const [error, setError] = useState<string | null>(null)

  async function loadData(showLoading = true) {
    if (showLoading) setIsLoading(true)
    setError(null)

    try {
      const response = await api.batches.list()
      setBatches(setCachedPageData(pageCacheKeys.batches, response.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat batch.")
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    if (cachedBatches) {
      void loadData(false)
      return
    }

    void loadData()
  }, [])

  useEffect(() => {
    return subscribePageCache<BatchSummary[]>(pageCacheKeys.batches, (data) => {
      if (data) {
        setBatches(data)
        setIsLoading(false)
      }
    })
  }, [])

  const finalBatches = batches.filter((batch) =>
    ["DITERIMA", "DITOLAK", "SELESAI"].includes(batch.status)
  )

  return (
    <DashboardShell title="Riwayat Batch Makanan">
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
            Riwayat
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Riwayat Batch Makanan
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Batch yang sudah divalidasi sekolah akan tampil di sini.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card text-card-foreground">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Batch Tervalidasi</h2>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-36" />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {finalBatches.length} batch masuk riwayat
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Batch ID</th>
                <th className="px-4 py-3 font-medium">Menu</th>
                <th className="px-4 py-3 font-medium">Waktu Produksi</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-7 w-24 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="ml-auto h-8 w-28" />
                      </td>
                    </tr>
                  ))
                : null}

              {!isLoading && finalBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada batch makanan yang selesai divalidasi.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? finalBatches.map((batch) => {
                    const statusConfig = getStatusConfig(batch.status)
                    const StatusIcon = statusConfig.icon

                    return (
                      <tr key={batch.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{batch.batchIdUnik}</td>
                        <td className="px-4 py-3">{batch.namaMenu}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(batch.waktuProduksi)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                              statusConfig.className
                            )}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() =>
                              navigate(`/food-reports?batchId=${encodeURIComponent(batch.id)}`)
                            }
                          >
                            <FlagIcon className="h-3.5 w-3.5" />
                            Laporan
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  )
}
