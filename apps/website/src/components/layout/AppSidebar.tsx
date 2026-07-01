import * as React from "react"

import { NavMain } from "@/components/layout/NavMain"
import { NavUser } from "@/components/layout/NavUser"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth/AuthProvider"
import { formatRole } from "@/features/auth/types"
import { getVisibleNavigation } from "@/features/navigation/navigation"
import logoSrc from "@/assets/images/logo.svg"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { profile, signOut } = useAuth()
  const userName = profile?.username ?? "Pengguna"
  const brandSubtitle =
    profile?.role === "SPPG"
      ? "Dashboard SPPG"
      : profile?.role === "SEKOLAH"
        ? "Dashboard Sekolah"
        : "Dashboard"
  const navItems = React.useMemo(
    () =>
      getVisibleNavigation(profile?.role).map((page) => ({
        title: page.title,
        url: page.path,
        icon: page.icon,
        children: page.children,
      })),
    [profile?.role]
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-5 pt-5 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3">
        <div className="flex h-10 items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0528f2] group-data-[collapsible=icon]:hidden">
            <img
              src={logoSrc}
              alt="MBG App"
              className="size-full w-8 object-contain p-1"
            />
          </div>
          <div className="min-w-0 text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[15px] font-semibold tracking-tight">
              MBG App
            </p>
            <p className="truncate text-xs text-sidebar-foreground/45">
              {brandSubtitle}
            </p>
          </div>
          <SidebarTrigger className="ml-auto size-7 cursor-pointer rounded-lg bg-white text-sidebar-foreground/55 shadow-[0_8px_18px_rgba(15,23,42,0.05)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:rounded-xl hover:bg-white hover:text-sidebar-foreground" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 py-2 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-1">
        <NavMain items={navItems} label="MENU" />
      </SidebarContent>
      <SidebarFooter className="px-4 pt-3 pb-4 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:pb-3">
        <NavUser
          user={{
            name: userName,
            subtitle: formatRole(profile?.role),
            avatar: "",
          }}
          onSignOut={signOut}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
