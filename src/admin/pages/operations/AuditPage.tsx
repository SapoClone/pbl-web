import { Card, DataTable, FilterBar, PageHeader, StatusBadge } from "../../components/ui"
import type { TableColumn } from "../../types"

interface AuditRow { time: string; actor: string; scope: string; action: string; target: string; result: string }
const rows: AuditRow[] = [{ time: "26/10 · 22:05", actor: "Lan Anh", scope: "Nền tảng", action: "Thử lại job", target: "JOB-00984", result: "Thành công" }, { time: "26/10 · 21:43", actor: "Lan Anh", scope: "Mộc Store", action: "Sửa cấu hình gói", target: "SUB-0001", result: "Thành công" }, { time: "26/10 · 20:18", actor: "Hệ thống", scope: "Nhà Gốm An Nhiên", action: "Gửi cảnh báo", target: "TH0002", result: "Thành công" }]
const columns: TableColumn<AuditRow>[] = [{ key: "time", label: "Thời gian" }, { key: "actor", label: "Người thực hiện", render: (row) => <b>{row.actor}</b> }, { key: "scope", label: "Phạm vi" }, { key: "action", label: "Hành động" }, { key: "target", label: "Đối tượng" }, { key: "result", label: "Kết quả", render: (row) => <StatusBadge>{row.result}</StatusBadge> }]

export function AuditPage() {
  return <><PageHeader title="Nhật ký hoạt động" description="Tra cứu thao tác quản trị. Nhật ký chỉ đọc và không thể chỉnh sửa."/><Card><FilterBar placeholder="Tìm theo người thực hiện, đối tượng..."/><DataTable columns={columns} rows={rows}/></Card><div className="mt-4 rounded-md bg-[#e7f1fa] p-3 text-xs text-[#3778a9]">Nhật ký được lưu tối thiểu 12 tháng và không thể sửa hoặc xóa.</div></>
}
