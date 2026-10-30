import { Lock, Plus } from "lucide-react"
import type { FormEvent } from "react"
import { useAdminStore } from "../../store/useAdminStore"
import type { Business, TableColumn } from "../../types"
import { AdminLink } from "../../components/AdminLink"
import { ActionButton, Card, DataTable, FilterBar, FormActions, FormField, InfoGrid, PageHeader, StatusBadge } from "../../components/ui"

const businessColumns: TableColumn<Business>[] = [
  { key: "name", label: "Doanh nghiệp", render: (row) => <b>{row.name}</b> },
  { key: "owner", label: "Chủ tài khoản" }, { key: "plan", label: "Gói" },
  { key: "status", label: "Trạng thái", render: (row) => <StatusBadge tone={row.status === "Đã khóa" ? "red" : row.status === "Đang thử" ? "amber" : "green"}>{row.status}</StatusBadge> },
  { key: "subscriptionId", label: "Mã thuê bao" }, { key: "users", label: "Người dùng" },
  { key: "actions", label: "", render: () => <AdminLink screen="business-detail" className="text-[#00876a]">Xem chi tiết</AdminLink> }
]

export function BusinessesPage() {
  const searchTerm = useAdminStore((state) => state.searchTerm).toLowerCase()
  const businesses = useAdminStore((state) => state.businesses)
  const filteredBusinesses = businesses.filter((business) => business.name.toLowerCase().includes(searchTerm) || business.owner.toLowerCase().includes(searchTerm))
  return <><PageHeader title="Doanh nghiệp" description="Quản lý toàn bộ doanh nghiệp đang sử dụng nền tảng." action={<ActionButton screen="business-new"><Plus size={14}/> Tạo doanh nghiệp</ActionButton>}/><Card><FilterBar/><DataTable columns={businessColumns} rows={filteredBusinesses}/></Card></>
}

