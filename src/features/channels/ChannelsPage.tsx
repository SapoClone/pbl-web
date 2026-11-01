import { useState } from "react"
import { CheckCircle2, Facebook, Globe2, RefreshCw, Share2, ShoppingBag, Store, WifiOff } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { getIntegrationHealth } from "@/api/integration/health"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type Channel = {
  id: string
  name: string
  description: string
  icon: typeof Store
  color: string
  connected: boolean
  syncEnabled: boolean
}

const initialChannels: Channel[] = [
  { id: "pos", name: "Bán tại quầy", description: "Đơn bán trực tiếp tại cửa hàng", icon: Store, color: "bg-[#e6f5ee] text-[#16866f]", connected: true, syncEnabled: true },
  { id: "website", name: "Website", description: "Đơn hàng từ website của cửa hàng", icon: Globe2, color: "bg-blue-50 text-blue-600", connected: false, syncEnabled: false },
  { id: "shopee", name: "Shopee", description: "Đồng bộ sản phẩm, đơn hàng và tồn kho", icon: ShoppingBag, color: "bg-orange-50 text-orange-600", connected: false, syncEnabled: false },
  { id: "facebook", name: "Facebook / Zalo", description: "Theo dõi đơn hàng từ mạng xã hội", icon: Facebook, color: "bg-indigo-50 text-indigo-600", connected: false, syncEnabled: false }
]

export function ChannelsPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [channels, setChannels] = useState(initialChannels)
  const [message, setMessage] = useState("")
  const healthQuery = useQuery({
    queryKey: ["integration-health"],
    queryFn: getIntegrationHealth,
    enabled: !isDemo,
    retry: false
  })

  const integrationOnline = isDemo || healthQuery.data?.status === "ok"

  const toggleSync = (channelId: string) => {
    setChannels((current) => current.map((channel) =>
      channel.id === channelId && channel.connected
        ? { ...channel, syncEnabled: !channel.syncEnabled }
        : channel
    ))
    setMessage("Đã cập nhật trạng thái đồng bộ trên giao diện. API kết nối kênh sẽ được lưu khi backend integration hỗ trợ.")
  }

  const connect = (channel: Channel) => {
    if (channel.id === "pos") return
    setMessage(`Chưa thể kết nối ${channel.name}: pbl-api hiện chưa cung cấp endpoint OAuth cho kênh này.`)
  }

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Bán hàng / Kênh bán</p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Kênh bán hàng</h1>
          <p className="mt-2 text-sm text-slate-500">Tập trung các kênh bán và đồng bộ dữ liệu về một nơi.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${integrationOnline ? "bg-[#e6f5ee] text-[#147853]" : "bg-amber-50 text-amber-700"}`}>
          {integrationOnline ? <CheckCircle2 size={15} /> : <WifiOff size={15} />}
          {isDemo ? "Chế độ demo" : integrationOnline ? "Integration đang hoạt động" : "Integration chưa sẵn sàng"}
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Tổng số kênh" value={channels.length} />
        <SummaryCard label="Đã kết nối" value={channels.filter((channel) => channel.connected).length} />
        <SummaryCard label="Đang đồng bộ" value={channels.filter((channel) => channel.syncEnabled).length} />
      </section>

      {message && <div className="mb-5 flex items-start justify-between gap-4 rounded-lg border border-[#cce8dc] bg-[#f2fbf6] p-3 text-sm text-[#147853]"><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Đóng thông báo">×</button></div>}

      <section className="grid gap-4 md:grid-cols-2">
        {channels.map((channel) => {
          const Icon = channel.icon
          return (
            <article key={channel.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${channel.color}`}><Icon size={22} /></span>
                  <div><h2 className="font-semibold text-[#163d36]">{channel.name}</h2><p className="mt-1 text-xs text-slate-500">{channel.description}</p></div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${channel.connected ? "bg-[#e6f5ee] text-[#147853]" : "bg-slate-100 text-slate-500"}`}>{channel.connected ? "Đã kết nối" : "Chưa kết nối"}</span>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                {channel.connected ? (
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={channel.syncEnabled} onChange={() => toggleSync(channel.id)} className="accent-[#16866f]" />
                    Đồng bộ đơn hàng và tồn kho
                  </label>
                ) : <span className="text-xs text-slate-400">Cần cấp quyền từ nền tảng</span>}
                <Button variant={channel.connected ? "outline" : "default"} onClick={() => connect(channel)} className={channel.connected ? "gap-2 border-slate-200 text-slate-600" : "bg-[#16866f] text-white hover:bg-[#0f705d]"}>
                  {channel.connected ? <><RefreshCw size={15} /> Cấu hình</> : "Kết nối"}
                </Button>
              </div>
            </article>
          )
        })}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2"><Share2 size={18} className="text-[#16866f]" /><h2 className="font-semibold text-[#163d36]">Nguyên tắc đồng bộ</h2></div>
        <p className="mt-2 text-sm leading-6 text-slate-500">Tồn kho trung tâm là nguồn dữ liệu chính. Khi backend integration được cấu hình OAuth, hệ thống sẽ đồng bộ đơn hàng và tồn kho sang các kênh bán; không ghi đè trực tiếp số tồn tại từng kênh.</p>
        {!isDemo && healthQuery.isError && <p className="mt-3 text-xs text-amber-700">Không thể kiểm tra integration service. Hãy khởi động pbl-api để dùng kết nối marketplace.</p>}
      </section>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section>
}
