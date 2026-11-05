/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { adminQueryOptions } from "@/api/admin"
import {
  Businesses,
  BusinessDetail,
  BusinessForm,
  BusinessLock
} from "./BusinessScreens"
import {
  ChangePlan,
  JobDetail,
  Jobs,
  SubscriptionDetail,
  Subscriptions
} from "./SubscriptionJobScreens"
import { PlanConfig, Plans, UserDetail, UsersPage } from "./UserPlanScreens"
import { NotificationDetail, NotificationForm, Notifications } from "./NotificationScreens"
import { Integrations, Limits, Monitoring } from "./SystemScreens"
import { Audit, SettingsPage, Support } from "./AdminUtilityScreens"
import { Badge, Breadcrumbs, Card, Heading } from "./AdminUi"
import {
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileClock,
  Gauge,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Settings,
  Store,
  Users,
  X
} from "lucide-react"

export type AdminScreenName =
  | "dashboard"
  | "businesses"
  | "business-detail"
  | "business-new"
  | "business-edit"
  | "business-lock"
  | "users"
  | "user-detail"
  | "plans"
  | "plan-config"
  | "subscriptions"
  | "subscription-detail"
  | "change-plan"
  | "limits"
  | "monitoring"
  | "integrations"
  | "jobs"
  | "job-detail"
  | "audit"
  | "notifications"
  | "notification-new"
  | "notification-detail"
  | "support"
  | "settings"

const nav = [
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["businesses", "Doanh nghiệp", Building2],
  ["users", "Người dùng", Users],
  ["plans", "Gói dịch vụ", Boxes],
  ["subscriptions", "Thuê bao", ClipboardList],
  ["limits", "Hạn mức sử dụng", Database],
  ["monitoring", "Giám sát hệ thống", Gauge],
  ["integrations", "Tích hợp", PackageCheck],
  ["jobs", "Job lỗi", AlertTriangle],
  ["audit", "Nhật ký hoạt động", FileClock],
  ["notifications", "Thông báo", Bell],
  ["support", "Hỗ trợ kỹ thuật", Headphones],
  ["settings", "Cấu hình hệ thống", Settings]
] as const

const screenTitles: Record<AdminScreenName, string> = {
  dashboard: "Tổng quan",
  businesses: "Doanh nghiệp",
  "business-detail": "Doanh nghiệp / Mộc Store",
  "business-new": "Doanh nghiệp / Tạo mới",
  "business-edit": "Doanh nghiệp / Chỉnh sửa",
  "business-lock": "Doanh nghiệp / Khóa",
  users: "Người dùng",
  "user-detail": "Người dùng / Minh Anh",
  plans: "Gói dịch vụ",
  "plan-config": "Gói dịch vụ / Cấu hình",
  subscriptions: "Thuê bao",
  "subscription-detail": "Thuê bao / SUB-0001",
  "change-plan": "Thuê bao / Gán đổi gói",
  limits: "Hạn mức sử dụng",
  monitoring: "Giám sát hệ thống",
  integrations: "Tích hợp",
  jobs: "Job lỗi",
  "job-detail": "Job lỗi / JOB-00984",
  audit: "Nhật ký hoạt động",
  notifications: "Thông báo",
  "notification-new": "Thông báo / Soạn mới",
  "notification-detail": "Thông báo / Chi tiết",
  support: "Hỗ trợ kỹ thuật",
  settings: "Cấu hình hệ thống"
}

function href(screen: AdminScreenName) {
  return screen === "dashboard" ? "/" : `/admin/${screen}`
}

