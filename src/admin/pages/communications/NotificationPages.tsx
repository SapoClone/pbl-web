import { Send } from "lucide-react"
import { AdminLink } from "../../components/AdminLink"
import { ActionButton, Card, DataTable, FilterBar, FormField, PageHeader, StatusBadge } from "../../components/ui"
import { useAdminStore } from "../../store/useAdminStore"
import type { TableColumn } from "../../types"

interface NotificationRow { title: string; audience: string; type: string; status: string; time: string }
const rows: NotificationRow[] = [{ title: "Bảo trì hệ thống định kỳ", audience: "Toàn bộ doanh nghiệp", type: "Bảo trì", status: "Đã gửi", time: "25/10 · 09:00" }, { title: "Cập nhật tính năng kiểm kho", audience: "Doanh nghiệp gói Pro", type: "Cập nhật", status: "Đã gửi", time: "23/10 · 15:30" }, { title: "Hướng dẫn kết nối Shopee", audience: "Nhóm Mộc Store", type: "Hướng dẫn", status: "Bản nháp", time: "—" }]
const columns: TableColumn<NotificationRow>[] = [{ key: "title", label: "Tiêu đề", render: (row) => <b>{row.title}</b> }, { key: "audience", label: "Đối tượng nhận" }, { key: "type", label: "Loại" }, { key: "status", label: "Trạng thái", render: (row) => <StatusBadge tone={row.status === "Bản nháp" ? "gray" : "green"}>{row.status}</StatusBadge> }, { key: "time", label: "Thời gian" }, { key: "actions", label: "", render: (row) => <AdminLink screen="notification-new" className="text-[#00876a]">{row.status === "Bản nháp" ? "Chỉnh sửa" : "Xem chi tiết"}</AdminLink> }]

export function NotificationsPage() {
  return <><PageHeader title="Thông báo hệ thống" description="Quản lý thông báo gửi đến doanh nghiệp và người dùng." action={<ActionButton screen="notification-new"><Send size={13}/> Soạn thông báo</ActionButton>}/><div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs"><b className="border-b-2 border-[#00876a] px-2 pb-3 text-[#00876a]">Tất cả</b><span>Đã gửi</span><span>Bản nháp</span></div><Card><FilterBar placeholder="Tìm theo tiêu đề thông báo..."/><DataTable columns={columns} rows={rows}/></Card></>
}

export function NotificationCreatePage() {
  const showToast = useAdminStore((state) => state.showToast)
  return <><PageHeader title="Soạn thông báo" description="Tạo thông báo mới gửi đến người dùng nền tảng."/><div className="grid gap-4 lg:grid-cols-[1.4fr_.7fr]"><Card className="p-6"><h2 className="mb-5 font-bold">Nội dung thông báo</h2><div className="space-y-5"><FormField label="Tiêu đề" value="Bảo trì hệ thống định kỳ" required/><FormField label="Loại thông báo" value="Bảo trì"/><label className="block text-xs font-bold">Nội dung<textarea className="input mt-2 min-h-44" defaultValue="Hệ thống sẽ bảo trì từ 00:00 đến 02:00 ngày 31/10/2026."/></label><ActionButton tone="plain">Lưu bản nháp</ActionButton></div></Card><div className="space-y-4"><Card className="p-6"><h2 className="mb-5 font-bold">Đối tượng nhận</h2><label className="flex gap-2 text-xs"><input type="radio" defaultChecked name="audience"/> Toàn bộ doanh nghiệp</label><label className="mt-3 flex gap-2 text-xs"><input type="radio" name="audience"/> Doanh nghiệp theo gói</label><p className="mt-6 text-xs text-[#829591]">100 doanh nghiệp · 642 người dùng</p></Card><Card className="p-6"><h2 className="font-bold">Thời gian gửi</h2><label className="mt-4 flex gap-2 text-xs"><input type="radio" defaultChecked name="time"/> Gửi ngay</label><label className="mt-3 flex gap-2 text-xs"><input type="radio" name="time"/> Lên lịch</label></Card></div></div><div className="mt-5 flex justify-end"><ActionButton onClick={() => showToast("Thông báo đã được gửi thành công")}><Send size={13}/> Gửi thông báo</ActionButton></div></>
}
