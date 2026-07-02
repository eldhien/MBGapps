import { FoodReportStatus, type ReportCategory } from "@prisma/client"

type KitchenChecklistRecord = {
  id: string
  apdPhoto: string
  alatPhoto: string
  kebersihanPhoto: string
  kondisiDapur: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

type FoodReportRecord = {
  id: string
  kategori: ReportCategory
  kategoriLainnya: string | null
  deskripsi: string
  sekolahId: string
  batchId: string | null
  status: FoodReportStatus
  createdAt: Date
  updatedAt: Date
}

type StudentComplaintRecord = {
  id: string
  jenisLaporan: "KELUHAN_MEDIS" | "KELUHAN_UMUM" | "PUJIAN" | "LAINNYA"
  jumlahSiswa: number
  gejala: string
  waktuKejadian: Date
  tindakan: string
  sekolahId: string
  batchId: string | null
  createdAt: Date
  updatedAt: Date
}

const fallbackStore = {
  foodReports: [] as FoodReportRecord[],
  kitchenChecklists: [] as KitchenChecklistRecord[],
  studentComplaints: [] as StudentComplaintRecord[],
}

function sortByDateDesc<T extends { createdAt: Date }>(items: T[]) {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function listFallbackKitchenChecklists() {
  return sortByDateDesc(fallbackStore.kitchenChecklists)
}

export function createFallbackKitchenChecklist(
  data: Omit<KitchenChecklistRecord, "createdAt" | "id" | "updatedAt">
) {
  const now = new Date()
  const item: KitchenChecklistRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  }

  fallbackStore.kitchenChecklists.unshift(item)
  return item
}

export function updateFallbackKitchenChecklist(
  id: string,
  data: Pick<
    KitchenChecklistRecord,
    "alatPhoto" | "apdPhoto" | "kebersihanPhoto" | "kondisiDapur"
  >
) {
  const item = fallbackStore.kitchenChecklists.find(
    (checklist) => checklist.id === id
  )

  if (!item) {
    return null
  }

  item.apdPhoto = data.apdPhoto
  item.alatPhoto = data.alatPhoto
  item.kebersihanPhoto = data.kebersihanPhoto
  item.kondisiDapur = data.kondisiDapur
  item.updatedAt = new Date()

  return item
}

export function deleteFallbackKitchenChecklist(id: string) {
  const itemIndex = fallbackStore.kitchenChecklists.findIndex(
    (checklist) => checklist.id === id
  )

  if (itemIndex === -1) {
    return false
  }

  fallbackStore.kitchenChecklists.splice(itemIndex, 1)
  return true
}

export function listFallbackFoodReports(sekolahId?: string) {
  const items = sekolahId
    ? fallbackStore.foodReports.filter((item) => item.sekolahId === sekolahId)
    : fallbackStore.foodReports

  return sortByDateDesc(items)
}

export function createFallbackFoodReport(
  data: Omit<FoodReportRecord, "createdAt" | "id" | "status" | "updatedAt">
) {
  const now = new Date()
  const item: FoodReportRecord = {
    id: crypto.randomUUID(),
    status: FoodReportStatus.PENDING,
    createdAt: now,
    updatedAt: now,
    ...data,
  }

  fallbackStore.foodReports.unshift(item)
  return item
}

export function listFallbackStudentComplaints(sekolahId?: string) {
  const items = sekolahId
    ? fallbackStore.studentComplaints.filter((item) => item.sekolahId === sekolahId)
    : fallbackStore.studentComplaints

  return sortByDateDesc(items)
}

export function createFallbackStudentComplaint(
  data: Omit<StudentComplaintRecord, "createdAt" | "id" | "updatedAt">
) {
  const now = new Date()
  const item: StudentComplaintRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  }

  fallbackStore.studentComplaints.unshift(item)
  return item
}

export function getFallbackDashboardAnalytics(sekolahId?: string) {
  const foodReports = sekolahId
    ? fallbackStore.foodReports.filter((item) => item.sekolahId === sekolahId)
    : fallbackStore.foodReports
  const studentComplaints = sekolahId
    ? fallbackStore.studentComplaints.filter((item) => item.sekolahId === sekolahId)
    : fallbackStore.studentComplaints

  return {
    totalBatches: 0,
    totalDistributions: 0,
    pendingDistributions: 0,
    deliveredDistributions: 0,
    totalFoodReports: foodReports.length,
    totalStudentComplaints: studentComplaints.length,
    dailyActivity: [],
    distributionActivity: [],
    latestMonitoring: [],
  }
}
