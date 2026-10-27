import { FileRoute } from "@tanstack/react-router"
import { Settings2 } from "lucide-react"

export const Route = new FileRoute('/settings').createRoute({
  component: SettingsPage
})

function SettingsPage() {
  return (
    <main className="mx-auto max-w-[1480px] py-8">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#16866f]">Hệ thống / Cài đặt</p>
      <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#163d36]">Cài đặt</h1>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <Settings2 className="text-[#16866f]" size={28} />
        <h2 className="mt-4 font-semibold text-[#163d36]">Thiết lập workspace</h2>
        <p className="mt-2 text-sm text-slate-500">Các thiết lập cửa hàng, kênh bán và phân quyền sẽ được kết nối với pbl-api.</p>
      </section>
    </main>
  )
}
