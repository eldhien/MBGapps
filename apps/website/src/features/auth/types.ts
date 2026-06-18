export const webRoles = ["SUPER_ADMIN", "SPPG", "SEKOLAH"] as const

export type WebRole = (typeof webRoles)[number]
export type UserRole = WebRole

export type UserProfile = {
  id: string
  username: string
  role: UserRole
}

export function canAccessWebsite(role?: UserRole | null) {
  return role ? webRoles.includes(role) : false
}

export function formatRole(role?: UserRole | null) {
  if (role === "SUPER_ADMIN") return "Super Admin"
  if (role === "SPPG") return "SPPG"
  if (role === "SEKOLAH") return "Sekolah"
  return "Belum ada role"
}
