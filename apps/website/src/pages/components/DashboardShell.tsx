import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/features/auth/AuthProvider"
import { api, type BatchSummary, type FoodReport } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  BellIcon,
  CheckCheckIcon,
  ClipboardListIcon,
  PackagePlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

const READ_BATCH_KEY = "mbg_read_batch_notifications"

let cachedFoodReports: FoodReport[] | null = null
let cachedBatches: BatchSummary[] | null = null

function DashboardShellFrame({
  children,
  header,
  variant,
}: {
  children: React.ReactNode
  header: React.ReactNode
  variant: "default" | "dashboard"
}) {
  const { isMobile, open } = useSidebar()
  const topbarLeft = isMobile
    ? "0px"
    : open
      ? "var(--sidebar-width)"
      : "var(--sidebar-width-icon)"

  return (
    <SidebarInset className="min-h-svh bg-white pt-19">
      <header
        className="fixed top-0 right-0 z-30 flex h-19 shrink-0 items-center border-b bg-white/95 px-5 backdrop-blur-xl transition-[left] duration-200 ease-linear"
        style={{ left: topbarLeft }}
      >
        {header}
      </header>
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-x-hidden",
          variant === "dashboard"
            ? "gap-4 bg-white p-4 md:p-6"
            : "gap-6 bg-white p-4 md:p-6"
        )}
      >
        {children}
      </main>
    </SidebarInset>
  )
}

function getBatchNotificationKey(batch: BatchSummary) {
  return batch.id || batch.batchIdUnik
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getReportCategoryLabel(report: FoodReport) {
  if (report.kategori === "LAINNYA" && report.kategoriLainnya) {
    return report.kategoriLainnya
  }

  return report.kategori.replaceAll("_", " ").toLowerCase()
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 11) return "Selamat pagi!"
  if (hour < 15) return "Selamat siang!"
  if (hour < 19) return "Selamat sore!"
  return "Selamat malam!"
}

