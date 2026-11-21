import { useEffect } from "react"
import { create } from "zustand"
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "success" | "error" | "warning" | "info"

export type ToastItem = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  durationMs: number
}

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
}

type ToastStoreState = {
  toasts: ToastItem[]
  push: (input: ToastInput) => string
  dismiss: (id: string) => void
  clear: () => void
}

let toastCounter = 0

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  push: (input) => {
    toastCounter += 1
    const id = `toast-${Date.now()}-${toastCounter}`
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? "success",
      durationMs: input.durationMs ?? 4200
    }
    set((state) => ({
      toasts: [...state.toasts.slice(-3), item]
    }))
    return id
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),
  clear: () => set({ toasts: [] })
}))

export const pushToast = (input: ToastInput) =>
  useToastStore.getState().push(input)

export const useToast = () => {
  const push = useToastStore((s) => s.push)
  const dismiss = useToastStore((s) => s.dismiss)
  return {
    toast: push,
    success: (title: string, description?: string) =>
      push({ title, description, variant: "success" }),
    error: (title: string, description?: string) =>
      push({ title, description, variant: "error", durationMs: 5500 }),
    warning: (title: string, description?: string) =>
      push({ title, description, variant: "warning" }),
    info: (title: string, description?: string) =>
      push({ title, description, variant: "info" }),
    dismiss
  }
}

const variantStyles: Record<
  ToastVariant,
  {
    shell: string
    iconWrap: string
    bar: string
    Icon: typeof CheckCircle2
  }
> = {
  success: {
    shell: "border-[#b8e2d2] bg-white text-[#163d36]",
    iconWrap: "bg-[#e6f5ee] text-[#147853]",
    bar: "bg-[#16866f]",
    Icon: CheckCircle2
  },
  error: {
    shell: "border-red-200 bg-white text-slate-800",
    iconWrap: "bg-red-50 text-red-600",
    bar: "bg-red-500",
    Icon: AlertTriangle
  },
  warning: {
    shell: "border-amber-200 bg-white text-slate-800",
    iconWrap: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    Icon: AlertTriangle
  },
  info: {
    shell: "border-sky-200 bg-white text-slate-800",
    iconWrap: "bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
    Icon: Info
  }
}

function ToastCard({
  item,
  onDismiss
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}) {
  const cfg = variantStyles[item.variant]
  const Icon = cfg.Icon

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss(item.id)
    }, item.durationMs)
    return () => window.clearTimeout(timer)
  }, [item.durationMs, item.id, onDismiss])

  return (
    <div
      role={item.variant === "error" ? "alert" : "status"}
      aria-live={item.variant === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border p-3.5 shadow-[0_12px_32px_rgba(20,50,45,0.12)] transition-all animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none",
        cfg.shell
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            cfg.iconWrap
          )}
        >
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{item.title}</p>
          {item.description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {item.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Đóng thông báo"
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16866f]"
        >
          <X size={15} />
        </button>
      </div>
      <span
        className={cn("absolute inset-x-0 bottom-0 h-0.5 opacity-80", cfg.bar)}
      />
    </div>
  )
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (toasts.length === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const latest = toasts[toasts.length - 1]
        if (latest) dismiss(latest.id)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [dismiss, toasts])

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Thông báo hệ thống"
      className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  )
}
