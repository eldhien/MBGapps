import { LoginForm } from "@/features/auth/components/LoginForm"
import { AlertToast } from "@/components/ui/alert-toast"
import { useEffect, useState } from "react"

export function LoginPage() {
  const [logoutSuccess, setLogoutSuccess] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("logout_success") === "true") {
      sessionStorage.removeItem("logout_success")
      setLogoutSuccess(true)
    }
  }, [])

  return (
    <main className="grid min-h-svh place-items-center bg-muted/30 p-6">
      {logoutSuccess ? (
        <AlertToast
          title="Berhasil keluar"
          description="Sesi kamu sudah diakhiri. Silakan login kembali untuk masuk ke dashboard."
          onClose={() => setLogoutSuccess(false)}
        />
      ) : null}
      <div className="grid w-full max-w-sm gap-4">
        <LoginForm />
      </div>
    </main>
  )
}
