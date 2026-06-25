import { Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { RoleRoute } from "@/features/navigation/RoleRoute"
import { navigationPages } from "@/features/navigation/navigation"
import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { DistributionPage } from "@/pages/DistributionPage"
import { DriversPage } from "@/pages/DriversPage"
import { FoodReportsPage } from "@/pages/FoodReportsPage"
import { KitchenChecklistPage } from "@/pages/KitchenChecklistPage"
import { LoginPage } from "@/pages/LoginPage"
import { SchoolDistributionsPage } from "@/pages/SchoolDistributionsPage"
import { StudentComplaintsPage } from "@/pages/StudentComplaintsPage"
import { SchoolAccountsPage } from "@/pages/SchoolAccountsPage"
import { UsersPage } from "@/pages/UsersPage"
import { BatchListPage } from "@/pages/batch/BatchListPage"
import { BatchCreatePage } from "@/pages/batch/BatchCreatePage"

const implementedPaths = new Set([
  "/dashboard",
  "/users",
  "/school-accounts",
  "/batch",
  "/batch/create",
  "/distribution",
  "/distribution/history",
  "/master-data/drivers",
  "/reports",
  "/receiving-validation",
  "/cleanliness-reports",
  "/cleanliness-reports/upload",
  "/cleanliness-reports/history",
  "/food-reports",
  "/student-complaints",
  "/reports/school-reports",
  "/reports/student-complaints",
  "/reports/export-pdf",
  "/reports/complaint-patterns-ai",
])

const comingSoonPages = navigationPages.filter(
  (page) => !implementedPaths.has(page.path)
)

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
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
        <Route
          path="/distribution"
          element={
            <RoleRoute>
              <DistributionPage mode="create" />
            </RoleRoute>
          }
        />
        <Route
          path="/distribution/history"
          element={
            <RoleRoute>
              <DistributionPage mode="history" />
            </RoleRoute>
          }
        />
        <Route
          path="/master-data/drivers"
          element={
            <RoleRoute>
              <DriversPage />
            </RoleRoute>
          }
        />
        <Route
          path="/master-data/school-reports"
          element={<Navigate to="/reports/school-reports" replace />}
        />
        <Route
          path="/master-data/batch-history"
          element={<Navigate to="/batch" replace />}
        />
        <Route
          path="/master-data/distribution-history"
          element={<Navigate to="/distribution/history" replace />}
        />
        <Route
          path="/reports"
          element={<Navigate to="/reports/school-reports" replace />}
        />
        <Route
          path="/reports/school-reports"
          element={
            <RoleRoute>
              <ComingSoonPage
                title="Riwayat Laporan Sekolah"
                features={["Riwayat laporan sekolah akan tersedia di sini."]}
              />
            </RoleRoute>
          }
        />
        <Route
          path="/reports/student-complaints"
          element={
            <RoleRoute>
              <ComingSoonPage
                title="Riwayat Keluhan Siswa"
                features={["Riwayat keluhan siswa akan tersedia di sini."]}
              />
            </RoleRoute>
          }
        />
        <Route
          path="/reports/export-pdf"
          element={
            <RoleRoute>
              <ComingSoonPage
                title="Export Laporan PDF"
                features={[
                  "Export laporan PDF: produksi, distribusi, risiko, keluhan.",
                ]}
              />
            </RoleRoute>
          }
        />
        <Route
          path="/reports/complaint-patterns-ai"
          element={
            <RoleRoute>
              <ComingSoonPage
                title="Deteksi Pola Keluhan Siswa (AI)"
                features={[
                  "Deteksi pola keluhan siswa lintas sekolah untuk evaluasi SPPG.",
                ]}
              />
            </RoleRoute>
          }
        />
        <Route
          path="/receiving-validation"
          element={
            <RoleRoute>
              <SchoolDistributionsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/school-distributions"
          element={<Navigate to="/receiving-validation" replace />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