export function BusinessDetailPage() {
  return <><PageHeader title="Mộc Store" description="Mã DN: DN-TH0001 · Khởi tạo ngày 12/03/2025" action={<div className="flex gap-2"><ActionButton tone="plain" screen="business-edit">Chỉnh sửa</ActionButton><ActionButton tone="danger" screen="business-lock"><Lock size={13}/> Khóa doanh nghiệp</ActionButton></div>}/><div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs"><b className="border-b-2 border-[#00876a] px-2 pb-3 text-[#00876a]">Tổng quan</b><span>Gói dịch vụ</span><span>Hoạt động</span></div><div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]"><Card className="p-5"><h2 className="font-bold">Thông tin doanh nghiệp</h2><InfoGrid items={[["Mã doanh nghiệp", "TH0001"], ["Tên doanh nghiệp", "Mộc Store"], ["Mã số thuế", "0312345678"], ["Email liên hệ", "contact@mocstore.vn"], ["Ngày khởi tạo", "12/03/2025 · 09:15"]]}/></Card><Card className="p-5"><h2 className="font-bold">Chủ cửa hàng</h2><div className="mt-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f3ed] font-bold text-[#00876a]">MA</span><div><b className="text-sm">Minh Anh</b><p className="text-[11px] text-[#829591]">minhanh@mocstore.vn</p></div></div><div className="mt-5"><ActionButton tone="plain" screen="user-detail">Xem người dùng</ActionButton></div></Card><Card className="p-5"><h2 className="font-bold">Thuê bao hiện tại</h2><p className="mt-4 text-sm font-bold">Pro · Chu kỳ tháng</p><p className="mt-1 text-2xl font-bold text-[#00876a]">599.000đ / tháng</p><StatusBadge tone="amber" className="mt-3">Hết hạn sau 7 ngày</StatusBadge><div className="mt-4"><ActionButton tone="plain" screen="change-plan">Đổi gói dịch vụ</ActionButton></div></Card><Card className="p-5"><h2 className="font-bold">Hỗ trợ kỹ thuật</h2><p className="mt-4 text-xs text-[#829591]">Truy cập không gian doanh nghiệp với quyền chỉ đọc. Mọi phiên đều được ghi nhật ký.</p><div className="mt-5"><ActionButton tone="plain" screen="support">Bắt đầu phiên hỗ trợ</ActionButton></div></Card></div></>
}

function BusinessForm({ edit = false }: { edit?: boolean }) {
  const showToast = useAdminStore((state) => state.showToast)
  const createBusiness = useAdminStore((state) => state.createBusiness)
  const updateBusiness = useAdminStore((state) => state.updateBusiness)
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get("name") || "Doanh nghiệp mới")
    const owner = String(data.get("owner") || "Chưa cập nhật")
    if (edit) updateBusiness("TH0001", { name, owner })
    else createBusiness({ name, owner, plan: "Free", status: "Đang thử", subscriptionId: `TH${String(Date.now()).slice(-4)}`, users: 1 })
    showToast(edit ? "Đã lưu thay đổi doanh nghiệp" : "Đã tạo doanh nghiệp mới")
  }
  return <><PageHeader title={edit ? "Chỉnh sửa doanh nghiệp" : "Tạo doanh nghiệp"} description={edit ? "Cập nhật thông tin và chính sách của doanh nghiệp." : "Tạo doanh nghiệp mới và tài khoản chủ sở hữu."}/><form onSubmit={onSubmit}><div className="grid gap-4 lg:grid-cols-[1.4fr_.7fr]"><Card className="p-6"><h2 className="mb-5 font-bold">Thông tin doanh nghiệp</h2><div className="grid gap-5 sm:grid-cols-2"><FormField label="Tên doanh nghiệp" value={edit ? "Mộc Store" : ""} required/><FormField label="Mã truy cập" value={edit ? "moc-store" : ""} required/><FormField label="Mã số thuế" value={edit ? "0312345678" : ""}/><FormField label="Số điện thoại" value={edit ? "090 123 4567" : ""}/><label className="block text-xs font-bold sm:col-span-2">Địa chỉ<textarea className="input mt-2 min-h-24" defaultValue={edit ? "28 Trần Phú, TP. Hồ Chí Minh" : ""}/></label></div></Card><div className="space-y-4"><Card className="p-6"><h2 className="mb-5 font-bold">Chủ cửa hàng</h2><div className="space-y-5"><FormField label="Họ và tên" value={edit ? "Minh Anh" : ""} required/><FormField label="Email đăng nhập" value={edit ? "minhanh@mocstore.vn" : ""} type="email" required/><FormField label="Số điện thoại" value={edit ? "090 888 6868" : ""}/></div></Card><Card className="p-6"><h2 className="font-bold">Sau khi lưu</h2><p className="mt-3 text-[11px] leading-5 text-[#829591]">Hệ thống tự tạo chi nhánh mặc định và gửi email thiết lập mật khẩu cho chủ tài khoản.</p></Card></div></div><FormActions cancelScreen={edit ? "business-detail" : "businesses"} submitLabel={edit ? "Lưu thay đổi" : "Tạo doanh nghiệp"}/></form></>
}

export function BusinessCreatePage() { return <BusinessForm/> }
export function BusinessEditPage() { return <BusinessForm edit/> }

export function BusinessLockPage() {
  const showToast = useAdminStore((state) => state.showToast)
  return <><PageHeader title="Mộc Store" description="Thông tin doanh nghiệp"/><div className="fixed inset-0 z-40 flex items-center justify-center bg-[#284341]/35 p-4"><Card className="w-full max-w-lg p-6 shadow-2xl"><h2 className="text-lg font-bold">Khóa doanh nghiệp</h2><p className="mt-1 text-sm font-bold">Mộc Store · TH0001</p><div className="mt-5 rounded-md bg-[#fff2dc] p-3 text-xs text-[#a97724]">Người dùng của doanh nghiệp sẽ không thể truy cập hệ thống.</div><label className="mt-5 block text-xs font-bold">Lý do khóa *<textarea className="input mt-2 min-h-28" placeholder="Mô tả lý do khóa doanh nghiệp..."/></label><label className="mt-4 flex gap-2 text-xs"><input type="checkbox"/> Giữ dữ liệu để có thể kích hoạt lại sau này</label><div className="mt-6 flex justify-end gap-2"><ActionButton tone="plain" screen="business-detail">Hủy</ActionButton><ActionButton tone="danger" onClick={() => showToast("Đã khóa doanh nghiệp Mộc Store")}>Xác nhận khóa</ActionButton></div></Card></div></>
}
