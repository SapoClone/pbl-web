import { RefreshCw } from "lucide-react"
import { AdminLink } from "../../components/AdminLink"
import { ActionButton, Card, DataTable, FilterBar, InfoGrid, PageHeader, StatusBadge } from "../../components/ui"
import { jobs } from "../../data/mockData"
import { useAdminStore } from "../../store/useAdminStore"
import type { TableColumn } from "../../types"

type JobRow = (typeof jobs)[number]
const columns: TableColumn<JobRow>[] = [{ key: "id", label: "Job / Thời gian", render: (row) => <div><b>{row.id}</b><p className="text-[10px] text-[#829591]">{row.time}</p></div> }, { key: "business", label: "Doanh nghiệp" }, { key: "error", label: "Mã lỗi", render: (row) => <b className="text-[#c65248]">{row.error}</b> }, { key: "attempts", label: "Số lần thử" }, { key: "actions", label: "", render: () => <AdminLink screen="job-detail" className="text-[#00876a]">Xem chi tiết</AdminLink> }]

export function JobsPage() {
  return <><PageHeader title="Job lỗi" description="Theo dõi và xử lý các tác vụ đồng bộ không thành công."/><div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs"><b className="border-b-2 border-[#00876a] px-2 pb-3 text-[#00876a]">Cần xử lý (8)</b><span>Đang thử lại (3)</span><span>Đã xử lý (24)</span></div><Card><FilterBar/><DataTable columns={columns} rows={jobs}/></Card></>
}

export function JobDetailPage() {
  const showToast = useAdminStore((state) => state.showToast)
  return <><PageHeader title="Job JOB-00984" description="Job lỗi / Đồng bộ tồn kho" action={<ActionButton onClick={() => showToast("Đã đưa JOB-00984 vào hàng đợi thử lại")}><RefreshCw size={13}/> Thử lại job</ActionButton>}/><div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]"><Card className="p-6"><h2 className="font-bold">Thông tin tác vụ</h2><InfoGrid items={[["Doanh nghiệp", "Mộc Store · TH0001"], ["Nền tảng / tác vụ", "Shopee · Đồng bộ tồn kho"], ["Mã tham chiếu", "STK-0984-TH0001-221026"], ["Ngày tạo", "26/10/2026 · 22:01"], ["Số lần thử", "3 / 3"]]}/></Card><Card className="p-6"><h2 className="font-bold">Chi tiết lỗi</h2><b className="mt-5 block text-sm text-[#c65248]">E_RATE_LIMIT</b><p className="mt-3 text-xs leading-5 text-[#829591]">Nền tảng đối tác từ chối yêu cầu do vượt giới hạn gọi API.</p></Card></div><Card className="mt-4 p-5"><h2 className="font-bold">Lịch sử thực thi</h2>{[1, 2, 3].map((attempt) => <div key={attempt} className="mt-4 grid grid-cols-4 border-t border-[#edf1f0] pt-4 text-xs"><span>Lần {attempt}</span><span>22:0{attempt * 2}:02</span><StatusBadge tone="red">E_RATE_LIMIT</StatusBadge><span>4{attempt}0 ms</span></div>)}</Card></>
}
