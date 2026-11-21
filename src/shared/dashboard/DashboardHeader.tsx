import { CalendarDays, Download, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sectionMeta } from "./dashboard.mock"
import type { DashboardSection } from "./dashboard.types"

export function DashboardHeader({
  section,
  onCreate
}: {
  section: DashboardSection
  onCreate?: () => void
}) {
  const meta = sectionMeta[section]

  if (section === "overview") {
    return (
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#147853]">
            <Sparkles size={11} className="text-[#16866f]" />
            <span>Trung tâm điều hành</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#163d36] sm:text-3xl">
            {meta.title}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {meta.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow-2xs backdrop-blur-sm">
            <CalendarDays size={14} className="text-[#16866f]" />
            <span>Hôm nay · 20/10/2026</span>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-slate-200/90 bg-white/90 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-[0.98]"
          >
            <Download size={14} />
            <span>Xuất báo cáo</span>
          </Button>
        </div>
      </header>
    )
  }

  return (
    <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#147853]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16866f] animate-pulse" />
          <span>{meta.eyebrow}</span>
        </div>
        <h1 className="truncate text-2xl font-bold tracking-tight text-[#163d36] sm:text-3xl">
          {meta.title}
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          {meta.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
        <Button
          variant="outline"
          className="rounded-xl border-slate-200/90 bg-white/90 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all"
        >
          <Download size={14} />
          <span>Xuất báo cáo</span>
        </Button>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_12px_rgba(22,134,111,0.25)] hover:shadow-[0_4px_18px_rgba(22,134,111,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:rotate-90">
              <Plus size={12} strokeWidth={2.5} />
            </span>
            <span>Thêm mới</span>
          </button>
        )}
      </div>
    </header>
  )
}
