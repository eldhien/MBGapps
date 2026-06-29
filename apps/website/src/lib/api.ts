import type { UserProfile, UserRole } from "@/features/auth/types"

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:4000"
).replace(/\/$/, "")
const TOKEN_KEY = "mbg_session"

type AuthSession = {
  access_token: string
}

type AuthResponse = {
  user: UserProfile
  session?: AuthSession | null
}

export type ManagedUser = {
  id: string
  username: string
  role: UserRole
  createdAt: string
}

export type BatchSummary = {
  id: string
  batchIdUnik: string
  jumlahPorsi?: number
  namaMenu: string
  waktuProduksi: string
  status: string
}

export type DashboardAnalytics = {
  totalBatches: number
  totalDistributions: number
  pendingDistributions: number
  deliveredDistributions: number
  totalFoodReports: number
  totalStudentComplaints: number
  dailyActivity?: { label: string; value: number }[]
  distributionActivity?: { label: string; value: number }[]
  latestMonitoring?: {
    id: string
    category: string
    origin: string
    destination: string
    total: number
    status: string
    tone: "success" | "warning" | "danger"
    updatedAt: string
  }[]
}

export type DashboardTopbarData = {
  batches: BatchSummary[]
  foodReports: FoodReport[]
}

export type FoodReportCategory =
  | "BASI"
  | "RUSAK"
  | "TERLAMBAT"
  | "SUHU_TIDAK_SESUAI"
  | "LAINNYA"

export type FoodReportStatus = "PENDING" | "REVIEWED" | "RESOLVED"

export type FoodReport = {
  id: string
  kategori: FoodReportCategory
  kategoriLainnya: string | null
  deskripsi: string
  sekolahId: string
  sekolahUsername?: string
  batchId: string | null
  status: FoodReportStatus
  createdAt: string
  updatedAt: string
}

export type StudentComplaint = {
  id: string
  jumlahSiswa: number
  gejala: string
  waktuKejadian: string
  tindakan: string
  sekolahId: string
  sekolahUsername?: string
  batchId: string | null
  createdAt: string
  updatedAt: string
}

export type ComplaintAnalysisPeriod = "24h" | "7d" | "30d" | "all"
export type ComplaintDangerCategory = "Ringan" | "Sedang" | "Berat"
export type ComplaintTrendStatus = "Normal" | "Meningkat" | "Akselerasi Tinggi"

export type ComplaintAnalysisPattern = {
  action: string
  batches: {
    id: string
    driverName: string | null
    menuName: string | null
    route: string | null
    status: string | null
    distributions: {
      id: string
      status: string
      waktuKirim: string | null
      schools: {
        schoolId: string
        schoolName: string
        status: string
      }[]
    }[]
  }[]
  category: ComplaintDangerCategory
  confidence: number
  evaluationFocus: string[]
  latestDate: string | null
  matchedTerms: string[]
  riskReasons: string[]
  schools: string[]
  symptom: string
  totalComplaints: number
  totalStudents: number
}

export type ComplaintAnalysis = {
  generatedAt: string
  patterns: ComplaintAnalysisPattern[]
  period: ComplaintAnalysisPeriod
  stats: {
    crossSchoolPatterns: number
    severePatterns: number
    totalComplaints: number
    totalStudents: number
  }
  summary: {
    conclusion: string
    evaluationFocus: string[]
    topPattern: ComplaintAnalysisPattern | null
  }
  batchAnomalies: {
    batchId: string
    menuName: string | null
    driverName: string | null
    affectedSchools: string[]
    totalComplaints: number
  }[]
  trend: {
    status: ComplaintTrendStatus
    rate: number
  }
}

export type KitchenChecklist = {
  id: string
  apdPhoto: string
  alatPhoto: string
  kebersihanPhoto: string
  timestamp: string
  kondisiDapur: string
  createdAt: string
  updatedAt: string
}

export type CreateFoodReportPayload = {
  kategori: FoodReportCategory
  kategoriLainnya?: string | null
  deskripsi: string
  batchId?: string
}

