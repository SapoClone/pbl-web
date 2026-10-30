export const ADMIN_SCREENS = [
  "dashboard", "businesses", "business-detail", "business-new", "business-edit", "business-lock",
  "users", "user-detail", "plans", "plan-config", "subscriptions", "subscription-detail",
  "change-plan", "limits", "monitoring", "integrations", "jobs", "job-detail", "audit",
  "notifications", "notification-new", "support", "settings"
] as const

export type AdminScreen = (typeof ADMIN_SCREENS)[number]

export type StatusTone = "green" | "amber" | "red" | "blue" | "gray"

export interface Business {
  name: string
  owner: string
  plan: string
  status: string
  subscriptionId: string
  users: number
}

export interface TableColumn<T> {
  key: keyof T | "actions"
  label: string
  render?: (row: T) => React.ReactNode
}
