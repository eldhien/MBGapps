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
  batchId: string | null
  createdAt: string
  updatedAt: string
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

export type ProductionDistribution = {
  id: string
  batchId: string
  waktuKirim: string | null
  status: string
  createdAt: string
  batch: any
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
  batch: {
    id: string
    status: string
    createdAt: string
    menu?: { name: string } | null
    driver?: { name: string; vehicleNumber?: string | null } | null
    foto?: { id: string; jenis: string; url: string }[]
  }
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
      return request<any[]>("/production-batches")
    },
    get(id: string) {
      return request<any>(`/production-batches/${encodeURIComponent(id)}`)
    },
    create(payload: any) {
      return request<any>("/production-batches", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    update(id: string, payload: {
      namaMenu?: string
      totalPorsi?: number
      varian?: any[]
      waktuMulai?: string
      waktuSelesai?: string
    }) {
      return request<any>(`/production-batches/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    updateStatus(id: string, payload: { status: string; catatanKualitas?: string }) {
      return request<any>(`/production-batches/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    },
    updateDelivery(id: string, payload: { driverId?: string; noKendaraan?: string; jamKeberangkatan?: string }) {
      return request<any>(`/production-batches/${encodeURIComponent(id)}/delivery`, {
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
      return response.json()
    }
  },
  menus: {
    list() {
      return request<any[]>("/menus")
    },
    create(payload: { name: string; category: string }) {
      return request<any>("/menus", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    }
  },
  settings: {
    getDapurCapacity(date?: string) {
      const query = date ? `?date=${date}` : ""
      return request<any>(`/settings/dapur${query}`)
    },
    setDapurCapacity(payload: { date: string; capacity: number }) {
      return request<any>("/settings/dapur", {
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
      if (payload.status === "DITERIMA" && payload.file) {
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
    analytics() {
      return request<{ data: DashboardAnalytics }>("/dashboard/analytics")
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
