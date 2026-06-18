import { ComingSoonPage } from "@/pages/ComingSoonPage"
import { findNavigationPage } from "@/features/navigation/navigation"

export function DashboardPage() {
  const page = findNavigationPage("/dashboard")

  return (
    <ComingSoonPage
      title={page?.title ?? "Dashboard"}
      features={page?.features ?? []}
    />
  )
}
