import type React from "react"
import type { UserRole } from "@/features/auth/types"
import { useAuth } from "@/features/auth/AuthProvider"
import { canAccessPage, findNavigationPage } from "@/features/navigation/navigation"
import { Navigate, useLocation } from "react-router-dom"

export function RoleRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) {
  const location = useLocation()
  const { profile } = useAuth()
  
  if (allowedRoles) {
    if (!profile || !allowedRoles.includes(profile.role)) {
      return <Navigate to="/dashboard" replace />
    }
    return children
  }

  const page = findNavigationPage(location.pathname)

  if (!page || !canAccessPage(page, profile?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
