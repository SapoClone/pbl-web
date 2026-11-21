import { useEffect, useState } from "react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  ChevronDown,
  HelpCircle,
  Menu,
  Plus,
  Settings2,
  Store,
  X,
  LogOut
} from "lucide-react"
import { logout } from "@/api/auth"
import { getOrdersSummary } from "@/api/sales/orders"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { navigation } from "@/shared/navigation/navigation"
import { getCurrentSubscription } from "@/api/platform/subscription"

function Navigation({
  pathname,
  search,
  ordersBadge,
  onNavigate
}: {
  pathname: string
  search: string
  ordersBadge?: string
  onNavigate: () => void
}) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const item of navigation) {
      if (item.children) {
        initial[item.to] = pathname.startsWith(item.to)
      }
    }
    return initial
  })
  useEffect(() => {
    const activeParent = navigation.find(
      (item) => item.children && pathname.startsWith(item.to)
    )
    if (activeParent) {
      setOpenMenus((prev) =>
        prev[activeParent.to] ? prev : { ...prev, [activeParent.to]: true }
      )
    }
  }, [pathname])
  const matchedNav = navigation.find(
    (item) => item.children && pathname.startsWith(item.to)
  )
  const defaultTab = matchedNav?.children?.[0]?.tab ?? "overview"
  const currentTab = new URLSearchParams(search).get("tab") ?? defaultTab
  return (
    <nav className="space-y-1">
      {navigation.map(({ label, icon: Icon, to, badge, children }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to)
        const isOpen = Boolean(openMenus[to])
        const effectiveBadge = to === "/orders" ? ordersBadge : badge
        if (children)
          return (
            <div key={to}>
              <button
                type="button"
                onClick={() =>
                  setOpenMenus((prev) => ({ ...prev, [to]: !prev[to] }))
                }
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-xs transition-all duration-150 ${
                  active
                    ? "bg-[#e6f4ee] font-semibold text-[#16866f] shadow-[inset_2px_0_0_#16866f]"
                    : "text-[#75817e] hover:bg-[#f1f6f4] hover:text-[#163d36]"
                }`}
                aria-expanded={isOpen}
              >
                <Icon size={16} strokeWidth={active ? 2 : 1.6} />
                <span className="flex-1 whitespace-nowrap">{label}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="ml-5 mt-1 space-y-0.5 border-l border-[#e1ebe7] pl-2">
                  {children.map((child) => (
                    <Link
                      key={child.tab}
                      to={to as never}
                      search={{ tab: child.tab } as never}
                      onClick={() => {
                        onNavigate()
                        setTimeout(
                          () => window.dispatchEvent(new PopStateEvent("popstate")),
                          0
                        )
                      }}
                      className={`block rounded-md px-3 py-2 text-[11px] transition-colors ${
                        active && currentTab === child.tab
                          ? "bg-[#eff8f4] font-semibold text-[#16866f]"
                          : "text-[#7b8984] hover:bg-[#f4f7f6] hover:text-[#163d36]"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        return (
          <Link
            key={to}
            to={to as never}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs transition-all duration-150 ${
              active
                ? "bg-[#e6f4ee] font-semibold text-[#16866f] shadow-[inset_2px_0_0_#16866f]"
                : "text-[#75817e] hover:bg-[#f1f6f4] hover:text-[#163d36]"
            }`}
          >
            <Icon size={16} strokeWidth={active ? 2 : 1.6} />
            <span className="flex-1 whitespace-nowrap">{label}</span>
            {effectiveBadge && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                  active
                    ? "bg-white text-[#16866f] shadow-2xs"
                    : "bg-[#fff0d6] text-[#c98222]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                {effectiveBadge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBody({
  pathname,
  search,
  ordersBadge,
  onNavigate
}: {
  pathname: string
  search: string
  ordersBadge?: string
  onNavigate: () => void
}) {
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
      setLogoutError(
        "Không thể thu hồi phiên trên máy chủ, nhưng tài khoản đã được đăng xuất khỏi thiết bị."
      )
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
        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8d9b96]">
          Không gian làm việc
        </p>
        <Navigation
          pathname={pathname}
          search={search}
          ordersBadge={ordersBadge}
          onNavigate={onNavigate}
        />
      </div>
      <div className="border-t border-[#edf0ef] px-3 py-3">
        <Link
          to={"/settings" as never}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs transition ${
            pathname.startsWith("/settings")
              ? "bg-[#e6f4ee] font-semibold text-[#16866f]"
              : "text-[#75817e] hover:bg-[#f1f6f4] hover:text-[#163d36]"
          }`}
        >
          <Settings2 size={16} strokeWidth={1.6} />
          Cài đặt cửa hàng
        </Link>
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-xs text-[#75817e] transition hover:bg-red-50/70 hover:text-red-700 disabled:opacity-50"
        >
          <LogOut size={16} strokeWidth={1.6} />
          {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
        {logoutError && (
          <p className="px-3.5 pt-1 text-[10px] leading-4 text-amber-600">
            {logoutError}
          </p>
        )}
        <Link
          to={"/channels" as never}
          search={{ tab: "overview" } as never}
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-xs text-[#75817e] transition hover:bg-[#f1f6f4] hover:text-[#163d36]"
        >
          <HelpCircle size={16} strokeWidth={1.6} />
          Trạng thái kết nối kênh
        </Link>
        <p className="mt-3 px-2 text-[9px] font-medium uppercase tracking-[0.06em] text-[#b0b9b6]">
          OmniRetail Cloud · v2.4
        </p>
      </div>
    </>
  )
}

const Sidebar = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const search = useRouterState({ select: (state) => state.location.searchStr })
  const tokens = useStoreAuth((state) => state.tokens)
  const setTokens = useStoreAuth((state) => state.setTokens)
  const isDemo = Boolean(tokens?.isDemo)

  const subscription = useQuery({
    queryKey: ["current-subscription"],
    queryFn: getCurrentSubscription,
    enabled: Boolean(tokens?.tenantId) && !isDemo
  })

  const ordersSummaryQuery = useQuery({
    queryKey: ["orders-summary"],
    queryFn: () => getOrdersSummary(),
    enabled: Boolean(tokens?.accessToken) && !isDemo,
    staleTime: 30_000
  })

  const [mobileOpen, setMobileOpen] = useState(false)
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)
  const branchUsage = subscription.data?.usage?.find(
    (item) => item.key === "branches"
  )

  const tenantsList = tokens?.tenants ?? []
  const activeTenantName =
    tenantsList.find((t) => t.id === tokens?.tenantId)?.name ??
    (isDemo ? "Mộc Store" : "Thời Trang Việt (VietFashion)")
  const planName = subscription.data?.plan?.name ?? "Pro"
  const branchText = branchUsage
    ? `${branchUsage.used}/${branchUsage.limit} chi nhánh`
    : "3/5 chi nhánh"

  const pendingOrdersCount = isDemo
    ? 3
    : (ordersSummaryQuery.data?.needsAction.total ?? 0) +
      (ordersSummaryQuery.data?.awaitingConfirmation ?? 0)
  const ordersBadge =
    pendingOrdersCount > 0 ? String(pendingOrdersCount) : undefined

  const handleSelectTenant = async (tenantId: string) => {
    if (!tokens || tenantId === tokens.tenantId) {
      setTenantMenuOpen(false)
      return
    }
    setTokens({ ...tokens, tenantId })
    setTenantMenuOpen(false)
    await queryClient.invalidateQueries()
  }

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
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#e7ecea] bg-white text-[#163d36] shadow-xl transition-transform md:static md:z-auto md:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="relative border-b border-[#edf0ef] px-3 pt-4">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d9efe5] text-[#16866f]">
              <Store size={20} strokeWidth={2} />
            </span>
            <span className="text-lg font-semibold tracking-tight text-[#163d36]">
              OmniRetail
            </span>
            <button
              type="button"
              aria-label="Đóng menu"
              onClick={closeMobile}
              className="ml-auto text-[#8e9b97] md:hidden"
            >
              <X size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTenantMenuOpen((prev) => !prev)}
            aria-expanded={tenantMenuOpen}
            className="mb-3 mt-4 flex w-full items-center gap-2 rounded-lg border border-transparent bg-[#f1f5f3] px-2.5 py-2 text-left transition hover:border-[#cce8dc] hover:bg-[#eaf3ef]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[#16866f] shadow-2xs">
              <Store size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-[#163d36]">
                {activeTenantName}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-[#75817e]">
                <b className="rounded bg-[#d9efe5] px-1.5 py-0.2 text-[8px] font-bold uppercase text-[#16866f]">
                  Gói {planName}
                </b>
                <span>{branchText}</span>
              </span>
            </span>
            <ChevronDown
              size={13}
              className={`text-[#9aa6a2] transition-transform duration-150 ${
                tenantMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {tenantMenuOpen && (
            <div className="absolute inset-x-3 top-[106px] z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cửa hàng đang quản lý
              </p>
              <div className="mt-1 max-h-44 space-y-1 overflow-y-auto">
                {tenantsList.length > 0 ? (
                  tenantsList.map((tenant) => {
                    const isCurrent = tenant.id === tokens?.tenantId
                    return (
                      <button
                        key={tenant.id}
                        type="button"
                        onClick={() => void handleSelectTenant(tenant.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                          isCurrent
                            ? "bg-[#e6f5ee] font-semibold text-[#147853]"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{tenant.name}</span>
                        {isCurrent && <Check size={14} className="shrink-0" />}
                      </button>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-between rounded-lg bg-[#e6f5ee] px-2.5 py-2 text-xs font-semibold text-[#147853]">
                    <span className="truncate">{activeTenantName}</span>
                    <Check size={14} className="shrink-0" />
                  </div>
                )}
              </div>
              <div className="mt-2 border-t border-slate-100 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTenantMenuOpen(false)
                    closeMobile()
                    void navigate({ to: "/settings" })
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                >
                  <Settings2 size={13} /> Quản lý chi nhánh & gói cước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTenantMenuOpen(false)
                    closeMobile()
                    void navigate({ to: "/onboarding-tenant" })
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[#16866f] hover:bg-[#e6f5ee]/60"
                >
                  <Plus size={13} /> Tạo cửa hàng mới
                </button>
              </div>
            </div>
          )}
        </div>
        <SidebarBody
          pathname={pathname}
          search={search}
          ordersBadge={ordersBadge}
          onNavigate={closeMobile}
        />
      </aside>
    </>
  )
}

export default Sidebar
