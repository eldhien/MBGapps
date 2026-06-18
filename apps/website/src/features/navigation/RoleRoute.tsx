import type React from "react"
import { useAuth } from "@/features/auth/AuthProvider"
import { canAccessPage, findNavigationPage } from "@/features/navigation/navigation"
import { Navigate, useLocation } from "react-router-dom"

export function RoleRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { profile } = useAuth()
  const page = findNavigationPage(location.pathname)

  if (!page || !canAccessPage(page, profile?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
