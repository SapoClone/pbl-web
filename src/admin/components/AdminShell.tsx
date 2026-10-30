import { CheckCircle2, LogOut, Menu, Store, X } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ADMIN_NAVIGATION, getNavigationRoot, SCREEN_TITLES } from "../config"
import { useAdminStore } from "../store/useAdminStore"
import type { AdminScreen } from "../types"
import { AdminLink } from "./AdminLink"
import { StatusBadge } from "./ui"

export function AdminShell({ screen, children }: { screen: AdminScreen; children: ReactNode }) {
  const isSidebarOpen = useAdminStore((state) => state.isSidebarOpen)
  const toastMessage = useAdminStore((state) => state.toastMessage)
  const setSidebarOpen = useAdminStore((state) => state.setSidebarOpen)
  const toggleSidebar = useAdminStore((state) => state.toggleSidebar)
  const activeScreen = getNavigationRoot(screen)

  return <div className="min-h-screen bg-[#f3f6f5] text-[#284341]">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[216px] flex-col border-r border-[#dfe7e5] bg-white transition-transform lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[66px] items-center gap-2 px-6"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00876a] text-white"><Store size={15}/></span><strong className="text-xl tracking-tight">omniretail</strong><button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}><X size={18}/></button></div>
      <div className="mx-4 mb-5 rounded-md bg-[#f3f6f5] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#829591]">Quản trị nền tảng</p><p className="mt-1 text-sm font-bold">SaaS Admin</p></div>
      <p className="px-6 pb-2 text-[9px] uppercase tracking-wider text-[#829591]">Không gian quản trị</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">{ADMIN_NAVIGATION.map(({ screen: itemScreen, label, icon: Icon, badge }) => <AdminLink key={itemScreen} screen={itemScreen} onClick={() => setSidebarOpen(false)} className={`flex h-9 items-center gap-3 rounded-md px-3 text-xs ${activeScreen === itemScreen ? "bg-[#e5f3ed] font-bold text-[#00876a]" : "hover:bg-[#f3f6f5]"}`}><Icon size={15}/><span>{label}</span>{badge && <StatusBadge tone="amber" className="ml-auto">{badge}</StatusBadge>}</AdminLink>)}</nav>
      <div className="mx-6 border-t border-[#dfe7e5] py-5 text-[11px] text-[#829591]"><AdminLink screen="support" className="block py-2">Trung tâm trợ giúp</AdminLink><Link to="/login" className="flex items-center gap-2 py-2"><LogOut size={13}/> Đăng xuất</Link><p className="mt-6 text-[8px] uppercase">Omniretail · Dữ liệu minh họa</p></div>
    </aside>
    <div className="lg:pl-[216px]"><header className="sticky top-0 z-30 flex h-[66px] items-center border-b border-[#e9efed] bg-white px-5 lg:px-8"><button className="mr-4 lg:hidden" onClick={toggleSidebar}><Menu size={20}/></button><span className="text-xs text-[#829591]">Nền tảng / {SCREEN_TITLES[screen]}</span><div className="ml-auto flex items-center gap-4"><StatusBadge>Production</StatusBadge><span className="hidden text-[10px] text-[#829591] sm:block">30/10/2026 · UTC+7</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5f3ed] text-xs font-bold text-[#00876a]">LA</span><div className="hidden sm:block"><p className="text-xs font-bold">Lan Anh</p><p className="text-[10px] text-[#829591]">Quản trị viên nền tảng</p></div></div></header><main className="p-5 lg:p-8">{children}</main></div>
    {isSidebarOpen && <button aria-label="Đóng menu" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)}/>} {toastMessage && <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-[#284341] px-4 py-3 text-sm text-white shadow-xl"><CheckCircle2 size={17}/>{toastMessage}</div>}
  </div>
}
