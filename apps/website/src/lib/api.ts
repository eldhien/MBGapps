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
    } | null

    throw new Error(payload?.message ?? "Request gagal.")
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
  batches: {
    list() {
      return request<{ data: BatchSummary[] }>("/batches")
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
