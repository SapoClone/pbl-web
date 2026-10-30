import { AdminLink } from "../../components/AdminLink"
import { ActionButton, Card, DataTable, FilterBar, InfoGrid, PageHeader, StatusBadge } from "../../components/ui"
import { subscriptions } from "../../data/mockData"
import { useAdminStore } from "../../store/useAdminStore"
import type { TableColumn } from "../../types"

type SubscriptionRow = (typeof subscriptions)[number]

const columns: TableColumn<SubscriptionRow>[] = [
  { key: "id", label: "Mã thuê bao", render: (row) => <b>{row.id}</b> },
  { key: "business", label: "Doanh nghiệp" }, { key: "plan", label: "Gói" },
  { key: "cycle", label: "Chu kỳ" },
  { key: "status", label: "Trạng thái", render: (row) => <StatusBadge tone={row.status.includes("hạn") ? "amber" : "green"}>{row.status}</StatusBadge> },
  { key: "actions", label: "", render: () => <AdminLink screen="subscription-detail" className="text-[#00876a]">Xem chi tiết</AdminLink> }
]

export function SubscriptionsPage() {
  return <><PageHeader title="Thuê bao" description="Theo dõi vòng đời, thanh toán và thay đổi gói dịch vụ."/><Card><FilterBar/><DataTable columns={columns} rows={subscriptions}/></Card></>
}

export function SubscriptionDetailPage() {
  return <><PageHeader title="Thuê bao SUB-0001" description="Thuê bao / Mộc Store" action={<ActionButton screen="change-plan">Gán / đổi gói</ActionButton>}/><div className="grid gap-4 md:grid-cols-2"><Card className="p-6"><div className="flex justify-between"><h2 className="font-bold">Thông tin thuê bao</h2><StatusBadge tone="amber">Sắp hết hạn</StatusBadge></div><p className="mt-7 text-xs">Pro</p><p className="mt-2 text-2xl font-bold text-[#00876a]">599.000đ / tháng</p><InfoGrid items={[["Ngày bắt đầu", "01/10/2026"], ["Ngày kết thúc", "01/11/2026"], ["Doanh nghiệp", "Mộc Store · TH0001"]]}/></Card><Card className="p-6"><h2 className="font-bold">Thanh toán kỳ tiếp theo</h2><p className="mt-7 text-3xl font-bold">599.000 đ</p><p className="mt-2 text-xs text-[#829591]">Hạn thanh toán 01/11/2026</p></Card></div><Card className="mt-4 p-5"><h2 className="font-bold">Lịch sử gia hạn và thay đổi gói</h2><div className="mt-5 space-y-4 text-xs"><div className="grid grid-cols-4"><span>23/09/2026 · 09:12</span><span>Gia hạn thuê bao</span><b>Pro</b><span>Minh Anh</span></div><div className="grid grid-cols-4"><span>01/08/2026 · 14:33</span><span>Nâng cấp Basic → Pro</span><b>Pro</b><span>Lan Anh</span></div></div></Card></>
}

export function ChangePlanPage() {
  const showToast = useAdminStore((state) => state.showToast)
  const limits = [{ label: "Chi nhánh", value: "2 / 2", invalid: false }, { label: "Người dùng", value: "12 / 10", invalid: true }, { label: "Sản phẩm", value: "1.250 / 1.000", invalid: true }, { label: "Dung lượng", value: "4,2 / 10 GB", invalid: false }]
  return <><PageHeader title="Gán / Đổi gói dịch vụ" description="Thuê bao SUB-0001 · Mộc Store"/><div className="grid gap-4 lg:grid-cols-[1.4fr_.7fr]"><Card className="p-6"><h2 className="mb-5 font-bold">Gói mới và thời gian hiệu lực</h2><div className="grid gap-5 sm:grid-cols-2"><label className="text-xs font-bold">Doanh nghiệp<input className="input mt-2" defaultValue="Mộc Store · TH0001"/></label><label className="text-xs font-bold">Gói dịch vụ mới<select className="input mt-2"><option>Basic</option><option>Pro</option></select></label><label className="text-xs font-bold">Ngày hiệu lực<input className="input mt-2" type="date" defaultValue="2026-11-01"/></label><label className="text-xs font-bold">Ngày kết thúc<input className="input mt-2" type="date" defaultValue="2026-12-01"/></label></div><div className="mt-5 rounded-md bg-[#fde8e5] p-3 text-xs text-[#c65248]">Chưa thể hạ cấp: doanh nghiệp đang sử dụng vượt hạn mức gói Basic.</div></Card><Card className="p-6"><h2 className="font-bold">Kiểm tra hạn mức gói mới</h2>{limits.map((limit) => <div className="mt-5 flex justify-between text-xs" key={limit.label}><span>{limit.label}</span><b className={limit.invalid ? "text-[#c65248]" : "text-[#00876a]"}>{limit.value}</b></div>)}</Card></div><div className="mt-5 flex justify-end gap-2"><ActionButton tone="plain" screen="subscription-detail">Hủy</ActionButton><ActionButton onClick={() => showToast("Vui lòng xử lý phần sử dụng vượt hạn mức")}>Kiểm tra lại hạn mức</ActionButton></div></>
}
