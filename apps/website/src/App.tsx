import { Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { RoleRoute } from "@/features/navigation/RoleRoute"
import { navigationPages } from "@/features/navigation/navigation"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { LoginPage } from "@/pages/LoginPage"
import { SchoolAccountsPage } from "@/pages/SchoolAccountsPage"
import { UsersPage } from "@/pages/UsersPage"
import { BatchListPage } from "@/pages/batch/BatchListPage"
import { BatchCreatePage } from "@/pages/batch/BatchCreatePage"
import { BatchScanPage } from "@/pages/batch/BatchScanPage"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/batch-info/*" element={<BatchScanPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/users"
          element={
            <RoleRoute>
              <UsersPage />
            </RoleRoute>
          }
        />
        <Route
          path="/school-accounts"
          element={
            <RoleRoute>
              <SchoolAccountsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/batch"
          element={
            <RoleRoute>
              <BatchListPage />
            </RoleRoute>
          }
        />
        <Route
          path="/batch/create"
          element={
            <RoleRoute allowedRoles={["SUPER_ADMIN", "SPPG"]}>
              <BatchCreatePage />
            </RoleRoute>
          }
        />
        {navigationPages
          .filter(
            (page) =>
              !["dashboard", "users", "schoolAccounts", "batch"].includes(
                page.key
              )
          )
          .map((page) => (
            <Route
              key={page.key}
              path={page.path}
              element={
                <RoleRoute>
                  <ComingSoonPage title={page.title} features={page.features} />
                </RoleRoute>
              }
            />
          ))}
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
