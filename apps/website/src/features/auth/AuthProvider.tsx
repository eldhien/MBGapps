import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { api, clearAccessToken, getAccessToken } from "@/lib/api"
import type { UserProfile } from "./types"

type AuthContextValue = {
  isLoading: boolean
  isAuthenticated: boolean
  profile: UserProfile | null
  refreshProfile: () => Promise<UserProfile | null>
  signIn: (payload: {
    password: string
    username: string
  }) => Promise<UserProfile | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const sessionVersionRef = useRef(0)

  const refreshProfile = useCallback(async () => {
    const requestVersion = sessionVersionRef.current
    const token = getAccessToken()

    if (!token) {
      if (sessionVersionRef.current === requestVersion) {
        setProfile(null)
      }

      return null
    }

    try {
      const response = await api.me()

      if (
        sessionVersionRef.current === requestVersion &&
        getAccessToken() === token
      ) {
        setProfile(response.user)
      }

      return response.user
    } catch {
      if (
        sessionVersionRef.current === requestVersion &&
        getAccessToken() === token
      ) {
        clearAccessToken()
        setProfile(null)
      }

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

  const signIn = useCallback(
    async (payload: { password: string; username: string }) => {
      sessionVersionRef.current += 1
      const response = await api.login(payload)

      setProfile(response.user)
      setIsLoading(false)

      return response.user
    },
    []
  )

  const signOut = useCallback(async () => {
    sessionVersionRef.current += 1

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
      signIn,
      signOut,
    }),
    [isLoading, profile, refreshProfile, signIn, signOut]
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
