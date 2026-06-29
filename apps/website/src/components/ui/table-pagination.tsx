import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type TablePaginationProps = {
  className?: string
  onPageChange: (page: number) => void
  page: number
  totalPages: number
}

export function TablePagination({
  className,
  onPageChange,
  page,
  totalPages,
}: TablePaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const activePage = Math.min(Math.max(page, 1), totalPages)

  return (
    <div
      className={cn(
        "flex max-w-full items-center justify-center gap-2 overflow-x-auto border-t border-[#edf0f4] px-4 py-3 sm:justify-end",
        className
      )}
    >
      <button
        type="button"
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#edf0f4] bg-white text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
        disabled={activePage <= 1}
        onClick={() => onPageChange(Math.max(1, activePage - 1))}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      {Array.from({ length: totalPages }).map((_, index) => {
        const nextPage = index + 1

        return (
          <button
            key={nextPage}
            type="button"
            className={cn(
              "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-medium text-muted-foreground",
              activePage === nextPage
                ? "bg-[#f3f5f8] text-foreground"
                : "hover:bg-[#f7f9ff] hover:text-[#0528f2]"
            )}
            onClick={() => onPageChange(nextPage)}
            aria-current={activePage === nextPage ? "page" : undefined}
          >
            {nextPage}
          </button>
        )
      })}

      <button
        type="button"
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#edf0f4] bg-white text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
        disabled={activePage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, activePage + 1))}
        aria-label="Halaman berikutnya"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  )
}
