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
  const isDestructive = variant === "destructive"

  useEffect(() => {
    if (!onClose) return

    const timeout = window.setTimeout(onClose, duration)

    return () => window.clearTimeout(timeout)
  }, [duration, onClose])

  return (
    <div className="fixed top-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))]">
      <Alert
        variant="default"
        className={cn(
          "rounded-2xl bg-white px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.14)]",
          isDestructive ? "border-red-100" : "border-[#dbe4ff]"
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 size-5",
            isDestructive ? "text-red-600" : "text-[#0528f2]"
          )}
        />
        <AlertTitle
          className={cn(
            "text-sm font-semibold",
            isDestructive ? "text-red-600" : "text-[#0528f2]"
          )}
        >
          {title}
        </AlertTitle>
        <AlertDescription className="text-sm text-slate-500">
          {description}
        </AlertDescription>
      </Alert>
    </div>
  )
}
