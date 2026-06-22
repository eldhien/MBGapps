"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/features/auth/AuthProvider"
import { formatRole } from "@/features/auth/types"
import { getVisibleNavigation } from "@/features/navigation/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { profile, signOut } = useAuth()
  const userName = profile?.username ?? "Pengguna"
  const brandSubtitle =
    profile?.role === "SPPG"
      ? "Dashboard SPPG"
      : profile?.role === "SEKOLAH"
        ? "Dashboard Sekolah"
        : "Dashboard"
  const navItems = getVisibleNavigation(profile?.role).map((page) => ({
    title: page.title,
    url: page.path,
    icon: page.icon,
    children: page.children,
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b px-3 py-3 group-data-[collapsible=icon]:px-2">
        <div className="flex h-10 items-center gap-3 rounded-md px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            MB
          </div>
          <div className="min-w-0 text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate font-semibold">MBG App</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {brandSubtitle}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <NavMain items={navItems} label={null} />
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
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
