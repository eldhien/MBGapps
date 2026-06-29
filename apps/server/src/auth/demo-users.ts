import type { UserRole } from "./roles.js"

type DemoUser = {
  id: string
  username: string
  password: string
  role: UserRole
  createdAt: Date
}

export const demoUsers: DemoUser[] = [
  {
    id: "demo-superadmin",
    username: "superadmin",
    password: "superadmin",
    role: "SUPER_ADMIN",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
]

export function findDemoUserById(id?: string | null) {
  return demoUsers.find((user) => user.id === id) ?? null
}

export function findDemoUserByUsername(username?: string | null) {
  return demoUsers.find((user) => user.username === username) ?? null
}

export function sanitizeDemoUser(user: DemoUser) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  }
}

export function listDemoUsers() {
  return demoUsers.map(sanitizeDemoUser)
}
