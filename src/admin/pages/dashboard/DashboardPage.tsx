import { Card, PageHeader, StatusBadge } from "../../components/ui"
import { AdminLink } from "../../components/AdminLink"

const summaryCards = [
  { label: "Doanh nghiệp hoạt động", value: "86 / 100", note: "+8 doanh nghiệp trong tháng", tone: "text-[#00876a]" },
  { label: "Thuê bao sắp hết hạn", value: "12", note: "Trong 7 ngày tới", tone: "text-[#a97724]" },
  { label: "Giao dịch hôm nay", value: "12.840", note: "+14,2% so với hôm qua", tone: "text-[#00876a]" },
  { label: "Job cần xử lý", value: "8", note: "3 job đã vượt số lần thử", tone: "text-[#c65248]" }
]

const serviceHealth = [
  ["API Gateway", "142 ms · p95"], ["Cơ sở dữ liệu", "42 kết nối đang sử dụng"],
  ["Hàng đợi", "28 job đang chờ"], ["Webhook", "98,7% thành công"]
]

export function DashboardPage() {
  const bars = [44, 62, 50, 76, 88, 70, 100]
  return <><PageHeader title="Tổng quan nền tảng" description="Theo dõi doanh nghiệp, thuê bao và sức khỏe dịch vụ." action={<select className="input w-52"><option>01/10 – 30/10/2026</option></select>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map((card) => <Card key={card.label} className="p-5"><p className="text-xs text-[#829591]">{card.label}</p><strong className="mt-2 block text-3xl">{card.value}</strong><p className={`mt-2 text-[10px] ${card.tone}`}>{card.note}</p></Card>)}</div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]"><Card className="p-5"><div className="flex justify-between"><div><h2 className="font-bold">Giao dịch toàn nền tảng</h2><p className="text-[11px] text-[#829591]">Tổng số giao dịch mỗi ngày · 7 ngày gần nhất</p></div><StatusBadge>7 ngày</StatusBadge></div><div className="mt-7 flex h-48 items-end justify-around border-b border-[#dfe7e5] px-3">{bars.map((height, index) => <div key={index} className="flex h-full flex-col items-center justify-end gap-2"><div style={{ height: `${height}%` }} className={`w-9 rounded-t ${index === bars.length - 1 ? "bg-[#00876a]" : "bg-[#b9ddd1]"}`}/><span className="text-[10px] text-[#829591]">{24 + index}/10</span></div>)}</div></Card>
      <Card className="p-5"><h2 className="font-bold">Tình trạng dịch vụ</h2>{serviceHealth.map(([name, detail]) => <div className="mt-5 flex items-start gap-3" key={name}><span className="mt-1.5 h-2 w-2 rounded-full bg-[#00876a]"/><div><b className="text-xs">{name}</b><p className="text-[10px] text-[#829591]">{detail}</p></div><span className="ml-auto text-[10px] text-[#00876a]">Ổn định</span></div>)}</Card></div>
    <Card className="mt-4 p-5"><h2 className="font-bold">Cần theo dõi</h2><p className="text-[11px] text-[#829591]">Các doanh nghiệp và sự kiện cần quản trị viên xử lý</p>{[["Mộc Store", "Gói Pro sắp hết hạn", "business-detail"], ["Nhà Gốm An Nhiên", "Sử dụng 98% dung lượng", "business-detail"], ["Shopee · Đồng bộ tồn kho", "3 job lỗi E_RATE_LIMIT", "jobs"]].map(([name, detail, screen]) => <div key={name} className="grid gap-2 border-t border-[#edf1f0] py-4 text-xs first:border-0 md:grid-cols-[1fr_2fr_auto]"><b>{name}</b><span className="text-[#829591]">{detail}</span><AdminLink screen={screen as "jobs" | "business-detail"} className="text-[#00876a]">Xem →</AdminLink></div>)}</Card>
  </>
}
