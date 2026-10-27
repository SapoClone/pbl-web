import { Download, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sectionMeta } from "./dashboard.data"
import type { DashboardSection } from "./dashboard.types"

export function DashboardHeader({ section, onCreate }: { section: DashboardSection; onCreate?: () => void }) {
  const meta = sectionMeta[section]
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
