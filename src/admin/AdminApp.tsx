import { AdminShell } from "./components/AdminShell"
import { DashboardPage } from "./pages/dashboard/DashboardPage"
import { BusinessesPage, BusinessCreatePage, BusinessDetailPage, BusinessEditPage, BusinessLockPage } from "./pages/businesses/BusinessPages"
import { UserDetailPage, UsersPage } from "./pages/users/UserPages"
import { PlanConfigPage, PlansPage } from "./pages/plans/PlanPages"
import { ChangePlanPage, SubscriptionDetailPage, SubscriptionsPage } from "./pages/subscriptions/SubscriptionPages"
import { LimitsPage } from "./pages/limits/LimitsPage"
import { MonitoringPage } from "./pages/operations/MonitoringPage"
import { IntegrationPage } from "./pages/operations/IntegrationPage"
import { JobDetailPage, JobsPage } from "./pages/operations/JobPages"
import { AuditPage } from "./pages/operations/AuditPage"
import { NotificationCreatePage, NotificationsPage } from "./pages/communications/NotificationPages"
import { SupportPage } from "./pages/support/SupportPage"
import { SettingsPage } from "./pages/settings/SettingsPage"
import type { AdminScreen } from "./types"

const pages: Record<AdminScreen, React.ComponentType> = {
  dashboard: DashboardPage,
  businesses: BusinessesPage,
  "business-detail": BusinessDetailPage,
  "business-new": BusinessCreatePage,
  "business-edit": BusinessEditPage,
  "business-lock": BusinessLockPage,
  users: UsersPage,
  "user-detail": UserDetailPage,
  plans: PlansPage,
  "plan-config": PlanConfigPage,
  subscriptions: SubscriptionsPage,
  "subscription-detail": SubscriptionDetailPage,
  "change-plan": ChangePlanPage,
  limits: LimitsPage,
  monitoring: MonitoringPage,
  integrations: IntegrationPage,
  jobs: JobsPage,
  "job-detail": JobDetailPage,
  audit: AuditPage,
  notifications: NotificationsPage,
  "notification-new": NotificationCreatePage,
  support: SupportPage,
  settings: SettingsPage
}

export function AdminApp({ screen }: { screen: AdminScreen }) {
  const Page = pages[screen]
  return <AdminShell screen={screen}><Page/></AdminShell>
}
