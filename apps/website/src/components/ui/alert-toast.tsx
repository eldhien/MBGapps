import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
    <div className="fixed top-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]">
      <Alert variant={variant} className="bg-background shadow-lg">
        <Icon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  )
}
