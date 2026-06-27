import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react"
import { useEffect } from "react"

export function AlertToast({
  description,
  duration = 3500,
  onClose,
  title,
  variant = "default",
}: {
  description: string
  duration?: number
  onClose?: () => void
  title: string
  variant?: "default" | "destructive"
}) {
  const Icon = variant === "destructive" ? TriangleAlertIcon : CheckCircle2Icon

  useEffect(() => {
    if (!onClose) return

    const timeout = window.setTimeout(onClose, duration)

    return () => window.clearTimeout(timeout)
  }, [duration, onClose])

  return (
    <div className="fixed top-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))]">
      <Alert
        variant={variant}
        className={cn(
          "rounded-2xl border-[#e8edf5] bg-white px-4 py-3 text-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.14)]",
          variant === "destructive" &&
            "border-red-100 bg-white text-red-600 *:data-[slot=alert-description]:text-red-500"
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 size-5",
            variant === "destructive" ? "text-red-500" : "text-[#0528f2]"
          )}
        />
        <AlertTitle className="text-sm font-semibold">{title}</AlertTitle>
        <AlertDescription className="text-sm text-slate-500">
          {description}
        </AlertDescription>
      </Alert>
    </div>
  )
}