export function DashboardShell({
  children,
  variant = "default",
}: {
  children: React.ReactNode
  title: string
  variant?: "default" | "dashboard"
}) {
  const { profile } = useAuth()
  const userName = profile?.username ?? "Pengguna"
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [foodReports, setFoodReports] = useState<FoodReport[]>(
    cachedFoodReports ?? []
  )
  const [batches, setBatches] = useState<BatchSummary[]>(cachedBatches ?? [])
  const [readBatchIds, setReadBatchIds] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(READ_BATCH_KEY) ?? "[]"
      ) as string[]
    } catch {
      return []
    }
  })
  const [notifOpen, setNotifOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchBoxRef = useRef<HTMLDivElement | null>(null)
  const notifBoxRef = useRef<HTMLDivElement | null>(null)
  const greeting = getGreeting()
  const showHeaderSearch = variant !== "dashboard"

  useEffect(() => {
    let isMounted = true

    if (cachedFoodReports) {
      setFoodReports(cachedFoodReports)
    } else {
      api.foodReports
        .list()
        .then((response) => {
          cachedFoodReports = response.data
          if (isMounted) {
            setFoodReports(response.data)
          }
        })
        .catch(() => {
          if (isMounted) {
            setFoodReports([])
          }
        })
    }

    if (cachedBatches) {
      setBatches(cachedBatches)
    } else {
      api.batches
        .list()
        .then((response) => {
          cachedBatches = response.data
          if (isMounted) {
            setBatches(response.data)
          }
        })
        .catch(() => {
          if (isMounted) {
            setBatches([])
          }
        })
    }

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen && !notifOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setSearchOpen(false)
        setSearchQuery("")
      }

      if (notifBoxRef.current && !notifBoxRef.current.contains(target)) {
        setNotifOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [notifOpen, searchOpen])

  const unreadBatches = useMemo(
    () =>
      batches
        .filter(
          (batch) => !readBatchIds.includes(getBatchNotificationKey(batch))
        )
        .sort(
          (a, b) =>
            new Date(b.waktuProduksi).getTime() -
            new Date(a.waktuProduksi).getTime()
        ),
    [batches, readBatchIds]
  )

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return foodReports.slice(0, 5)
    }

    return foodReports
      .filter((report) => {
        const haystack = [
          report.kategori,
          report.kategoriLainnya,
          report.deskripsi,
          report.sekolahUsername,
          report.batchId,
          report.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return haystack.includes(query)
      })
      .slice(0, 6)
  }, [foodReports, searchQuery])

  const markAllRead = () => {
    const nextIds = Array.from(
      new Set([
        ...readBatchIds,
        ...unreadBatches.map((batch) => getBatchNotificationKey(batch)),
      ])
    )
    setReadBatchIds(nextIds)
    localStorage.setItem(READ_BATCH_KEY, JSON.stringify(nextIds))
    setNotifOpen(false)
  }

  return (
    <SidebarProvider className="min-h-svh">
      <AppSidebar />
      <DashboardShellFrame
        variant={variant}
        header={
          <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Halo {userName},
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {greeting}
            </h1>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            {showHeaderSearch ? (
              <div ref={searchBoxRef} className="relative flex items-center">
                <button
                  type="button"
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#edf0f4] bg-white text-muted-foreground shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#f7f9ff] hover:text-[#0528f2]"
                  aria-label={searchOpen ? "Fokus pencarian" : "Buka pencarian"}
                  onClick={() => {
                    setSearchOpen(true)
                    setNotifOpen(false)
                    searchInputRef.current?.focus()
                  }}
                >
                  <SearchIcon className="size-4" />
                </button>

                {searchOpen && (
                  <div className="absolute top-full right-0 z-20 mt-2 w-[min(78vw,360px)]">
                    <div className="flex h-10 items-center gap-2 rounded-full border border-[#edf0f4] bg-white px-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
                      <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                      <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Cari laporan masalah..."
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Tutup pencarian"
                        onClick={() => {
                          setSearchOpen(false)
                          setSearchQuery("")
                        }}
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-[#edf0f4] bg-white p-2 shadow-[0_18px_46px_rgba(15,23,42,0.12)]">
                      <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground">
                        Laporan masalah
                      </div>
                      {searchResults.length > 0 ? (
                        <div className="space-y-1">
                          {searchResults.map((report) => (
                            <Link
                              key={report.id}
                              to="/food-reports"
                              className="block rounded-lg p-2 transition-colors hover:bg-[#f7f8fb]"
                              onClick={() => setSearchOpen(false)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold capitalize">
                                  {getReportCategoryLabel(report)}
                                </p>
                                <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#0528f2]">
                                  {report.status}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {report.deskripsi}
                              </p>
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {report.sekolahUsername ?? "Sekolah"} -{" "}
                                {formatDateTime(report.createdAt)}
                              </p>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-[#eef1f6] bg-white p-4 text-center text-xs text-muted-foreground">
                          Tidak ada laporan masalah yang cocok.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div ref={notifBoxRef} className="relative flex items-center">
              <button
                type="button"
                className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#edf0f4] bg-white text-muted-foreground shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#f7f9ff] hover:text-[#0528f2]"
                aria-label="Notifikasi produksi batch"
                onClick={() => {
                  setNotifOpen((open) => !open)
                  setSearchOpen(false)
                }}
              >
                <BellIcon className="size-4" />
                {unreadBatches.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-[#0528f2] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadBatches.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-full right-0 z-20 mt-2 w-[min(82vw,380px)] rounded-xl border border-[#edf0f4] bg-white p-3 shadow-[0_18px_46px_rgba(15,23,42,0.12)]">
                  <div className="flex items-center justify-between gap-3 px-2 pb-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Notifikasi produksi
                    </p>
                    {unreadBatches.length > 0 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0528f2]"
                        onClick={markAllRead}
                      >
                        <CheckCheckIcon className="size-3.5" />
                        Tandai dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 space-y-1 overflow-auto">
                    {unreadBatches.length > 0 ? (
                      unreadBatches.map((batch) => (
                        <div
                          key={getBatchNotificationKey(batch)}
                          className="rounded-lg p-2 transition-colors hover:bg-[#f7f8fb]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#0528f2]">
                              <PackagePlusIcon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                Produksi batch baru
                              </p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {batch.namaMenu} - {batch.batchIdUnik}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDateTime(batch.waktuProduksi)}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#0528f2]">
                              Baru
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg p-6 text-center">
                        <ClipboardListIcon className="mx-auto size-7 text-muted-foreground" />
                        <p className="mt-2 text-sm font-semibold">
                          Tidak ada notifikasi baru
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Semua produksi batch sudah dibaca.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        }
      >
        {children}
      </DashboardShellFrame>
    </SidebarProvider>
  )
}
