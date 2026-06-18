import type { UserProfile, UserRole } from "@/features/auth/types"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000"
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
    await request<null>("/auth/logout", { method: "POST" })
    clearAccessToken()
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
}
