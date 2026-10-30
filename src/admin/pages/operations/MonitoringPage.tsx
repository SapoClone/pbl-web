import { RefreshCw } from "lucide-react"
import { AdminLink } from "../../components/AdminLink"
import { ActionButton, Card, DataTable, PageHeader, StatusBadge } from "../../components/ui"
import { useAdminStore } from "../../store/useAdminStore"
import type { TableColumn } from "../../types"

interface ServiceRow { name: string; status: string; load: string; updatedAt: string }
const services: ServiceRow[] = [{ name: "API Gateway", status: "Ổn định", load: "142 ms · p95", updatedAt: "22:01:06" }, { name: "PostgreSQL", status: "Ổn định", load: "42 / 100 kết nối", updatedAt: "22:01:02" }, { name: "Redis", status: "Ổn định", load: "61% bộ nhớ", updatedAt: "22:00:58" }, { name: "Integration Worker", status: "Cảnh báo", load: "8 job lỗi", updatedAt: "22:00:54" }]
const columns: TableColumn<ServiceRow>[] = [{ key: "name", label: "Dịch vụ", render: (row) => <b>{row.name}</b> }, { key: "status", label: "Trạng thái", render: (row) => <StatusBadge tone={row.status === "Cảnh báo" ? "amber" : "green"}>{row.status}</StatusBadge> }, { key: "load", label: "Độ trễ / tải" }, { key: "updatedAt", label: "Cập nhật gần nhất" }, { key: "actions", label: "", render: (row) => <AdminLink screen={row.status === "Cảnh báo" ? "jobs" : "monitoring"} className="text-[#00876a]">Xem chi tiết</AdminLink> }]

export function MonitoringPage() {
  const showToast = useAdminStore((state) => state.showToast)
  return <><PageHeader title="Giám sát hệ thống" description="Sức khỏe dịch vụ và lưu lượng toàn nền tảng." action={<ActionButton onClick={() => showToast("Đã cập nhật dữ liệu giám sát")}><RefreshCw size={13}/> Cập nhật dữ liệu</ActionButton>}/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Độ trễ API", "142 ms", "P95 · 30 phút"], ["Tỷ lệ lỗi", "0,28%", "Trong ngưỡng"], ["Người dùng hoạt động", "642", "24 giờ qua"], ["Hàng đợi", "28 job", "Đang chờ"]].map(([label, value, note]) => <Card className="p-5" key={label}><p className="text-xs text-[#829591]">{label}</p><b className="mt-2 block text-2xl">{value}</b><p className="mt-1 text-[10px] text-[#00876a]">{note}</p></Card>)}</div><Card className="mt-4"><DataTable columns={columns} rows={services}/></Card></>
}
