import { businesses } from "../../data/mockData"
import { Card, DataTable, FilterBar, PageHeader, StatusBadge } from "../../components/ui"
import type { TableColumn } from "../../types"

interface LimitRow { business: string; plan: string; branches: string; users: string; products: string; storage: string; warning: string }

const rows: LimitRow[] = businesses.slice(0, 4).map((business, index) => ({ business: business.name, plan: business.plan, branches: `${index + 1} / 5`, users: `${8 + index * 2} / 30`, products: `${1200 + index * 430} / 10.000`, storage: `${12 + index * 9} / 50 GB`, warning: index === 3 ? "Vượt hạn mức" : index === 2 ? "Gần hạn mức" : "Bình thường" }))
const columns: TableColumn<LimitRow>[] = [
  { key: "business", label: "Doanh nghiệp", render: (row) => <b>{row.business}</b> }, { key: "plan", label: "Gói" },
  { key: "branches", label: "Chi nhánh" }, { key: "users", label: "Người dùng" }, { key: "products", label: "Sản phẩm" },
  { key: "storage", label: "Dung lượng" }, { key: "warning", label: "Cảnh báo", render: (row) => <StatusBadge tone={row.warning === "Vượt hạn mức" ? "red" : row.warning === "Gần hạn mức" ? "amber" : "green"}>{row.warning}</StatusBadge> }
]

export function LimitsPage() {
  return <><PageHeader title="Hạn mức sử dụng" description="Theo dõi mức tiêu thụ tài nguyên theo từng doanh nghiệp."/><Card><FilterBar/><DataTable columns={columns} rows={rows}/></Card><Card className="mt-4 p-6"><h2 className="font-bold">Mây Boutique · Chi tiết sử dụng</h2><div className="mt-5 grid gap-6 sm:grid-cols-2">{[["Chi nhánh", 100, "2 / 2"], ["Người dùng", 100, "10 / 10"], ["Sản phẩm", 86, "860 / 1.000"], ["Dung lượng", 64, "6,4 / 10 GB"]].map(([label, percent, value]) => <div key={String(label)}><div className="flex justify-between text-xs"><span>{label}</span><b>{value}</b></div><div className="mt-2 h-2 rounded bg-[#e6eeeb]"><div style={{ width: `${percent}%` }} className={`h-2 rounded ${percent === 100 ? "bg-[#d95f54]" : "bg-[#00876a]"}`}/></div></div>)}</div></Card></>
}
