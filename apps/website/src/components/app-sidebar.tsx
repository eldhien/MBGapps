"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
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
import { GalleryVerticalEndIcon } from "lucide-react"

const data = {
  teams: [
    {
      name: "MBG App",
      logo: <GalleryVerticalEndIcon />,
    },
  ],
}

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
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={data.teams.map((team) => ({
            ...team,
            plan: brandSubtitle,
          }))}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
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
