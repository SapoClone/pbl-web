import { type LucideIcon } from "lucide-react"
import { DashboardHeader } from "./DashboardHeader"
import type { DashboardSection } from "./dashboard.types"

export function ModulePlaceholder({ title, description, icon: Icon, section }: { title: string; description: string; icon: LucideIcon; section: DashboardSection }) {
  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader section={section} />
      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <Icon className="mx-auto text-[#16866f]" size={30} strokeWidth={1.6} />
        <h2 className="mt-4 font-semibold text-[#163d36]">{title}</h2>
        <p className="mt-4 text-sm text-slate-500">{description}</p>
      </section>
    </main>
  )
}
