export const pageCacheKeys = {
  batches: "batches:list",
  dashboardAnalytics: "dashboard:analytics",
  drivers: "drivers:list",
  foodReports: "food-reports:list",
  kitchenChecklists: "kitchen-checklists:list",
  productionBatches: "production-batches:list",
  productionDistributions: "production-distributions:list",
  schoolAccounts: "school-accounts:list",
  schoolDistributions: "school-distributions:list",
  studentComplaintAnalysis: "student-complaints:analysis",
  studentComplaints: "student-complaints:list",
  users: "users:list",
} as const

const pageCache = new Map<string, unknown>()

const pageCacheEventName = "mbg:page-cache-updated"

export function getCachedPageData<T>(key: string) {
  return pageCache.get(key) as T | undefined
}

export function setCachedPageData<T>(key: string, data: T) {
  pageCache.set(key, data)

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(pageCacheEventName, {
        detail: { data, key },
      })
    )
  }

  return data
}

export function clearCachedPageData(key: string) {
  pageCache.delete(key)

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(pageCacheEventName, {
        detail: { data: undefined, key },
      })
    )
  }
}

export function subscribePageCache<T>(
  key: string,
  listener: (data: T | undefined) => void
) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleCacheUpdate = (event: Event) => {
    const detail = (event as CustomEvent<{ data?: T; key: string }>).detail

    if (detail?.key === key) {
      listener(detail.data)
    }
  }

  window.addEventListener(pageCacheEventName, handleCacheUpdate)

  return () => {
    window.removeEventListener(pageCacheEventName, handleCacheUpdate)
  }
}
