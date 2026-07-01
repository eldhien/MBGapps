import { cn } from "@/lib/utils"
import { AlertToast } from "@/components/ui/alert-toast"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth/AuthProvider"
import logoSrc from "@/assets/images/logo.svg"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useState, type ComponentProps, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"

export function LoginForm({ className, ...props }: ComponentProps<"div">) {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const errorTitle = error?.toLowerCase().includes("akun tidak ditemukan")
    ? "Akun belum terdaftar"
    : "Gagal masuk"

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "")
    const password = String(formData.get("password") ?? "")

    try {
      await signIn({ password, username })
      navigate("/dashboard", {
        replace: true,
        state: { loginSuccess: true },
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal login.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {error ? (
        <AlertToast
          title={errorTitle}
          description={error}
          variant="destructive"
          onClose={() => setError(null)}
        />
      ) : null}
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              to="/login"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-[#0528f2] shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                <img
                  src={logoSrc}
                  alt="MBG App"
                  className="size-full w-8 object-contain p-1"
                />
              </div>
              <span className="sr-only">MBG App</span>
            </Link>
            <h1 className="text-xl font-bold">Masuk ke MBG Dashboard</h1>
          </div>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="admin"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                className="pr-10"
                autoComplete="current-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsPasswordVisible((value) => !value)}
                aria-label={
                  isPasswordVisible ? "Sembunyikan password" : "Lihat password"
                }
              >
                {isPasswordVisible ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </Button>
            </div>
          </Field>
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
