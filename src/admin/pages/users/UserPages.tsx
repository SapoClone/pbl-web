import { AdminLink } from "../../components/AdminLink"
import { ActionButton, Card, DataTable, FilterBar, InfoGrid, PageHeader, StatusBadge } from "../../components/ui"
import { users } from "../../data/mockData"
import type { TableColumn } from "../../types"

type UserRow = (typeof users)[number]

const columns: TableColumn<UserRow>[] = [
  { key: "name", label: "Người dùng", render: (row) => <div><b>{row.name}</b><p className="text-[10px] text-[#829591]">{row.name.toLowerCase().replaceAll(" ", "")}@omniretail.vn</p></div> },
  { key: "business", label: "Doanh nghiệp" }, { key: "role", label: "Vai trò" },
  { key: "status", label: "Trạng thái", render: (row) => <StatusBadge tone={row.status === "Hoạt động" ? "green" : "amber"}>{row.status}</StatusBadge> },
  { key: "lastLogin", label: "Đăng nhập gần nhất" },
  { key: "actions", label: "", render: () => <AdminLink screen="user-detail" className="text-[#00876a]">Xem chi tiết</AdminLink> }
]

export function UsersPage() {
  return <><PageHeader title="Người dùng" description="Tra cứu người dùng trên toàn nền tảng."/><Card><FilterBar placeholder="Tìm theo tên, email..."/><DataTable columns={columns} rows={users}/></Card></>
}

export function UserDetailPage() {
  return <><PageHeader title="Minh Anh" description="Người dùng / Chủ cửa hàng / Mộc Store"/><div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs"><b className="border-b-2 border-[#00876a] px-2 pb-3 text-[#00876a]">Hồ sơ</b><span>Phiên đăng nhập</span><span>Lịch sử hoạt động</span></div><div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]"><Card className="p-6"><h2 className="font-bold">Thông tin tài khoản</h2><InfoGrid items={[["Email", "minhanh@mocstore.vn"], ["Điện thoại", "090 888 6868"], ["Doanh nghiệp", "Mộc Store · TH0001"], ["Vai trò", "Chủ cửa hàng"], ["Trạng thái", "Hoạt động"], ["Hoạt động gần nhất", "26/10/2026 · 08:15"]]}/></Card><Card className="p-6"><h2 className="font-bold">Bảo mật tài khoản</h2><p className="mt-5 text-[10px] text-[#829591]">ĐỔI MẬT KHẨU GẦN NHẤT</p><b className="text-xs">23/10/2026 · 08:32</b><p className="mt-5 text-[10px] text-[#829591]">2 phiên đang hoạt động</p><div className="mt-4"><ActionButton tone="plain">Thu hồi tất cả phiên</ActionButton></div></Card></div><div className="mt-4 rounded-md bg-[#e7f1fa] p-4 text-xs text-[#3778a9]">Mọi thao tác quản trị trên người dùng đều được ghi vào nhật ký hệ thống.</div></>
}
