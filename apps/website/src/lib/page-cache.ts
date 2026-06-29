export const pageCacheKeys = {
  batches: "batches:list",
  dashboardAnalytics: "dashboard:analytics",
  drivers: "drivers:list",
  activeDrivers: "drivers:list:active",
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

function getCacheScope() {
  if (typeof window === "undefined") {
    return "server"
  }

  const token = window.localStorage.getItem("mbg_session")

  if (!token) {
    return "anonymous"
  }

  let hash = 0
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0
  }

  return `session:${hash.toString(36)}`
}

function getScopedPageCacheKey(key: string) {
  return `${getCacheScope()}:${key}`
}

export function getCachedPageData<T>(key: string) {
  return pageCache.get(getScopedPageCacheKey(key)) as T | undefined
}

export function setCachedPageData<T>(key: string, data: T) {
  const scopedKey = getScopedPageCacheKey(key)
  pageCache.set(scopedKey, data)

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(pageCacheEventName, {
        detail: { data, key: scopedKey },
      })
    )
  }

  return data
}

export function clearCachedPageData(key: string) {
  const scopedKey = getScopedPageCacheKey(key)
  pageCache.delete(scopedKey)

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(pageCacheEventName, {
        detail: { data: undefined, key: scopedKey },
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

  const scopedKey = getScopedPageCacheKey(key)
  const handleCacheUpdate = (event: Event) => {
    const detail = (event as CustomEvent<{ data?: T; key: string }>).detail

    if (detail?.key === scopedKey) {
      listener(detail.data)
    }
  }

  window.addEventListener(pageCacheEventName, handleCacheUpdate)

  return () => {
    window.removeEventListener(pageCacheEventName, handleCacheUpdate)
  }
}