export type CreateStudentComplaintPayload = {
  jumlahSiswa: number
  gejala: string
  waktuKejadian: string
  tindakan: string
  batchId?: string
}

export type CreateKitchenChecklistPayload = {
  apdPhoto: string
  alatPhoto: string
  kebersihanPhoto: string
  kondisiDapur: string
}

export type UploadKitchenChecklistPhotoPayload = {
  field: string
  photo: string
}

export type UploadedKitchenChecklistPhoto = {
  publicId: string
  url: string
}

export type SchoolAccount = {
  id: string
  name: string
  npsn: string | null
  address: string | null
  createdAt: string
  sppg: {
    id: string
    username: string
  }
  account: {
    id: string
    username: string
  } | null
  progress: {
    status: string
    notes: string | null
    updatedAt: string
  } | null
}

export type Driver = {
  id: string
  name: string
  phone: string | null
  vehicleNumber: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type MenuMaster = {
  id: string
  name: string
  category: string
  createdAt?: string
  updatedAt?: string
}

export type BatchIngredient = {
  id?: string
  namaBahan: string
  jumlah?: number | null
  satuan?: string | null
  harga?: number | null
  kategori?: string | null
}

export type BatchVariant = {
  id?: string
  namaVarian: string
  jumlahPorsi: number
  energi?: number | null
  protein?: number | null
  lemak?: number | null
  karbohidrat?: number | null
  serat?: number | null
  bahan?: BatchIngredient[]
}

export type BatchPhoto = {
  id: string
  batchId?: string
  jenis?: "PROSES_MASAK" | "MAKANAN_JADI" | string | null
  url: string
  createdAt?: string
  updatedAt?: string
  publicId?: string
}

export type ProductionBatch = {
  id: string
  menuId?: string
  menu?: MenuMaster | null
  totalPorsi: number
  jumlahPorsi?: number
  status: string
  createdAt?: string
  updatedAt?: string
  waktuMulai?: string | null
  waktuSelesai?: string | null
  waktuProduksi?: string | null
  driverId?: string | null
  petugas?: { id: string; role?: UserRole; username: string } | null
  driver?: Driver | null
  foto?: BatchPhoto[]
  varian?: BatchVariant[]
  catatanKualitas?: string | null
  noKendaraan?: string | null
  ruteDistribusi?: string | null
  jamKeberangkatan?: string | null
}

export type CreateProductionBatchPayload = {
  namaMenu: string
  totalPorsi: number
  waktuMulai?: string
  waktuSelesai?: string
  varian?: {
    bahan?: {
      harga?: number | null
      jumlah?: number | null
      kategori?: string | null
      namaBahan: string
      satuan?: string
    }[]
    jumlahPorsi?: number
    namaVarian?: string
  }[]
}

export type DapurCapacity = {
  id?: string
  date: string
  capacity: number
  createdAt?: string
  updatedAt?: string
}

export type ProductionDistribution = {
  id: string
  batchId: string
  waktuKirim: string | null
  status: string
  createdAt: string
  batch: ProductionBatch | null
  schools: {
    id: string
    jumlahPorsi: number
    status: string
    receivedAt: string | null
    rejectedReason: string | null
    school: {
      id: string
      name: string
      npsn: string | null
      address: string | null
    }
  }[]
}

export type SchoolDistribution = {
  id: string
  jumlahPorsi: number
  status: string
  receivedAt: string | null
  rejectedReason: string | null
  buktiTerimaFotoUrl: string | null
  distribution: {
    id: string
    waktuKirim: string | null
    status: string
    fotoDikemasUrl: string | null
  }
  batch: ProductionBatch
}

async function request<T>(path: string, options: RequestInit = {}) {
  const token = getAccessToken()
  const headers = new Headers(options.headers)

  headers.set("Content-Type", "application/json")

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearAccessToken()
    window.location.href = "/login"
    throw new Error("Sesi berakhir. Silakan login kembali.")
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string
      error?: string
    } | null

    throw new Error(payload?.error ? `${payload.message}: ${payload.error}` : (payload?.message ?? "Request gagal."))
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export const api = {
  async login(payload: { password: string; username: string }) {
    const response = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if (response.session?.access_token) {
      setAccessToken(response.session.access_token)
    }

    return response
  },
  me() {
    return request<AuthResponse>("/auth/me")
  },
  async logout() {
    try {
      await request<null>("/auth/logout", {
        method: "POST",
      })
    } finally {
      clearAccessToken()
    }
  },
  users: {
    list() {
      return request<{ users: ManagedUser[] }>("/users")
    },
    create(payload: { password: string; role: UserRole; username: string }) {
      return request<{ user: ManagedUser }>("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    update(
      id: string,
      payload: { password?: string; role?: UserRole; username?: string }
    ) {
      return request<{ user: ManagedUser }>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    async delete(id: string) {
      await request<null>(`/users/${id}`, { method: "DELETE" })
    },
  },
  schoolAccounts: {
    list() {
      return request<{ schools: SchoolAccount[] }>("/school-accounts")
    },
    create(payload: {
      address?: string
      password: string
      schoolName: string
      sppgId?: string
      username: string
    }) {
      return request<{ school: SchoolAccount }>("/school-accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    update(id: string, payload: {
      address?: string
      password?: string
      schoolName?: string
      sppgId?: string
      username?: string
    }) {
      return request<{ school: SchoolAccount }>(`/school-accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    async delete(id: string) {
      await request<null>(`/school-accounts/${id}`, {
        method: "DELETE",
      })
    },
  },
  batches: {
    list() {
      return request<{ data: BatchSummary[] }>("/batches")
    },
  },
  drivers: {
    list(options?: { active?: boolean }) {
      const query = options?.active ? "?active=true" : ""
      return request<{ drivers: Driver[] }>(`/drivers${query}`)
    },
    create(payload: { name: string; phone?: string; vehicleNumber?: string }) {
      return request<{ driver: Driver }>("/drivers", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    update(
      id: string,
      payload: {
        isActive?: boolean
        name?: string
        phone?: string
        vehicleNumber?: string
      }
    ) {
      return request<{ driver: Driver }>(`/drivers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    async delete(id: string) {
      await request<null>(`/drivers/${id}`, {
        method: "DELETE",
      })
    },
  },
  productionBatches: {
    list() {
      return request<ProductionBatch[]>("/production-batches")
    },
    get(id: string) {
      return request<ProductionBatch>(`/production-batches/${encodeURIComponent(id)}`)
    },
    create(payload: CreateProductionBatchPayload) {
      return request<ProductionBatch>("/production-batches", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    update(id: string, payload: {
      namaMenu?: string
      totalPorsi?: number
      varian?: CreateProductionBatchPayload["varian"]
      waktuMulai?: string
      waktuSelesai?: string
    }) {
      return request<ProductionBatch>(`/production-batches/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    updateStatus(id: string, payload: { status: string; catatanKualitas?: string }) {
      return request<ProductionBatch>(`/production-batches/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    updateDelivery(id: string, payload: { driverId?: string; noKendaraan?: string; jamKeberangkatan?: string }) {
      return request<ProductionBatch>(`/production-batches/${encodeURIComponent(id)}/delivery`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    async delete(id: string) {
      await request<null>(`/production-batches/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
    },
    async uploadPhoto(id: string, file: File, jenis: "PROSES_MASAK" | "MAKANAN_JADI") {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("jenis", jenis)

      const token = getAccessToken()
      const headers = new Headers()
      if (token) headers.set("Authorization", `Bearer ${token}`)
      
      const response = await fetch(`${API_URL}/batches/${encodeURIComponent(id)}/upload`, {
        method: "POST",
        headers,
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Upload failed with status:", response.status, errorText)
        throw new Error(`Gagal mengunggah foto: ${errorText}`)
      }
      return response.json() as Promise<BatchPhoto>
    }
  },
  menus: {
    list() {
      return request<MenuMaster[]>("/menus")
    },
    create(payload: { name: string; category: string }) {
      return request<MenuMaster>("/menus", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    }
  },
  settings: {
    getDapurCapacity(date?: string) {
      const query = date ? `?date=${date}` : ""
      return request<DapurCapacity>(`/settings/dapur${query}`)
    },
    setDapurCapacity(payload: { date: string; capacity: number }) {
      return request<DapurCapacity>("/settings/dapur", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    }
  },
  productionDistributions: {
    list() {
      return request<{ distributions: ProductionDistribution[] }>(
        "/production-distributions"
      )
    },
    create(payload: {
      batchId: string
      driverId: string
      schools: { schoolId: string; jumlahPorsi: number }[]
      status?: string
      waktuKirim?: string
    }) {
      return request<{ distribution: ProductionDistribution }>(
        "/production-distributions",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )
    },
    update(id: string, payload: {
      batchId?: string
      driverId?: string
      schools?: { schoolId: string; jumlahPorsi: number }[]
      status?: string
      waktuKirim?: string
    }) {
      return request<{ distribution: ProductionDistribution }>(
        `/production-distributions/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      )
    },
    async delete(id: string) {
      await request<null>(`/production-distributions/${id}`, {
        method: "DELETE",
      })
    },
  },
  schoolDistributions: {
    list() {
      return request<{ distributions: SchoolDistribution[] }>(
        "/school-distributions"
      )
    },
    updateStatus(
      id: string,
      payload: { rejectedReason?: string; status: "DITERIMA" | "DITOLAK"; file?: File | null }
    ) {
      if (payload.file) {
        const formData = new FormData()
        formData.append("status", payload.status)
        formData.append("file", payload.file)
        if (payload.rejectedReason) formData.append("rejectedReason", payload.rejectedReason)
        const token = getAccessToken()
        return fetch(`${API_URL}/school-distributions/${id}/status`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }).then(async (res) => {
          if (!res.ok) {
            const payload = await res.json().catch(() => null)
            throw new Error(payload?.message ?? "Gagal memperbarui status.")
          }
          return res.json() as Promise<{ distribution: SchoolDistribution }>
        })
      }
      return request<{ distribution: SchoolDistribution }>(
        `/school-distributions/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      )
    },
  },
  dashboard: {
    analytics(month?: string) {
      const query = month ? `?month=${encodeURIComponent(month)}` : ""
      return request<{ data: DashboardAnalytics }>(`/dashboard/analytics${query}`)
    },
    topbar() {
      return request<{ data: DashboardTopbarData }>("/dashboard/topbar")
    },
  },
  foodReports: {
    list() {
      return request<{ data: FoodReport[] }>("/food-reports")
    },
    create(payload: CreateFoodReportPayload) {
      return request<{ data: FoodReport }>("/food-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
  },
  studentComplaints: {
    list() {
      return request<{ data: StudentComplaint[] }>("/student-complaints")
    },
    analysis(period: ComplaintAnalysisPeriod) {
      return request<{ data: ComplaintAnalysis }>(
        `/student-complaints/analysis?period=${encodeURIComponent(period)}`
      )
    },
    create(payload: CreateStudentComplaintPayload) {
      return request<{ data: StudentComplaint }>("/student-complaints", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
  },
  kitchenChecklists: {
    list() {
      return request<{ data: KitchenChecklist[] }>("/cleanliness-reports")
    },
    uploadPhoto(payload: UploadKitchenChecklistPhotoPayload) {
      return request<{ data: UploadedKitchenChecklistPhoto }>(
        "/cleanliness-reports/photos",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )
    },
    create(payload: CreateKitchenChecklistPayload) {
      return request<{ data: KitchenChecklist }>("/cleanliness-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    update(id: string, payload: CreateKitchenChecklistPayload) {
      return request<{ data: KitchenChecklist }>(`/cleanliness-reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    async delete(id: string) {
      await request<null>(`/cleanliness-reports/${id}`, { method: "DELETE" })
    },
  },
}
