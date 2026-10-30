import type { Business } from "../types"

export const businesses: Business[] = [
  { name: "Mộc Store", owner: "Minh Anh", plan: "Pro", status: "Hoạt động", subscriptionId: "TH0001", users: 24 },
  { name: "Nhà Gốm An Nhiên", owner: "Ngọc Hà", plan: "Basic", status: "Hoạt động", subscriptionId: "TH0002", users: 12 },
  { name: "Lá Xanh Market", owner: "Hoàng Nam", plan: "Pro", status: "Hoạt động", subscriptionId: "TH0003", users: 18 },
  { name: "Mây Boutique", owner: "Thu Trang", plan: "Free", status: "Đang thử", subscriptionId: "TH0004", users: 6 },
  { name: "Bếp Mộc", owner: "Quỳnh Chi", plan: "Basic", status: "Đã khóa", subscriptionId: "TH0005", users: 9 },
  { name: "Nắng Studio", owner: "Đức Long", plan: "Basic", status: "Hoạt động", subscriptionId: "TH0006", users: 15 }
]

export const users = [
  { name: "Lan Anh", business: "Nền tảng", role: "Quản trị viên", status: "Hoạt động", lastLogin: "26/10/2026 · 09:42" },
  { name: "Minh Anh", business: "Mộc Store", role: "Chủ cửa hàng", status: "Hoạt động", lastLogin: "26/10/2026 · 08:15" },
  { name: "Trần Bảo Long", business: "Bếp Mộc", role: "Quản lý chi nhánh", status: "Hoạt động", lastLogin: "25/10/2026 · 22:08" },
  { name: "Ngọc Hà", business: "Nhà Gốm An Nhiên", role: "Chủ cửa hàng", status: "Chưa xác thực", lastLogin: "—" }
]

export const subscriptions = [
  { id: "SUB-0001", business: "Mộc Store", plan: "Pro", cycle: "01/10 – 01/11/2026", status: "Hoạt động" },
  { id: "SUB-0002", business: "Nhà Gốm An Nhiên", plan: "Basic", cycle: "12/10 – 12/11/2026", status: "Đang hoạt động" },
  { id: "SUB-0003", business: "Lá Xanh Market", plan: "Pro", cycle: "25/09 – 25/10/2026", status: "Sắp hết hạn" },
  { id: "SUB-0004", business: "Bếp Mộc", plan: "Basic", cycle: "01/09 – 01/10/2026", status: "Đã hết hạn" }
]

export const jobs = [
  { id: "JOB-00984", business: "Mộc Store", error: "E_RATE_LIMIT", attempts: "3 / 3", time: "26/10 · 22:01" },
  { id: "JOB-00981", business: "Lá Xanh Market", error: "E_TIMEOUT", attempts: "2 / 3", time: "26/10 · 21:58" },
  { id: "JOB-00978", business: "Nhà Gốm An Nhiên", error: "E_TOKEN_EXPIRED", attempts: "1 / 3", time: "26/10 · 21:42" }
]
