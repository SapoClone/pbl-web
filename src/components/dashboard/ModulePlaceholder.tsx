import { type LucideIcon } from "lucide-react"

export function ModulePlaceholder({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <main className="mx-auto max-w-[1480px] py-8">
      <p className="mb-3 text-2xl font-semibold uppercase tracking-[0.12em] text-[#16866f]">Không gian làm việc</p>
      <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#163d36]">{title}</h1>
      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <Icon className="mx-auto text-[#16866f]" size={30} strokeWidth={1.6} />
        <p className="mt-4 text-sm text-slate-500">{description}</p>
      </section>
    </main>
  )
}