function getBreadcrumbs(screen: AdminScreenName) {
  const businessId = new URLSearchParams(window.location.search).get("businessId") ?? "TH0001"
  const businessLabel = businessId === "TH0001" ? "Mộc Store" : businessId
  const details: Partial<Record<AdminScreenName, { label: string; href?: string }[]>> = {
    "business-detail": [{ label: "Doanh nghiệp", href: href("businesses") }, { label: businessLabel }],
    "business-new": [{ label: "Doanh nghiệp", href: href("businesses") }, { label: "Tạo mới" }],
    "business-edit": [{ label: "Doanh nghiệp", href: href("businesses") }, { label: "Chỉnh sửa" }],
    "business-lock": [{ label: "Doanh nghiệp", href: href("businesses") }, { label: "Khóa doanh nghiệp" }],
    "user-detail": new URLSearchParams(window.location.search).get("business")
      ? [{ label: `Doanh nghiệp / ${businessLabel}`, href: `${href("business-detail")}?businessId=${encodeURIComponent(businessId)}` }, { label: "Chủ doanh nghiệp" }, { label: "Minh Anh" }]
      : [{ label: "Người dùng", href: href("users") }, { label: "Minh Anh" }],
    "subscription-detail": [{ label: "Thuê bao", href: href("subscriptions") }, { label: "SUB-0001" }],
    "change-plan": [{ label: "Thuê bao", href: href("subscriptions") }, { label: "Gán / đổi gói" }],
    "job-detail": [{ label: "Job lỗi", href: href("jobs") }, { label: "JOB-00984" }]
    ,
    "notification-new": [{ label: "Thông báo", href: href("notifications") }, { label: "Soạn thông báo" }]
    ,
    "notification-detail": [{ label: "Thông báo", href: href("notifications") }, { label: "Chi tiết" }]
  }
  return details[screen] ?? [{ label: "Nền tảng" }, { label: screenTitles[screen] }]
}

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const toInputDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  return { fromDate: toInputDate(start), toDate: toInputDate(end) }
}

