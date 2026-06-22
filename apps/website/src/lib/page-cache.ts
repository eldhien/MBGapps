export const pageCacheKeys = {
  batches: "batches:list",
  dashboardAnalytics: "dashboard:analytics",
  foodReports: "food-reports:list",
  kitchenChecklists: "kitchen-checklists:list",
  studentComplaints: "student-complaints:list",
  users: "users:list",
} as const

const pageCache = new Map<string, unknown>()

export function getCachedPageData<T>(key: string) {
  return pageCache.get(key) as T | undefined
}

export function setCachedPageData<T>(key: string, data: T) {
  pageCache.set(key, data)
  return data
}

export function clearCachedPageData(key: string) {
  pageCache.delete(key)
}
