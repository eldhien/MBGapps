import type {
  BatchPhoto,
  ProductionBatch,
  ProductionDistribution,
} from "@/lib/api"

export function getCurrentDateTimeLocal() {
  const value = new Date()
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 16)
}

export function toDateTimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export function dateTimeLocalToISOString(value?: string | null) {
  if (!value) return undefined

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

export function formatDistributionId(distribution: ProductionDistribution) {
  const date = new Date(distribution.createdAt || distribution.waktuKirim || "")
  const datePart = Number.isNaN(date.getTime())
    ? "00000000"
    : [
        String(date.getDate()).padStart(2, "0"),
        String(date.getMonth() + 1).padStart(2, "0"),
        date.getFullYear(),
      ].join("")
  const suffix =
    distribution.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() ||
    "000000"

  return `DST-${datePart}-${suffix}`
}

export function getDistributionStatus(distribution: ProductionDistribution) {
  return distribution.schools.some((item) => item.status === "DITOLAK")
    ? "DITOLAK"
    : distribution.status
}

export function getBatchTotalPortions(batch: ProductionBatch | undefined | null) {
  return Number(batch?.totalPorsi ?? batch?.jumlahPorsi ?? 0)
}

export function getDistributionTotalPortions(
  distribution: ProductionDistribution
) {
  return distribution.schools.reduce(
    (total, school) => total + Number(school.jumlahPorsi || 0),
    0
  )
}

export function getAllocatedBatchPortions(
  distributions: ProductionDistribution[],
  batchId: string | undefined,
  excludeDistributionId?: string
) {
  if (!batchId) return 0

  return distributions
    .filter(
      (distribution) =>
        distribution.batchId === batchId &&
        distribution.id !== excludeDistributionId
    )
    .reduce(
      (total, distribution) => total + getDistributionTotalPortions(distribution),
      0
    )
}

export function getBatchRemainingPortions(
  batch: ProductionBatch | undefined | null,
  distributions: ProductionDistribution[],
  excludeDistributionId?: string
) {
  if (!batch) return 0

  return Math.max(
    0,
    getBatchTotalPortions(batch) -
      getAllocatedBatchPortions(distributions, batch.id, excludeDistributionId)
  )
}

export function getBatchFoodPhotos(
  batch: Pick<ProductionBatch, "foto"> | undefined | null
) {
  return [...(batch?.foto ?? [])]
    .filter((item: BatchPhoto) => !item.jenis || item.jenis === "MAKANAN_JADI")
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
}

export function getLatestFoodPhotoUrl(
  batch: Pick<ProductionBatch, "foto"> | undefined | null
) {
  return getBatchFoodPhotos(batch)[0]?.url ?? null
}