function getDateRange(fromDate: string, toDate: string) {
  const start = new Date(`${fromDate}T00:00:00Z`)
  const end = new Date(`${toDate}T00:00:00Z`)
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  )
    return []

  const dates: string[] = []
  for (
    const date = new Date(start);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

function formatShortDate(value: string) {
  const [, month, day] = value.split("-")
  return `${day}/${month}`
}

export function AdminApp({ screen }: { screen: AdminScreenName }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState(() => {
    const message = window.sessionStorage.getItem("admin-toast")
    window.sessionStorage.removeItem("admin-toast")
    return message ?? ""
  })
  const clearTokens = useStoreAuth((state) => state.clearTokens)
  const jobsQuery = useQuery(adminQueryOptions.jobs())
  const pendingJobsCount = jobsQuery.data?.filter((job) => job.status === "pending").length ?? 0
  const active = useMemo(() => {
    if (screen.startsWith("business")) return "businesses"
    if (screen.startsWith("user")) return "users"
    if (screen.includes("plan"))
      return screen === "plans"
        ? "plans"
        : screen === "change-plan"
          ? "subscriptions"
          : "plans"
    if (screen.startsWith("subscription")) return "subscriptions"
    if (screen.startsWith("job")) return "jobs"
    if (screen.startsWith("notification")) return "notifications"
    return screen
  }, [screen])

  return (
    <div className="min-h-screen bg-[#f3f6f5] text-[#284341]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[216px] flex-col border-r border-[#dfe7e5] bg-white transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[66px] items-center gap-2 px-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00876a] text-white">
            <Store size={15} />
          </span>
          <strong className="text-xl tracking-tight">omniretail</strong>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="mx-4 mb-5 rounded-md bg-[#f3f6f5] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#829591]">
            Quản trị nền tảng
          </p>
          <p className="mt-1 text-sm font-bold">SaaS Admin</p>
        </div>
        <p className="px-6 pb-2 text-[9px] uppercase tracking-wider text-[#829591]">
          Không gian quản trị
        </p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 pb-4">
          {nav.map(([key, label, Icon]) => (
            <Link
              key={key}
              to={href(key)}
              className={`flex h-9 items-center gap-3 rounded-md px-3 text-xs ${
                active === key
                  ? "bg-[#e5f3ed] font-bold text-[#00876a]"
                  : "hover:bg-[#f3f6f5]"
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
              {key === "jobs" && (
                <Badge tone="amber" className="ml-auto">
                  {jobsQuery.isLoading ? "…" : pendingJobsCount}
                </Badge>
              )}
            </Link>
          ))}
        </nav>
        <div className="mx-6 border-t border-[#dfe7e5] py-5 text-[11px] text-[#829591]">
          <Link
            to="/admin/$screen"
            params={{ screen: "support" }}
            className="block py-2"
          >
            Trung tâm trợ giúp
          </Link>
          <Link
            to="/login"
            onClick={clearTokens}
            className="flex items-center gap-2 py-2"
          >
            <LogOut size={13} /> Đăng xuất
          </Link>
          <p className="mt-6 text-[8px] uppercase">
            Omniretail · Dữ liệu minh họa
          </p>
        </div>
      </aside>

      <div className="lg:pl-[216px]">
        <header className="sticky top-0 z-30 flex h-[66px] items-center border-b border-[#e9efed] bg-white px-5 lg:px-8">
          <button
            className="mr-4 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Breadcrumbs items={getBreadcrumbs(screen)} />
          <div className="ml-auto flex items-center gap-4">
            <Badge>Production</Badge>
            <span className="hidden text-[10px] text-[#829591] sm:block">
              26/10/2026 · UTC+7
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5f3ed] text-xs font-bold text-[#00876a]">
              LA
            </span>
            <div className="hidden sm:block">
              <p className="text-xs font-bold">Lan Anh</p>
              <p className="text-[10px] text-[#829591]">
                Quản trị viên nền tảng
              </p>
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8">
          <Screen
            screen={screen}
            notify={(message) => {
              setToast(message)
              window.setTimeout(() => setToast(""), 2400)
            }}
          />
        </main>
      </div>
      {mobileOpen && (
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-[#284341] px-4 py-3 text-sm text-white shadow-xl">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}

function Screen({
  screen,
  notify
}: {
  screen: AdminScreenName
  notify: (message: string) => void
}) {
  switch (screen) {
    case "dashboard":
      return <Dashboard />
    case "businesses":
      return <Businesses />
    case "business-detail":
      return <BusinessDetail />
    case "business-new":
      return (
        <BusinessForm
          title="Tạo doanh nghiệp"
          submit="Tạo doanh nghiệp"
          notify={notify}
        />
      )
    case "business-edit":
      return (
        <BusinessForm
          title="Chỉnh sửa doanh nghiệp"
          submit="Lưu thay đổi"
          edit
          notify={notify}
        />
      )
    case "business-lock":
      return <BusinessLock notify={notify} />
    case "users":
      return <UsersPage />
    case "user-detail":
      return <UserDetail />
    case "plans":
      return <Plans />
    case "plan-config":
      return <PlanConfig notify={notify} />
    case "subscriptions":
      return <Subscriptions />
    case "subscription-detail":
      return <SubscriptionDetail />
    case "change-plan":
      return <ChangePlan notify={notify} />
    case "limits":
      return <Limits />
    case "monitoring":
      return <Monitoring notify={notify} />
    case "integrations":
      return <Integrations />
    case "jobs":
      return <Jobs />
    case "job-detail":
      return <JobDetail notify={notify} />
    case "audit":
      return <Audit />
    case "notifications":
      return <Notifications />
    case "notification-new":
      return <NotificationForm notify={notify} />
    case "notification-detail":
      return <NotificationDetail />
    case "support":
      return <Support notify={notify} />
    case "settings":
      return <SettingsPage notify={notify} />
  }
}

function Dashboard() {
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const defaultDateRange = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(defaultDateRange.fromDate)
  const [toDate, setToDate] = useState(defaultDateRange.toDate)
  const [attentionPage, setAttentionPage] = useState(1)
  const query = useQuery(adminQueryOptions.dashboard())
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Tổng quan nền tảng"
          description="Theo dõi doanh nghiệp, thuê bao và sức khỏe dịch vụ."
        />
        <Card className="p-6 text-xs text-[#829591]">
          Đang tải dữ liệu tổng quan...
        </Card>
      </>
    )
  if (query.isError)
    return (
      <>
        <Heading
          title="Tổng quan nền tảng"
          description="Theo dõi doanh nghiệp, thuê bao và sức khỏe dịch vụ."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu tổng quan.
        </Card>
      </>
    )
  if (!query.data)
    return (
      <>
        <Heading
          title="Tổng quan nền tảng"
          description="Theo dõi doanh nghiệp, thuê bao và sức khỏe dịch vụ."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Dữ liệu tổng quan không hợp lệ.
        </Card>
      </>
    )
  const data = query.data
  const pageSize = 4
  const attentionPageCount = Math.ceil(data.attention.length / pageSize)
  const visibleAttention = data.attention.slice(
    (attentionPage - 1) * pageSize,
    attentionPage * pageSize
  )
  const chartDates = getDateRange(fromDate, toDate)
  const chartValues = chartDates.map(
    (_, index) => (data.transactionBars[index % data.transactionBars.length] ?? 0) * 160
  )
  const chartBars = chartValues.map((value) => (value / 16000) * 100)
  const chartWidth = Math.max(340, chartDates.length * 54)
  const formatDate = (value: string) => {
    const [year, month, day] = value.split("-")
    return `${day}/${month}/${year}`
  }
  return (
    <>
      <Heading
        title="Tổng quan nền tảng"
        description="Theo dõi doanh nghiệp, thuê bao và sức khỏe dịch vụ."
        action={
          <div className="relative">
            <button
              type="button"
              className="input flex w-56 items-center justify-between text-left"
              onClick={() => setDatePickerOpen((open) => !open)}
            >
              <span>
                {formatDate(fromDate)} – {formatDate(toDate)}
              </span>
              <span className="text-[#829591]">▾</span>
            </button>
            {datePickerOpen && (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-[#dfe7e5] bg-white p-4 shadow-xl">
                <p className="mb-3 text-xs font-bold">Chọn khoảng thời gian</p>
                <div className="grid gap-3">
                  <label className="text-[11px] font-bold">
                    Từ ngày
                    <input
                      className="input mt-1"
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                    />
                  </label>
                  <label className="text-[11px] font-bold">
                    Đến ngày
                    <input
                      className="input mt-1"
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-[#dfe7e5] px-3 py-2 text-[11px] font-bold"
                    onClick={() => {
                      setFromDate(defaultDateRange.fromDate)
                      setToDate(defaultDateRange.toDate)
                      setDatePickerOpen(false)
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[#00876a] px-3 py-2 text-[11px] font-bold text-white"
                    onClick={() => setDatePickerOpen(false)}
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((x, i) => (
          <Card key={x.label} className="p-5">
            <p className="text-xs text-[#829591]">{x.label}</p>
            <strong className="mt-2 block text-3xl">{x.value}</strong>
            <p
              className={`mt-2 text-[10px] ${
                i === 3
                  ? "text-[#c65248]"
                  : i === 1
                    ? "text-[#a97724]"
                    : "text-[#00876a]"
              }`}
            >
              {x.change}
            </p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-5">
        <div className="flex justify-between">
          <div>
            <h2 className="font-bold">Giao dịch toàn nền tảng</h2>
            <p className="text-[11px] text-[#829591]">
              Tổng số giao dịch mỗi ngày · {chartDates.length} ngày đã chọn
            </p>
          </div>
          <Badge className="self-center"> {chartDates.length} ngày</Badge>
        </div>
        <div className="mt-7 grid grid-cols-[36px_minmax(0,1fr)] grid-rows-[224px_24px] gap-x-2 overflow-x-auto">
          <div className="flex flex-col justify-between border-r border-[#dfe7e5] pr-2 text-right text-[10px] text-[#829591]">
            <span>16k</span>
            <span>12k</span>
            <span>8k</span>
            <span>4k</span>
            <span>0</span>
          </div>
          <div
            style={{
              minWidth: chartWidth,
              gridTemplateColumns: `repeat(${chartDates.length}, minmax(0, 1fr))`
            }}
            className="relative grid items-end gap-2 border-b border-[#dfe7e5] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(25%_-_1px),#edf1f0_calc(25%_-_1px),#edf1f0_25%)] px-3"
          >
            {chartBars.map((height, i) => (
              <div
                key={chartDates[i]}
                className="group relative flex h-full items-end justify-center"
              >
                <span className="pointer-events-none absolute top-2 hidden whitespace-nowrap rounded bg-[#284341] px-2 py-1 text-[10px] text-white group-hover:block">
                  {chartValues[i].toLocaleString("vi-VN")} giao dịch
                </span>
                <div
                  style={{ height: `${height}%` }}
                  className={`w-9 rounded-t transition-colors group-hover:bg-[#006f57] ${
                    i === chartBars.length - 1 ? "bg-[#00876a]" : "bg-[#b9ddd1]"
                  }`}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              minWidth: chartWidth,
              gridTemplateColumns: `repeat(${chartDates.length}, minmax(0, 1fr))`
            }}
            className="col-start-2 grid gap-2 px-3"
          >
            {chartDates.map((date) => (
              <span
                key={date}
                className="whitespace-nowrap text-center text-[10px] text-[#829591]"
              >
                {formatShortDate(date)}
              </span>
            ))}
          </div>
        </div>
      </Card>
      <Card className="mt-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold">Cần theo dõi</h2>
            <p className="mb-1 text-[11px] text-[#829591]">
              Các doanh nghiệp và sự kiện cần quản trị viên xử lý
            </p>
          </div>
          <span className="text-[11px] text-[#829591]">
            {(attentionPage - 1) * pageSize + 1}-
            {Math.min(attentionPage * pageSize, data.attention.length)} trong số{" "}
            {data.attention.length}
          </span>
        </div>
        {visibleAttention.map((x) => (
          <div
            key={x.subject + x.description}
            className="grid min-h-[58px] gap-2 border-t border-[#edf1f0] py-3 text-xs first:border-0 md:grid-cols-[1fr_2fr_auto_auto]"
          >
            <b className="self-center">{x.subject}</b>
            <span className="self-center text-[#829591]">{x.description}</span>
            <Badge className="self-center" tone={x.target === "jobs" ? "red" : "amber"}>
              {x.status}
            </Badge>
            <Link to={href(x.target)} className="self-center text-[11px] font-bold text-[#00876a]">
              Xem →
            </Link>
          </div>
        ))}
        <div className=" flex items-center justify-end gap-2 border-t border-[#edf1f0] pt-3">
          <span className="mr-2 text-[11px] text-[#829591]">
            Trang {attentionPage}/{attentionPageCount}
          </span>
          <button
            type="button"
            aria-label="Trang trước"
            disabled={attentionPage === 1}
            className="rounded border border-[#dfe7e5] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setAttentionPage((page) => Math.max(1, page - 1))}
          >
            ‹
          </button>
          {Array.from(
            { length: attentionPageCount },
            (_, index) => index + 1
          ).map((page) => (
            <button
              type="button"
              key={page}
              className={`rounded px-2 py-1 text-xs ${
                page === attentionPage
                  ? "bg-[#00876a] text-white"
                  : "border border-[#dfe7e5]"
              }`}
              onClick={() => setAttentionPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            aria-label="Trang sau"
            disabled={attentionPage === attentionPageCount}
            className="rounded border border-[#dfe7e5] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() =>
              setAttentionPage((page) => Math.min(attentionPageCount, page + 1))
            }
          >
            ›
          </button>
        </div>
      </Card>
    </>
  )
}
