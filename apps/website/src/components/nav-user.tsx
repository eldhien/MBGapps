import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, LogOutIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"

export function NavUser({
  onSignOut,
  user,
}: {
  onSignOut: () => Promise<void>
  user: {
    name: string
    subtitle: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const fallback = user.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <TriangleAlertIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Keluar dari dashboard?</AlertDialogTitle>
              <AlertDialogDescription>
                Sesi login akan diakhiri dan kamu akan diarahkan kembali ke
                halaman login.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => void onSignOut()}>
                Keluar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-12 cursor-pointer rounded-xl bg-white px-2 shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:bg-white hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] data-[state=open]:bg-white data-[state=open]:text-sidebar-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0!"
            >
              <Avatar className="h-8 w-8 shrink-0 rounded-full group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full bg-[#eef1ff] text-xs font-semibold text-[#0528f2]">
                  {fallback}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-xs font-semibold">
                  {user.name}
                </span>
                <span className="truncate text-[11px] text-sidebar-foreground/45">
                  {user.subtitle}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-3.5 text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-2xl border-[#e7ebf3] bg-white p-2 shadow-[0_18px_46px_rgba(15,23,42,0.16)]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 rounded-xl bg-[#f8fafc] px-3 py-3 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-full bg-[#eef1ff] text-sm font-semibold text-[#0528f2]">
                    {fallback}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold text-[#111827]">
                    {user.name}
                  </span>
                  <span className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user.subtitle}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem
              variant="destructive"
              className="h-10 cursor-pointer rounded-xl px-3 text-sm font-semibold text-red-600 focus:bg-red-50 focus:text-red-700"
              onSelect={(event) => {
                event.preventDefault()
                setIsLogoutOpen(true)
              }}
            >
              <LogOutIcon className="size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
