import { type ReactNode, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type DrawerWidth = "md" | "lg" | "xl" | "2xl"

const widthClasses: Record<DrawerWidth, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl"
}

export type SlideOverDrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  eyebrow?: string
  width?: DrawerWidth
  headerExtra?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function SlideOverDrawer({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  width = "xl",
  headerExtra,
  footer,
  children
}: SlideOverDrawerProps) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[65] flex justify-end bg-[#163d36]/35 backdrop-blur-[2px] animate-in fade-in duration-150 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col bg-white shadow-[-12px_0_40px_rgba(20,50,45,0.14)] animate-in slide-in-from-right duration-200 motion-reduce:animate-none",
          widthClasses[width]
        )}
      >
        <header className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#16866f]">
                  {eyebrow}
                </p>
              ) : null}
              <h2 className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-[#163d36]">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16866f]"
            >
              <X size={18} />
            </button>
          </div>
          {headerExtra ? <div className="mt-4">{headerExtra}</div> : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7faf9] px-6 py-5">
          {children}
        </div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 bg-white px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
