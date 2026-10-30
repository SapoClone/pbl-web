import {
  AlertTriangle, Bell, Boxes, Building2, ClipboardList, Database, FileClock,
  Gauge, Headphones, LayoutDashboard, PackageCheck, Settings, Users,
  type LucideIcon
} from "lucide-react"
import type { AdminScreen } from "./types"

export interface AdminNavigationItem {
  screen: AdminScreen
  label: string
  icon: LucideIcon
  badge?: string
}

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  { screen: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { screen: "businesses", label: "Doanh nghiệp", icon: Building2 },
  { screen: "users", label: "Người dùng", icon: Users },
  { screen: "plans", label: "Gói dịch vụ", icon: Boxes },
  { screen: "subscriptions", label: "Thuê bao", icon: ClipboardList },
  { screen: "limits", label: "Hạn mức sử dụng", icon: Database },
  { screen: "monitoring", label: "Giám sát hệ thống", icon: Gauge },
  { screen: "integrations", label: "Tích hợp", icon: PackageCheck },
  { screen: "jobs", label: "Job lỗi", icon: AlertTriangle, badge: "8" },
  { screen: "audit", label: "Nhật ký hoạt động", icon: FileClock },
  { screen: "notifications", label: "Thông báo", icon: Bell },
  { screen: "support", label: "Hỗ trợ kỹ thuật", icon: Headphones },
  { screen: "settings", label: "Cấu hình hệ thống", icon: Settings }
]

export const SCREEN_TITLES: Record<AdminScreen, string> = {
  dashboard: "Tổng quan", businesses: "Doanh nghiệp", "business-detail": "Mộc Store",
  "business-new": "Tạo doanh nghiệp", "business-edit": "Chỉnh sửa doanh nghiệp",
  "business-lock": "Khóa doanh nghiệp", users: "Người dùng", "user-detail": "Minh Anh",
  plans: "Gói dịch vụ", "plan-config": "Cấu hình gói Pro", subscriptions: "Thuê bao",
  "subscription-detail": "Thuê bao SUB-0001", "change-plan": "Gán / Đổi gói dịch vụ",
  limits: "Hạn mức sử dụng", monitoring: "Giám sát hệ thống", integrations: "Theo dõi tích hợp",
  jobs: "Job lỗi", "job-detail": "Job JOB-00984", audit: "Nhật ký hoạt động",
  notifications: "Thông báo hệ thống", "notification-new": "Soạn thông báo",
  support: "Hỗ trợ kỹ thuật", settings: "Cấu hình hệ thống"
}

export const getNavigationRoot = (screen: AdminScreen): AdminScreen => {
  if (screen.startsWith("business")) return "businesses"
  if (screen.startsWith("user")) return "users"
  if (screen === "plan-config") return "plans"
  if (screen.startsWith("subscription") || screen === "change-plan") return "subscriptions"
  if (screen.startsWith("job")) return "jobs"
  if (screen.startsWith("notification")) return "notifications"
  return screen
}
