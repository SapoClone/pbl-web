import { Link, useRouterState } from "@tanstack/react-router"
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Store
} from "lucide-react"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

export function Topbar({
  collapsed,
  onToggleCollapse
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  })
  const tokens = useStoreAuth((state) => state.tokens)
  const isDemo = Boolean(tokens?.isDemo)

  const pathMap: Record<string, string> = {
    "/": "Tổng quan điều hành",
    "/orders": "Quản lý Đơn hàng",
    "/pos": "Bán tại quầy (POS)",
    "/products": "Danh mục & Bảng giá",
    "/inventory": "Quản lý Kho & Tồn",
    "/customers": "Khách hàng & Loyalty",
    "/promotions": "Khuyến mãi & Coupon",
    "/channels": "Kênh bán & Sàn TMĐT",
    "/reports": "Báo cáo Đa kênh",
    "/suppliers": "Nhà cung cấp",
    "/staff": "Nhân viên & Phân quyền",
    "/settings": "Cài đặt Cửa hàng"
  }

  const currentTitle = pathMap[pathname] ?? "Không gian làm việc"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          title={collapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          className="hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-800 transition md:flex active:scale-95"
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs"
        >
          <Link
            to="/"
            className="text-slate-400 hover:text-[#16866f] transition font-medium"
          >
            OmniRetail
          </Link>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="font-semibold text-[#163d36]">{currentTitle}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-400 sm:flex">
          <Search size={13} className="text-slate-400" />
          <span>Tìm nhanh (Đơn, SP, Khách)...</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.2 font-mono text-[10px] font-semibold text-slate-500 shadow-2xs">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-200/80 bg-[#e6f5ee]/80 px-3 py-1 text-xs font-semibold text-[#147853] shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16866f] animate-pulse" />
          <Store size={13} />
          <span className="hidden sm:inline">Chi nhánh:</span>
          <span className="max-w-[120px] truncate sm:max-w-none">
            {isDemo ? "CN Quận 1 - Flagship" : "Flagship Store"}
          </span>
        </div>
      </div>
    </header>
  )
}
