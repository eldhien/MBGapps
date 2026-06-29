import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/ui/table-pagination"
import { api, type BatchSummary } from "@/lib/api"
import {
  getCachedPageData,
  pageCacheKeys,
  setCachedPageData,
  subscribePageCache,
} from "@/lib/page-cache"
import { DashboardShell } from "@/pages/components/DashboardShell"
import { FlagIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

const HISTORY_BATCHES_PER_PAGE = 10

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
      label: "Diterima",
      className: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    }
  }

  if (status === "DITOLAK") {
    return {
      label: "Ditolak",
      className: "bg-red-50 text-red-600 ring-red-100",
    }
  }

  return {
    label: status,
    className: "bg-slate-50 text-slate-600 ring-slate-200",
  }
}

export function BatchHistoryPage() {
  const navigate = useNavigate()
  const cachedBatches = getCachedPageData<BatchSummary[]>(pageCacheKeys.batches)
  const [batches, setBatches] = useState<BatchSummary[]>(cachedBatches ?? [])
  const [isLoading, setIsLoading] = useState(!cachedBatches)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  async function loadData(showLoading = true) {
    if (showLoading) setIsLoading(true)
    setError(null)

    try {
      const response = await api.batches.list()
      setBatches(setCachedPageData(pageCacheKeys.batches, response.data))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat riwayat batch."
      )
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

  const finalBatches = useMemo(
    () =>
      batches.filter((batch) =>
        ["DITERIMA", "DITOLAK", "SELESAI"].includes(batch.status)
      ),
    [batches]
  )
  const totalPages = Math.max(
    1,
    Math.ceil(finalBatches.length / HISTORY_BATCHES_PER_PAGE)
  )
  const paginatedBatches = useMemo(
    () =>
      finalBatches.slice(
        (currentPage - 1) * HISTORY_BATCHES_PER_PAGE,
        currentPage * HISTORY_BATCHES_PER_PAGE
      ),
    [currentPage, finalBatches]
  )

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Riwayat Batch Makanan
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Pantau batch makanan yang sudah selesai divalidasi sekolah beserta
            status dan laporan terkait.
          </p>
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e9edf4] bg-white shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-2 border-b border-[#edf0f4] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-semibold tracking-tight">
                Batch tervalidasi
              </h1>
              <span className="text-lg font-semibold text-muted-foreground">
                {isLoading ? "..." : finalBatches.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Batch yang sudah divalidasi sekolah akan tampil di sini.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-[#edf0f4] bg-[#fcfcfd] text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Batch ID</th>
                <th className="px-5 py-3 font-medium">Menu</th>
                <th className="px-5 py-3 font-medium">Waktu Produksi</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className="border-b border-[#edf0f4]">
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-7 w-24 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="ml-auto h-8 w-28" />
                      </td>
                    </tr>
                  ))
                : null}

              {!isLoading && finalBatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    Belum ada batch makanan yang selesai divalidasi.
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? paginatedBatches.map((batch) => {
                    const statusConfig = getStatusConfig(batch.status)

                    return (
                      <tr
                        key={batch.id}
                        className="border-b border-[#edf0f4] last:border-0 hover:bg-[#fcfcfd]"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {batch.batchIdUnik}
                        </td>
                        <td className="px-5 py-4">{batch.namaMenu}</td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {formatDate(batch.waktuProduksi)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() =>
                              navigate(
                                `/food-reports?batchId=${encodeURIComponent(batch.id)}`
                              )
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

        {!isLoading && finalBatches.length > HISTORY_BATCHES_PER_PAGE ? (
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </section>
    </DashboardShell>
  )
}
