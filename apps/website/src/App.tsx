import { Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { RoleRoute } from "@/features/navigation/RoleRoute"
import { DashboardPage } from "@/pages/DashboardPage"
import { FoodReportsPage } from "@/pages/FoodReportsPage"
import { KitchenChecklistPage } from "@/pages/KitchenChecklistPage"
import { LoginPage } from "@/pages/LoginPage"
import { StudentComplaintsPage } from "@/pages/StudentComplaintsPage"
import { UsersPage } from "@/pages/UsersPage"

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
          element={
            <RoleRoute>
              <KitchenChecklistPage />
            </RoleRoute>
          }
        />
        <Route
          path="/food-reports"
          element={
            <RoleRoute>
              <FoodReportsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/student-complaints"
          element={
            <RoleRoute>
              <StudentComplaintsPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
