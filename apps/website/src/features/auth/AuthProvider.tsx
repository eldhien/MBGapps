import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { api, clearAccessToken, getAccessToken } from "@/lib/api"
import type { UserProfile } from "./types"

type AuthContextValue = {
  isLoading: boolean
  isAuthenticated: boolean
  profile: UserProfile | null
  refreshProfile: () => Promise<UserProfile | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setProfile(null)
      return null
    }

    try {
      const response = await api.me()
      setProfile(response.user)
      return response.user
    } catch {
      clearAccessToken()
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      await refreshProfile()

      if (mounted) {
        setIsLoading(false)
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [refreshProfile])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Token lokal tetap dibersihkan oleh api.logout().
    }
    sessionStorage.setItem("logout_success", "true")
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated: Boolean(profile),
      profile,
      refreshProfile,
      signOut,
    }),
    [isLoading, profile, refreshProfile, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}
