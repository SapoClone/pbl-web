import { Plus } from "lucide-react"
import type { FormEvent } from "react"
import { ActionButton, Card, FormActions, FormField, PageHeader, StatusBadge } from "../../components/ui"
import { useAdminStore } from "../../store/useAdminStore"

const plans = [
  { name: "Free", price: "0 đ", limits: ["1 chi nhánh", "3 người dùng", "100 sản phẩm"] },
  { name: "Basic", price: "299.000 đ", limits: ["2 chi nhánh", "10 người dùng", "1.000 sản phẩm"] },
  { name: "Pro", price: "599.000 đ", limits: ["5 chi nhánh", "30 người dùng", "10.000 sản phẩm"] }
]

export function PlansPage() {
  return <><PageHeader title="Gói dịch vụ" description="Quản lý hạn mức, giá và quyền lợi của các gói dịch vụ." action={<ActionButton screen="plan-config"><Plus size={14}/> Tạo gói</ActionButton>}/><div className="rounded-md bg-[#e7f1fa] p-3 text-xs text-[#3778a9]">Giá là dữ liệu minh họa. Chính sách giá chính thức chưa được chốt.</div><div className="mt-5 grid gap-4 lg:grid-cols-3">{plans.map((plan, index) => <Card key={plan.name} className={`p-6 ${index === 2 ? "border-[#00876a]" : ""}`}><StatusBadge>{index === 2 ? "Phổ biến" : "Đang cung cấp"}</StatusBadge><h2 className="mt-5 text-xl font-bold">{plan.name}</h2><p className="mt-2 text-2xl font-bold text-[#00876a]">{plan.price} <span className="text-xs">/ tháng</span></p><ul className="my-6 space-y-3 text-xs">{plan.limits.map((limit) => <li key={limit}>✓ {limit}</li>)}</ul><ActionButton tone="plain" screen="plan-config">Chỉnh sửa gói</ActionButton></Card>)}</div></>
}

export function PlanConfigPage() {
  const showToast = useAdminStore((state) => state.showToast)
  const submit = (event: FormEvent) => { event.preventDefault(); showToast("Đã lưu cấu hình gói Pro") }
  return <><PageHeader title="Cấu hình gói Pro" description="Cập nhật giá, hạn mức và quyền lợi."/><form onSubmit={submit}><div className="grid gap-4 lg:grid-cols-2"><Card className="p-6"><h2 className="mb-5 font-bold">Thông tin gói</h2><div className="space-y-5"><FormField label="Tên gói" value="Pro" required/><FormField label="Mô tả" value="Dành cho doanh nghiệp tăng trưởng"/><FormField label="Trạng thái" value="Đang cung cấp"/></div></Card><Card className="p-6"><h2 className="mb-5 font-bold">Hạn mức sử dụng</h2><div className="grid gap-5 sm:grid-cols-2"><FormField label="Số chi nhánh tối đa" value="5"/><FormField label="Số người dùng tối đa" value="30"/><FormField label="Số sản phẩm tối đa" value="10000"/><FormField label="Dung lượng lưu trữ (GB)" value="50"/></div></Card></div><FormActions cancelScreen="plans" submitLabel="Lưu cấu hình"/></form></>
}
