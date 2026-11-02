export type AdminBusiness = {
  name: string
  owner: string
  plan: string
  status: string
  subscriptionId: string
  users: number
}

export type AdminBusinessDetail = {
  id: string
  name: string
  ownerName: string
  ownerEmail: string
  taxCode: string
  createdAt: string
  plan: string
  billingCycle: string
  price: string
  subscriptionStatus: string
  subscriptionNotice: string
}

export type AdminBusinessQuery = {
  search?: string
  status?: string
  plan?: string
  page?: number
  pageSize?: number
}

export type AdminUser = {
  businessId?: string
  name: string
  organization: string
  role: string
  status: string
  lastLogin: string
}

export type AdminUserQuery = {
  search?: string
  role?: string
  status?: string
  page?: number
  pageSize?: number
}

export type AdminUserSession = {
  device: string
  location: string
  lastActive: string
  status: string
}

export type AdminUserActivity = {
  action: string
  time: string
  source: string
}

export type AdminUserDetail = {
  user: AdminUser
  email: string
  phone: string
  sessions: AdminUserSession[]
  activities: AdminUserActivity[]
}

export type AdminBusinessUsersQuery = {
  search?: string
  role?: string
  status?: string
  page?: number
  pageSize?: number
}

export type AdminPaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type AdminPlan = {
  name: string
  price: string
  limits: string[]
}

export type AdminSubscription = {
  id: string
  business: string
  plan: string
  cycle: string
  status: string
}

export type AdminSubscriptionQuery = {
  search?: string
  plan?: string
  status?: string
  cycle?: string
  page?: number
  pageSize?: number
}

export type AdminSubscriptionHistory = {
  time: string
  event: string
  plan: string
  effectiveAt: string
  actor: string
}

export type AdminSubscriptionDetail = AdminSubscription & {
  businessId: string
  price: string
  startsAt: string
  endsAt: string
  nextPayment: string
  history: AdminSubscriptionHistory[]
}

export type AdminJob = {
  id: string
  business: string
  errorCode: string
  attempts: string
  createdAt: string
  status: "pending" | "retrying" | "resolved"
}

export type AdminJobQuery = {
  search?: string
  status?: "pending" | "retrying" | "resolved"
  page?: number
  pageSize?: number
}

export type AdminJobAttempt = {
  attempt: string
  time: string
  result: string
  duration: string
}

export type AdminJobDetail = AdminJob & {
  businessId: string
  platform: string
  task: string
  reference: string
  errorMessage: string
  attemptsHistory: AdminJobAttempt[]
}

export type AdminLimit = {
  business: string
  plan: string
  branches: string
  users: string
  products: string
  storage: string
  alert: string
  detail: readonly { resource: string; percent: number; value: string }[]
}

export type AdminLimitQuery = {
  search?: string
  plan?: string
  alert?: string
  page?: number
  pageSize?: number
}

export type AdminService = {
  name: string
  status: string
  load: string
  updatedAt: string
}

export type AdminIntegration = {
  id: string
  business: string
  channel: string
  environment: string
  status: string
  lastSync: string
}

export type AdminIntegrationQuery = {
  search?: string
  channel?: string
  status?: string
  page?: number
  pageSize?: number
}

export type AdminIntegrationDetail = AdminIntegration & {
  endpoint: string
  shopName: string
  shopId: string
  internalBranch: string
  tokenStatus: string
  tokenExpiresAt: string
  scopes: readonly string[]
  inventorySync: string
  priceSync: string
  orderPolling: string
  connectedAt: string
  syncLogs: readonly {
    id: string
    type: string
    result: string
    errorMessage?: string
    createdAt: string
  }[]
  webhooks: readonly {
    id: string
    event: string
    status: string
    receivedAt: string
  }[]
}

export type AdminNotification = {
  title: string
  audience: string
  type: string
  status: string
  sentAt: string
}

export type AdminDashboard = {
  metrics: readonly { label: string; value: string; change: string }[]
  transactionBars: readonly number[]
  services: readonly { name: string; detail: string }[]
  attention: readonly {
    subject: string
    description: string
    status: string
    target: "jobs" | "business-detail"
  }[]
}

export type CreateBusinessInput = {
  name: string
  accessCode: string
  taxCode?: string
  phone?: string
  address?: string
  ownerName: string
  ownerEmail: string
  ownerPhone?: string
}

export type UpdateBusinessInput = CreateBusinessInput

export type LockBusinessInput = {
  reason: string
  preserveData: boolean
}

export type UpdatePlanInput = {
  name: string
  description?: string
  status?: string
  maxBranches?: number
  maxUsers?: number
  maxProducts?: number
  storageGb?: number
}

export type CreatePlanInput = UpdatePlanInput

export type ChangeSubscriptionPlanInput = {
  businessId: string
  plan: string
  startsAt: string
  endsAt: string
  note?: string
}

export type CreateNotificationInput = {
  title: string
  audience: string
  type: string
  content: string
}

export type RetryJobInput = {
  jobId: string
}
