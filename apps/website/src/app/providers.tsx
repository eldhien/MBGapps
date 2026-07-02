import type { ReactNode } from "react"
import { BrowserRouter } from "react-router-dom"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/features/auth/AuthProvider"

import { ThemeProvider } from "./theme-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="nic-theme">
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>{children}</AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}
