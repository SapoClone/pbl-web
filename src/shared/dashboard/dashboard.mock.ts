import { BadgeDollarSign, Package, ShoppingCart, Store } from "lucide-react"
import type { Metric, Order, Product, SectionMeta } from "./dashboard.types"

export const orders: Order[] = [
  { id: "#OM-1048", customer: "Nguyễn Minh Anh", channel: "Website", total: "1.240.000đ", status: "Đã giao", date: "Hôm nay, 10:42" },
  { id: "#OM-1047", customer: "Trần Hoàng Nam", channel: "Shopee", total: "860.000đ", status: "Đang xử lý", date: "Hôm nay, 09:18" },
  { id: "#OM-1046", customer: "Lê Thu Hà", channel: "Tại cửa hàng", total: "2.450.000đ", status: "Chờ thanh toán", date: "Hôm qua, 17:36" },
  { id: "#OM-1045", customer: "Phạm Gia Huy", channel: "Facebook", total: "540.000đ", status: "Đã giao", date: "Hôm qua, 15:20" },
  { id: "#OM-1044", customer: "Đỗ Khánh Linh", channel: "Website", total: "3.120.000đ", status: "Đang xử lý", date: "24/10/2026, 11:05" }
]

export const products: Product[] = [
  { name: "Bình giữ nhiệt Terra 500ml", sku: "TER-500-GRN", barcode: "8938501234001", category: "Đồ gia dụng", brand: "Terra", unit: "Cái", costPrice: 280000, retailPrice: 420000, stock: 128, price: "420.000đ", state: "Đang bán" },
  { name: "Túi tote canvas Daily", sku: "TOT-DAILY-01", barcode: "8938501234002", category: "Phụ kiện", brand: "Daily", unit: "Cái", costPrice: 110000, retailPrice: 185000, stock: 42, price: "185.000đ", state: "Đang bán" },
  { name: "Cốc gốm thủ công Mộc", sku: "CER-MOC-08", barcode: "8938501234003", category: "Đồ gia dụng", brand: "Mộc", unit: "Cái", costPrice: 170000, retailPrice: 260000, stock: 8, price: "260.000đ", state: "Sắp hết hàng" },
  { name: "Nến thơm Gỗ tuyết tùng", sku: "CAN-CEDAR-02", barcode: "8938501234004", category: "Lifestyle", brand: "Mộc", unit: "Hộp", costPrice: 210000, retailPrice: 320000, stock: 0, price: "320.000đ", state: "Hết hàng" }
]

export const chartValues = [18, 30, 55, 48, 96, 76, 118, 94, 148, 122, 172, 136]

export const sectionMeta: Record<import("./dashboard.types").DashboardSection, SectionMeta> = {
  overview: { eyebrow: "Tổng quan", title: "Tổng quan kinh doanh", description: "Một góc nhìn rõ ràng cho ngày bán hàng của bạn." },
  orders: { eyebrow: "Vận hành / Đơn hàng", title: "Đơn hàng", description: "Theo dõi và xử lý đơn hàng trên mọi kênh bán." },
  products: { eyebrow: "Danh mục / Sản phẩm", title: "Sản phẩm", description: "Quản lý danh mục và thông tin sản phẩm của bạn." },
  inventory: { eyebrow: "Vận hành / Tồn kho", title: "Tồn kho", description: "Nắm bắt lượng hàng sẵn có tại từng điểm bán." },
  customers: { eyebrow: "Quan hệ / Khách hàng", title: "Khách hàng", description: "Theo dõi khách hàng và lịch sử mua sắm." },
  pos: { eyebrow: "Bán hàng / Tại quầy", title: "Bán tại quầy", description: "Quản lý đơn bán trực tiếp tại cửa hàng." },
  channels: { eyebrow: "Bán hàng / Kênh bán", title: "Kênh bán hàng", description: "Kết nối và theo dõi các kênh bán hàng." },
  suppliers: { eyebrow: "Vận hành / Nhập hàng", title: "Nhập hàng & nhà cung cấp", description: "Quản lý phiếu nhập và nhà cung cấp." },
  staff: { eyebrow: "Quản trị / Nhân sự", title: "Nhân viên & Quyền", description: "Quản lý nhân viên, vai trò và quyền truy cập." },
  reports: { eyebrow: "Phân tích / Báo cáo", title: "Báo cáo", description: "Đo lường hiệu quả kinh doanh theo thời gian." }
}

export const overviewMetrics: Metric[] = [
  { label: "Doanh thu bán hàng", value: "24.800.000 ₫", change: "12,4%", detail: "so với hôm qua", icon: BadgeDollarSign },
  { label: "Đơn hàng hoàn tất", value: "40", change: "5 đơn", detail: "so với hôm qua", icon: Package },
  { label: "Giá trị đơn trung bình", value: "620.000 ₫", change: "1,7%", detail: "so với hôm qua", icon: ShoppingCart },
  { label: "Lợi nhuận ước tính", value: "8.060.000 ₫", change: "32,5%", detail: "Theo giá vốn", icon: Store }
]
