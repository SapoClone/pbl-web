import { CalendarDays, Download, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sectionMeta } from "./dashboard.mock"
import type { DashboardSection } from "./dashboard.types"

export function DashboardHeader({ section, onCreate }: { section: DashboardSection; onCreate?: () => void }) {
  const meta = sectionMeta[section]
  if (section === "overview") {
    return (
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[25px] font-semibold tracking-[-0.03em] text-[#163d36]">{meta.title}</h1>
          <p className="mt-1 text-[11px] text-slate-400">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500"><CalendarDays size={13} /> Hôm nay · 20/10/2026</button>
          <Button variant="outline" className="gap-2 border-slate-200 bg-white text-[10px] text-slate-600"><Download size={13} /> Xuất báo cáo</Button>
        </div>
      </header>
    )
  }
  return (
    <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">{meta.eyebrow}</p>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">{meta.title}</h1>
        <p className="mt-2 text-[15px] text-slate-500">{meta.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2 border-slate-200 bg-white text-slate-600"><Download size={16} /> Xuất báo cáo</Button>
        {onCreate && <Button onClick={onCreate} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"><Plus size={17} /> Thêm mới</Button>}
      </div>
    </header>
  )
}
