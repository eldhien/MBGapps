export const webRoles = ["SUPER_ADMIN", "SPPG", "SEKOLAH", "DRIVER"] as const

export type WebRole = (typeof webRoles)[number]
export type UserRole = WebRole

export function canAccessWebsite(role?: string | null) {
  return webRoles.includes(role as WebRole)
}

export function isWebRole(role: string): role is WebRole {
  return canAccessWebsite(role)
}
