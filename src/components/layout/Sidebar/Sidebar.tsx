import { useState } from "react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import {
  ChevronDown,
  HelpCircle,
  Menu,
  Settings2,
  Store,
  X,
  LogOut
} from "lucide-react"
import { logout } from "@/api/auth"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { navigation } from "@/shared/navigation/navigation"

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="space-y-1">
      {navigation.map(({ label, icon: Icon, to, badge }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to as never}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 text-xs transition ${active
                ? "bg-[#e6f4ee] font-semibold text-[#16866f]"
                : "text-[#75817e] hover:bg-[#f1f6f4] hover:text-[#163d36]"
              }`}
          >
            <Icon size={16} strokeWidth={active ? 2 : 1.6} />
            <span className="flex-1 whitespace-nowrap">{label}</span>
            {badge && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white text-[#16866f]" : "bg-[#fff0d6] text-[#c98222]"}`}>
                {badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const navigate = useNavigate()
  const clearTokens = useStoreAuth((state) => state.clearTokens)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setLogoutError("")
    try {
      await logout()
    } catch {
      setLogoutError("Không thể thu hồi phiên trên máy chủ, nhưng tài khoản đã được đăng xuất khỏi thiết bị.")
    } finally {
      clearTokens()
      onNavigate()
      await navigate({ to: "/login" })
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8d9b96]">Không gian làm việc</p>
        <Navigation pathname={pathname} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-[#edf0ef] px-3 py-3">
        <Link
          to={"/settings" as never}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3.5 py-2.5 text-xs text-[#75817e] hover:bg-[#f1f6f4] hover:text-[#163d36]"
        >
          <Settings2 size={16} strokeWidth={1.6} />
          Cài đặt cửa hàng
        </Link>
        <button type="button" disabled={isLoggingOut} onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-left text-xs text-[#75817e] hover:bg-[#f1f6f4] hover:text-[#163d36] disabled:opacity-50">
          <LogOut size={16} strokeWidth={1.6} />
          {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
        {logoutError && <p className="px-3.5 pt-1 text-[10px] leading-4 text-amber-600">{logoutError}</p>}
        <button type="button" className="flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-left text-xs text-[#75817e] hover:bg-[#f1f6f4] hover:text-[#163d36]">
          <HelpCircle size={16} strokeWidth={1.6} />
          Trung tâm trợ giúp
        </button>
        <p className="mt-4 px-2 text-[8px] uppercase tracking-[0.05em] text-[#b0b9b6]">Omniretail - Dữ liệu minh họa</p>
      </div>
    </>
  )
}

const Sidebar = () => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <button
        type="button"
        aria-label="Mở menu"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-md bg-[#103c32] text-white shadow md:hidden"
      >
        <Menu size={17} />
      </button>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-[#163d36]/20 backdrop-blur-sm md:hidden"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#e7ecea] bg-white text-[#163d36] shadow-xl transition-transform md:static md:z-auto md:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="border-b border-[#edf0ef] px-3 pt-4">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d9efe5] text-[#16866f]">
              <Store size={30} strokeWidth={2} />
            </span>
            <span className="text-lg font-medium tracking-tight">OmniRetail</span>
            <button type="button" aria-label="Đóng menu" onClick={closeMobile} className="ml-auto text-[#8e9b97] md:hidden"><X size={16} /></button>
          </div>
          <button type="button" className="mb-3 mt-4 flex w-full items-center gap-2 rounded-md bg-[#f1f5f3] px-2 py-2 text-left">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-white text-[#16866f]"><Store size={13} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-medium text-[#52615c]">Mộc Store</span>
              <span className="mt-0.5 flex items-center gap-1 text-[8px] text-[#9aa6a2]"><b className="rounded bg-[#d9efe5] px-1 text-[7px] font-semibold text-[#16866f]">GÓI PRO</b> 2 chi nhánh</span>
            </span>
            <ChevronDown size={13} className="text-[#9aa6a2]" />
          </button>
        </div>
        <SidebarBody pathname={pathname} onNavigate={closeMobile} />
      </aside>
    </>
  )
}

export default Sidebar
