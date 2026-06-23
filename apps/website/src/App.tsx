import { Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { RoleRoute } from "@/features/navigation/RoleRoute"
import { navigationPages } from "@/features/navigation/navigation"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { FoodReportsPage } from "@/pages/FoodReportsPage"
import { KitchenChecklistPage } from "@/pages/KitchenChecklistPage"
import { LoginPage } from "@/pages/LoginPage"
import { StudentComplaintsPage } from "@/pages/StudentComplaintsPage"
import { SchoolAccountsPage } from "@/pages/SchoolAccountsPage"
import { UsersPage } from "@/pages/UsersPage"

const implementedPaths = new Set([
  "/dashboard",
  "/users",
  "/cleanliness-reports",
  "/cleanliness-reports/upload",
  "/cleanliness-reports/history",
  "/food-reports",
  "/student-complaints",
])

const comingSoonPages = navigationPages.filter(
  (page) => !implementedPaths.has(page.path)
)
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
          path="/kitchen-checklist"
          element={<Navigate to="/cleanliness-reports/upload" replace />}
        />
        <Route
          path="/kitchen-checklist/upload"
          element={<Navigate to="/cleanliness-reports/upload" replace />}
        />
        <Route
          path="/kitchen-checklist/history"
          element={<Navigate to="/cleanliness-reports/history" replace />}
        />
        <Route
          path="/cleanliness-reports"
          element={<Navigate to="/cleanliness-reports/upload" replace />}
        />
        <Route
          path="/cleanliness-reports/upload"
          element={
            <RoleRoute>
              <KitchenChecklistPage mode="upload" />
            </RoleRoute>
          }
        />
        <Route
          path="/cleanliness-reports/history"
          element={
            <RoleRoute>
              <KitchenChecklistPage mode="history" />
            </RoleRoute>
          }
        />
        <Route
          path="/food-reports"
          element={
            <RoleRoute>
              <FoodReportsPage mode="create" />
            </RoleRoute>
          }
        />
        <Route
          path="/food-reports/create"
          element={<Navigate to="/food-reports" replace />}
        />
        <Route
          path="/food-reports/history"
          element={<Navigate to="/food-reports" replace />}
        />
        <Route
          path="/student-complaints"
          element={
            <RoleRoute>
              <StudentComplaintsPage mode="create" />
            </RoleRoute>
          }
        />
        <Route
          path="/student-complaints/create"
          element={<Navigate to="/student-complaints" replace />}
        />
        <Route
          path="/student-complaints/history"
          element={<Navigate to="/student-complaints" replace />}
        />
        {comingSoonPages.map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={
              <RoleRoute>
                <ComingSoonPage features={page.features} title={page.title} />
              </RoleRoute>
            }
          />
        ))}
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
