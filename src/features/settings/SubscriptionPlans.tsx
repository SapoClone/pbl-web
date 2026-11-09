import { Check, Crown, HardDrive, Store, UsersRound, Boxes } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getCurrentSubscription, listStorePlans, type StorePlan } from "@/api/platform/subscription"

const money = (value: number) => value === 0 ? "Miễn phí" : `${value.toLocaleString("vi-VN")} ₫/tháng`

export function SubscriptionPlans() {
  const plans = useQuery({ queryKey: ["store-plans"], queryFn: listStorePlans })
  const current = useQuery({ queryKey: ["current-subscription"], queryFn: getCurrentSubscription })
  if (plans.isLoading || current.isLoading) return <section className="mb-7 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải thông tin gói dịch vụ...</section>
  if (plans.isError || current.isError) return <section className="mb-7 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-600">Không thể tải gói dịch vụ từ KrakenD.</section>
  const subscription = current.data!
  return <section className="mb-7">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#163d36]">Gói dịch vụ</h2><p className="mt-1 text-sm text-slate-500">Gói hiện tại và hạn mức sử dụng của cửa hàng.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${subscription.warning === "at_limit" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>Đang dùng: {subscription.plan.name}</span></div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{subscription.usage.map((item) => <Usage key={item.key} item={item} />)}</div>
    <div className="grid gap-4 lg:grid-cols-3">{plans.data!.map((plan) => <PlanCard key={plan.id} plan={plan} current={plan.id === subscription.plan.id} />)}</div>
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
