import { AdminLink } from "../../components/AdminLink"
import { Card, DataTable, FilterBar, PageHeader, StatusBadge } from "../../components/ui"
import type { TableColumn } from "../../types"

interface IntegrationRow { business: string; channel: string; environment: string; status: string; syncedAt: string }
const rows: IntegrationRow[] = [{ business: "Mộc Store", channel: "Shopee", environment: "Official Sandbox", status: "Đã kết nối", syncedAt: "26/10 · 21:58" }, { business: "Nhà Gốm An Nhiên", channel: "TikTok Shop", environment: "Development Shop", status: "Xác thực lại", syncedAt: "26/10 · 21:32" }, { business: "Lá Xanh Market", channel: "Shopee", environment: "Official Sandbox", status: "Đã kết nối", syncedAt: "26/10 · 21:30" }, { business: "Mây Boutique", channel: "TikTok Shop", environment: "Development Shop", status: "Chưa đồng bộ", syncedAt: "Chưa có dữ liệu" }]
const columns: TableColumn<IntegrationRow>[] = [{ key: "business", label: "Doanh nghiệp / chi nhánh", render: (row) => <b>{row.business}</b> }, { key: "channel", label: "Kênh" }, { key: "environment", label: "Môi trường" }, { key: "status", label: "Trạng thái", render: (row) => <StatusBadge tone={row.status === "Xác thực lại" ? "amber" : row.status === "Chưa đồng bộ" ? "blue" : "green"}>{row.status}</StatusBadge> }, { key: "syncedAt", label: "Đồng bộ gần nhất" }, { key: "actions", label: "", render: (row) => <AdminLink screen={row.status === "Xác thực lại" ? "jobs" : "integrations"} className="text-[#00876a]">Xem chi tiết</AdminLink> }]

export function IntegrationPage() {
  return <><PageHeader title="Theo dõi tích hợp" description="Tình trạng kết nối và đồng bộ từ các kênh bán hàng."/><div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs"><b className="border-b-2 border-[#00876a] px-2 pb-3 text-[#00876a]">Kết nối</b><span>Lịch sử đồng bộ</span><span>Webhook</span></div><Card><FilterBar/><DataTable columns={columns} rows={rows}/></Card></>
}
