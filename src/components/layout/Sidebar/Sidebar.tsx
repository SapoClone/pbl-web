import { Link, useRouterState } from "@tanstack/react-router"
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings2,
  ShoppingCart,
  Store,
  UsersRound
} from "lucide-react"

const navigation = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/" as const },
  { label: "Đơn hàng", icon: ClipboardList, to: "/posts" as const },
  { label: "Sản phẩm", icon: Package, to: "/posts" as const },
  { label: "Khách hàng", icon: UsersRound, to: "/posts" as const },
  { label: "Báo cáo", icon: BarChart3, to: "/posts" as const }
]

const Sidebar = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-[#082e61] text-white md:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2c8de8] shadow-lg shadow-blue-950/30">
          <Store size={20} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">NEXA COMMERCE</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-blue-200/70">Omnichannel OS</p>
        </div>
      </div>

      <div className="px-4 py-6">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/55">Workspace</p>
        <nav className="space-y-1">
          {navigation.map(({ label, icon: Icon, to }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith("/posts") && label === "Đơn hàng"
            return (
              <Link
                key={label}
                to={to}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? "bg-white text-[#082e61] shadow-sm" : "text-blue-100/75 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                <span>{label}</span>
                {label === "Đơn hàng" && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-blue-100 text-blue-700" : "bg-blue-400/20 text-blue-100"}`}>12</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-4">
        <Link to="/posts" className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-blue-100/75 hover:bg-white/10 hover:text-white">
          <Settings2 size={18} /> Cài đặt
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9ed8ff] text-sm font-bold text-[#082e61]">AN</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">An Nguyễn</p>
            <p className="truncate text-xs text-blue-100/60">Quản trị viên</p>
          </div>
          <ChevronDown size={15} className="text-blue-100/60" />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
