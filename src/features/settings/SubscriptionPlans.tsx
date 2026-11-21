import { Check, Crown, HardDrive, Store, UsersRound, Boxes } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getCurrentSubscription, listStorePlans, type StorePlan } from "@/api/platform/subscription"

import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const money = (value: number) => value === 0 ? "Miễn phí" : `${value.toLocaleString("vi-VN")} ₫/tháng`

const DEMO_PLANS: StorePlan[] = [
  {
    id: "plan-starter",
    code: "starter",
    name: "Gói Khởi nghiệp",
    description: "Phù hợp cho cửa hàng đơn lẻ hoặc bán lẻ cơ bản.",
    priceMonthly: 0,
    isFeatured: false,
    quotas: { branches: 1, users: 3, products: 500, storageGb: 2 }
  },
  {
    id: "plan-pro",
    code: "pro",
    name: "Gói Tăng trưởng (Pro)",
    description: "Giải pháp đa kênh toàn diện cho chuỗi cửa hàng và bán hàng sàn TMĐT.",
    priceMonthly: 499000,
    isFeatured: true,
    quotas: { branches: 5, users: 20, products: 5000, storageGb: 20 }
  },
  {
    id: "plan-enterprise",
    code: "enterprise",
    name: "Gói Doanh nghiệp",
    description: "Tối ưu cho doanh nghiệp bán lẻ quy mô lớn, tích hợp tùy biến sâu.",
    priceMonthly: 1290000,
    isFeatured: false,
    quotas: { branches: 20, users: 100, products: 50000, storageGb: 100 }
  }
]

const DEMO_SUBSCRIPTION: import("@/api/platform/subscription").CurrentSubscription = {
  id: "sub-demo-01",
  code: "SUB-PRO-2026",
  status: "active",
  billingCycle: "monthly",
  startedAt: "2026-01-01T00:00:00Z",
  expiresAt: "2027-01-01T00:00:00Z",
  plan: DEMO_PLANS[1],
  warning: "normal",
  usage: [
    { key: "branches", used: 2, limit: 5, ok: true },
    { key: "users", used: 5, limit: 20, ok: true },
    { key: "products", used: 142, limit: 5000, ok: true },
    { key: "storageGb", used: 2.1, limit: 20, ok: true }
  ]
}

export function SubscriptionPlans() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const plans = useQuery({ queryKey: ["store-plans"], queryFn: listStorePlans, enabled: !isDemo })
  const current = useQuery({ queryKey: ["current-subscription"], queryFn: getCurrentSubscription, enabled: !isDemo })
  
  const displayPlans = isDemo || plans.isError ? DEMO_PLANS : plans.data
  const displaySubscription = isDemo || current.isError ? DEMO_SUBSCRIPTION : current.data

  if ((plans.isLoading || current.isLoading) && !isDemo) {
    return <section className="mb-7 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải thông tin gói dịch vụ...</section>
  }

  if (!displayPlans || !displaySubscription) {
    return <section className="mb-7 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">Không thể tải gói dịch vụ từ KrakenD.</section>
  }

  const subscription = displaySubscription
  return <section className="mb-7">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#163d36]">Gói dịch vụ</h2><p className="mt-1 text-sm text-slate-500">Gói hiện tại và hạn mức sử dụng của cửa hàng.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${subscription.warning === "at_limit" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>Đang dùng: {subscription.plan.name}</span></div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{subscription.usage.map((item) => <Usage key={item.key} item={item} />)}</div>
    <div className="grid gap-4 lg:grid-cols-3">{displayPlans.map((plan) => <PlanCard key={plan.id} plan={plan} current={plan.id === subscription.plan.id} />)}</div>
    <p className="mt-3 text-xs text-slate-400">Việc đổi gói hiện do quản trị viên hệ thống thực hiện; owner chỉ xem gói và hạn mức của cửa hàng.</p>
  </section>
}

function PlanCard({ plan, current }: { plan: StorePlan; current: boolean }) {
  return <article className={`relative rounded-xl border bg-white p-5 ${current ? "border-[#16866f] ring-2 ring-[#16866f]/10" : plan.isFeatured ? "border-emerald-200" : "border-slate-200"}`}>
    {(current || plan.isFeatured) && <span className="absolute right-4 top-4 rounded-full bg-[#e6f5ee] px-2.5 py-1 text-[10px] font-semibold text-[#16866f]">{current ? "Gói hiện tại" : "Phổ biến"}</span>}
    <Crown size={20} className="mb-3 text-[#16866f]" /><h3 className="text-lg font-semibold text-[#163d36]">{plan.name}</h3><p className="mt-1 min-h-10 text-sm text-slate-500">{plan.description}</p><p className="my-4 text-xl font-semibold text-[#163d36]">{money(plan.priceMonthly)}</p>
    <ul className="space-y-2 text-sm text-slate-600"><Line text={`${plan.quotas.branches} chi nhánh`} /><Line text={`${plan.quotas.users} người dùng`} /><Line text={`${plan.quotas.products.toLocaleString("vi-VN")} sản phẩm`} /><Line text={`${plan.quotas.storageGb.toLocaleString("vi-VN")} GB lưu trữ`} /></ul>
  </article>
}

function Line({ text }: { text: string }) { return <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600" />{text}</li> }
function Usage({ item }: { item: { key: string; used: number; limit: number } }) { const meta = { branches: [Store, "Chi nhánh"], users: [UsersRound, "Người dùng"], products: [Boxes, "Sản phẩm"], storageGb: [HardDrive, "Dung lượng (GB)"] }[item.key] as [typeof Store, string]; const Icon = meta[0]; const percent = item.limit > 0 ? Math.min(100, item.used / item.limit * 100) : 0; return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs text-slate-500"><Icon size={15} />{meta[1]}</div><p className="mt-2 text-lg font-semibold text-[#163d36]">{item.used.toLocaleString("vi-VN")} / {item.limit.toLocaleString("vi-VN")}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${percent >= 100 ? "bg-amber-500" : "bg-[#16866f]"}`} style={{ width: `${percent}%` }} /></div></div> }
