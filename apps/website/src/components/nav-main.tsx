import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

export function NavMain({
  items,
  label = "Platform",
}: {
  label?: string | null
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    children?: {
      title: string
      url?: string
      path?: string
      icon?: React.ReactNode
    }[]
  }[]
}) {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const menuButtonClass =
    "h-9 rounded-lg px-2.5 text-[13px] font-medium text-sidebar-foreground/62 hover:bg-white hover:text-[#0528f2] hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)] data-[active=true]:bg-white data-[active=true]:text-[#0528f2] data-[active=true]:shadow-[0_10px_24px_rgba(15,23,42,0.08)] [&_svg]:text-current"
  const subButtonClass =
    "h-8 rounded-lg px-2 text-[12px] text-sidebar-foreground/55 hover:bg-white hover:text-[#0528f2] data-active:bg-white data-active:text-[#0528f2] data-active:shadow-[0_8px_20px_rgba(15,23,42,0.06)] [&>svg]:!text-current [&>svg]:!stroke-current [&_svg]:!text-current [&_svg]:!stroke-current"

  return (
    <SidebarGroup className="p-0">
      {label ? (
        <SidebarGroupLabel className="h-7 px-1 text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/38">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu className="gap-1.5">
        {items.map((item) => {
          const children = item.children?.map((child) => ({
            ...child,
            url: child.url ?? child.path ?? "#",
          }))
          const isActive =
            location.pathname === item.url ||
            Boolean(children?.some((child) => child.url === location.pathname))

          if (children?.length) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={menuButtonClass}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                      <ChevronRightIcon className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mt-1 ml-4 gap-1 border-l border-[#e9ebf1] py-1 pr-0">
                      {children.map((child) => {
                        const isChildActive = location.pathname === child.url

                        return (
                          <SidebarMenuSubItem key={child.title}>
                            <SidebarMenuSubButton
                              asChild
                              size="sm"
                              isActive={isChildActive}
                              className={subButtonClass}
                            >
                              <Link
                                to={child.url}
                                onClick={() => {
                                  if (isMobile) {
                                    setOpenMobile(false)
                                  }
                                }}
                              >
                                {child.icon}
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className={menuButtonClass}
              >
                <Link
                  to={item.url}
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false)
                    }
                  }}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
