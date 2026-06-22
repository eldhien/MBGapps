import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CalendarProps = {
  className?: string
  selected?: Date
  onSelect?: (date: Date) => void
}

const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  )
}

function Calendar({ className, selected, onSelect }: CalendarProps) {
  const [month, setMonth] = React.useState(() => selected ?? new Date())
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const firstDayIndex = monthStart.getDay()
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate()
  const monthLabel = month.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  })

  React.useEffect(() => {
    if (selected) {
      setMonth(selected)
    }
  }, [selected])

  return (
    <div className={cn("w-full rounded-md bg-background p-2", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() =>
            setMonth(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() - 1, 1)
            )
          }
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() =>
            setMonth(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() + 1, 1)
            )
          }
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {dayLabels.map((day) => (
          <div key={day} className="py-1 font-medium">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayIndex }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const date = new Date(month.getFullYear(), month.getMonth(), day)
          const isSelected = selected ? isSameDay(date, selected) : false
          const isToday = isSameDay(date, new Date())

          return (
            <Button
              key={day}
              type="button"
              variant={isSelected ? "default" : "ghost"}
              className={cn(
                "h-8 rounded-md p-0 text-xs font-medium",
                isToday && !isSelected && "border border-border"
              )}
              onClick={() => onSelect?.(date)}
            >
              {day}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar }
