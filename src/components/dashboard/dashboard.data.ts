import { Package, ShoppingCart, Store, UsersRound } from "lucide-react"
import type { Metric, Order, Product, SectionMeta } from "./dashboard.types"

export const orders: Order[] = [
  { id: "#OM-1048", customer: "Nguyễn Minh Anh", channel: "Website", total: "1.240.000đ", status: "Đã giao", date: "Hôm nay, 10:42" },
  { id: "#OM-1047", customer: "Trần Hoàng Nam", channel: "Shopee", total: "860.000đ", status: "Đang xử lý", date: "Hôm nay, 09:18" },
  { id: "#OM-1046", customer: "Lê Thu Hà", channel: "Tại cửa hàng", total: "2.450.000đ", status: "Chờ thanh toán", date: "Hôm qua, 17:36" },
  { id: "#OM-1045", customer: "Phạm Gia Huy", channel: "Facebook", total: "540.000đ", status: "Đã giao", date: "Hôm qua, 15:20" },
  { id: "#OM-1044", customer: "Đỗ Khánh Linh", channel: "Website", total: "3.120.000đ", status: "Đang xử lý", date: "24/10/2026, 11:05" }
]

export const products: Product[] = [
  { name: "Bình giữ nhiệt Terra 500ml", sku: "TER-500-GRN", category: "Đồ gia dụng", stock: 128, price: "420.000đ", state: "Đang bán" },
  { name: "Túi tote canvas Daily", sku: "TOT-DAILY-01", category: "Phụ kiện", stock: 42, price: "185.000đ", state: "Đang bán" },
  { name: "Cốc gốm thủ công Mộc", sku: "CER-MOC-08", category: "Đồ gia dụng", stock: 8, price: "260.000đ", state: "Sắp hết hàng" },
  { name: "Nến thơm Gỗ tuyết tùng", sku: "CAN-CEDAR-02", category: "Lifestyle", stock: 0, price: "320.000đ", state: "Hết hàng" }
]

export const chartValues = [42, 58, 49, 72, 63, 88, 78, 96, 84, 108, 92, 116]

export const sectionMeta: Record<import("./dashboard.types").DashboardSection, SectionMeta> = {
  overview: { eyebrow: "Workspace / Tổng quan", title: "Chào buổi sáng, An", description: "Đây là những gì đang diễn ra với hoạt động kinh doanh của bạn." },
  orders: { eyebrow: "Vận hành / Đơn hàng", title: "Đơn hàng", description: "Theo dõi và xử lý đơn hàng trên mọi kênh bán." },
  products: { eyebrow: "Danh mục / Sản phẩm", title: "Sản phẩm", description: "Quản lý danh mục và thông tin sản phẩm của bạn." },
  inventory: { eyebrow: "Vận hành / Tồn kho", title: "Tồn kho", description: "Nắm bắt lượng hàng sẵn có tại từng điểm bán." },
  customers: { eyebrow: "Quan hệ / Khách hàng", title: "Khách hàng", description: "Theo dõi khách hàng và lịch sử mua sắm." },
  reports: { eyebrow: "Phân tích / Báo cáo", title: "Báo cáo", description: "Đo lường hiệu quả kinh doanh theo thời gian." }
}

export const overviewMetrics: Metric[] = [
  { label: "Doanh thu tháng này", value: "248.600.000đ", change: "+12,8%", icon: ShoppingCart },
  { label: "Đơn hàng", value: "1.284", change: "+8,4%", icon: Package },
  { label: "Khách hàng mới", value: "486", change: "+18,2%", icon: UsersRound },
  { label: "Giá trị đơn trung bình", value: "1.936.000đ", change: "-2,1%", icon: Store, positive: false }
]
