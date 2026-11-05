import { axiosClient } from "@/api/axios"
import {
  businesses,
  businessDetails,
  dashboard,
  jobs,
  integrations,
  settings,
  auditLogs,
  limits,
  plans,
  services,
  subscriptions,
  userRows
} from "@/admin/admin-mock-data"
import type {
  AdminBusiness,
  AdminAuditLog,
  AdminAuditQuery,
  AdminBusinessDetail,
  AdminBusinessQuery,
  AdminBusinessUsersQuery,
  AdminDashboard,
  ChangeSubscriptionPlanInput,
  CreateBusinessInput,
  CreateNotificationInput,
  CreatePlanInput,
  LockBusinessInput,
  RetryJobInput,
  UpdateBusinessInput,
  UpdatePlanInput,
  AdminJob,
  AdminJobQuery,
  AdminIntegration,
  AdminIntegrationDetail,
  AdminIntegrationQuery,
  AdminLimit,
  AdminLimitQuery,
  AdminNotification,
  AdminNotificationQuery,
  UpdateNotificationInput,
  AdminPaginatedResponse,
  AdminPlan,
  AdminService,
  AdminSettings,
  AdminSubscription,
  AdminSubscriptionQuery,
  AdminSubscriptionDetail,
  AdminJobDetail,
  AdminUser,
  AdminUserActivity,
  AdminUserDetail,
  AdminUserQuery,
  AdminUserSession
} from "./types"
import { USE_MOCK_ADMIN } from "@/config/env-config"

const MOCK_DATA_PREFIX = "pbl-admin-mock:"

function readMockData<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(`${MOCK_DATA_PREFIX}${key}`)
  if (!stored) return fallback

  try {
    return JSON.parse(stored) as T
  } catch {
    localStorage.removeItem(`${MOCK_DATA_PREFIX}${key}`)
    return fallback
  }
}

function writeMockData<T>(key: string, value: T) {
  localStorage.setItem(`${MOCK_DATA_PREFIX}${key}`, JSON.stringify(value))
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
}

const getMockBusinesses = (): AdminBusiness[] =>
  readMockData(
    "businesses",
    businesses.map(([name, owner, plan, status, subscriptionId, users]) => ({
      name,
      owner,
      plan,
      status,
      subscriptionId,
      users: Number(users)
    }))
  )

const getMockUsers = (): AdminUser[] => {
  const users: AdminUser[] = userRows.map(
    ([name, organization, role, status, lastLogin]) => ({
      businessId: businesses.find(
        (business) => business[0] === organization
      )?.[4],
      name,
      organization,
      role,
      status,
      lastLogin
    })
  )

  for (const [businessName, , , , , userCount] of businesses) {
    const currentCount = users.filter(
      (user) => user.organization === businessName
    ).length
    for (let index = currentCount; index < Number(userCount); index += 1) {
      users.push({
        businessId: businesses.find(
          (business) => business[0] === businessName
        )?.[4],
        name: `${businessName} · Nhân viên ${String(index).padStart(2, "0")}`,
        organization: businessName,
        role: "Nhân viên",
        status: "Hoạt động",
        lastLogin: "—"
      })
    }
  }

  return users
}

const getMockPlans = (): AdminPlan[] =>
  readMockData(
    "plans",
    plans.map(([name, price, ...limits]) => ({ name, price, limits }))
  )

const getMockSubscriptions = (): AdminSubscription[] =>
  readMockData(
    "subscriptions",
    subscriptions.map(([id, business, plan, cycle, status]) => ({
      id,
      business,
      plan,
      cycle,
      status
    }))
  )

const getMockJobs = (): AdminJob[] => {
  const defaults = jobs.map(
    ([id, business, errorCode, attempts, createdAt, status]) => ({
      id,
      business,
      errorCode,
      attempts,
      createdAt,
      status
    })
  )
  const stored = readMockData("jobs", defaults)
  const storedById = new Map(stored.map((job) => [job.id, job]))
  return defaults
    .map((job) => ({
      ...job,
      ...storedById.get(job.id),
      status: storedById.get(job.id)?.status ?? job.status
    }))
    .map((job) => ({
      ...job,
      status:
        job.status ??
        (Number(job.attempts.split(" / ")[0] ?? 0) >= 3
          ? "pending"
          : "retrying")
    }))
}

const getMockDashboard = (): AdminDashboard => {
    const businesses = getMockBusinesses()
    const subscriptions = getMockSubscriptions()
    const jobs = getMockJobs()
    const activeBusinesses = businesses.filter((business) => business.status === "Hoạt động").length
    const expiringSubscriptions = subscriptions.filter((subscription) => subscription.status === "Sắp hết hạn").length
    const pendingJobs = jobs.filter((job) => job.status === "pending")
    const exhaustedJobs = pendingJobs.filter((job) => job.attempts.startsWith("3 /")).length

    return {
      ...dashboard,
      metrics: dashboard.metrics.map((metric) => {
        if (metric.label === "Doanh nghiệp hoạt động") {
          return { ...metric, value: `${activeBusinesses} / ${businesses.length}` }
        }
        if (metric.label === "Thuê bao sắp hết hạn") {
          return { ...metric, value: String(expiringSubscriptions) }
        }
        if (metric.label === "Job cần xử lý") {
          return { ...metric, value: String(pendingJobs.length), change: `${exhaustedJobs} job đã vượt số lần thử` }
        }
        return metric
      }),
      services: dashboard.services.map((service) =>
        service.name === "Hàng đợi"
          ? { ...service, detail: `${pendingJobs.length} job cần xử lý` }
          : service
      )
    }
}

const getMockLimits = (): AdminLimit[] => limits.map((item) => ({ ...item }))

const getMockServices = (): AdminService[] =>
  services.map(([name, status, load, updatedAt]) => ({
    name,
    status,
    load,
    updatedAt
  }))

const getMockAuditLogs = (): AdminAuditLog[] =>
  auditLogs.map(([id, time, actor, scope, action, target, result]) => ({
    id,
    time,
    actor,
    scope,
    action,
    target,
    result
  }))

const getMockIntegrations = (): AdminIntegration[] =>
  integrations.map(
    ([business, channel, environment, status, lastSync], index) => ({
      id: `INT-${String(index + 1).padStart(4, "0")}`,
      business,
      channel,
      environment,
      status,
      lastSync
    })
  )

const getMockNotifications = (): AdminNotification[] =>
  readMockData("notifications", [
    {
      id: "NTF-0001",
      title: "Bảo trì hệ thống định kỳ",
      audience: "Toàn bộ doanh nghiệp",
      type: "Bảo trì",
      status: "Đã gửi",
      sentAt: "25/10 · 09:00",
      content: "Hệ thống sẽ bảo trì từ 00:00 đến 02:00 ngày 29/10/2026."
    },
    {
      title: "Cập nhật tính năng kiểm kho",
      audience: "Doanh nghiệp gói Pro",
      type: "Cập nhật",
      status: "Đã gửi",
      sentAt: "23/10 · 15:30",
      id: "NTF-0002",
      content: "Tính năng kiểm kho đã được cập nhật."
    },
    {
      title: "Hướng dẫn kết nối Shopee",
      audience: "Nhóm Mộc Store",
      type: "Hướng dẫn",
      status: "Bản nháp",
      sentAt: "—",
      id: "NTF-0003",
      content: "Hướng dẫn kết nối Shopee."
    }
  ]).map((notification, index) => ({
    ...notification,
    id: notification.id ?? `NTF-${String(index + 1).padStart(4, "0")}`,
    content: notification.content ?? "Nội dung thông báo đang được cập nhật."
  }))

export const adminApi = {
  async getDashboard(): Promise<AdminDashboard> {
    if (USE_MOCK_ADMIN) return getMockDashboard()
    const { data } = await axiosClient.get<AdminDashboard>("/admin/dashboard")
    return data
  },

  async getBusinesses(
    params: AdminBusinessQuery = {}
  ): Promise<AdminBusiness[]> {
    if (USE_MOCK_ADMIN) {
      const search = normalizeSearchValue(params.search ?? "")
      return getMockBusinesses().filter((business) => {
        const matchesSearch =
          !search ||
          [business.name, business.owner, business.subscriptionId].some(
            (value) => normalizeSearchValue(value).includes(search)
          )
        return (
          matchesSearch &&
          (!params.status || business.status === params.status) &&
          (!params.plan || business.plan === params.plan)
        )
      })
    }
    const { data } = await axiosClient.get<AdminBusiness[]>(
      "/admin/businesses",
      { params }
    )
    return data
  },

  async getBusinessDetail(businessId: string): Promise<AdminBusinessDetail> {
    if (USE_MOCK_ADMIN) {
      const detail = businessDetails[businessId as keyof typeof businessDetails]
      if (detail) return detail
      const business = getMockBusinesses().find(
        (item) => item.subscriptionId === businessId
      )
      if (!business) throw new Error(`Business ${businessId} was not found`)
      return {
        id: business.subscriptionId,
        name: business.name,
        ownerName: business.owner,
        ownerEmail: `${normalizeSearchValue(business.owner).replaceAll(
          " ",
          "."
        )}@omniretail.vn`,
        taxCode: "Đang cập nhật",
        createdAt: "Đang cập nhật",
        plan: business.plan,
        billingCycle: "Chu kỳ tháng",
        price: "Theo gói hiện tại",
        subscriptionStatus: business.status,
        subscriptionNotice: `${business.name} · ${business.subscriptionId}`
      }
    }
    const { data } = await axiosClient.get<AdminBusinessDetail>(
      `/admin/businesses/${businessId}`
    )
    return data
  },

  async getUsers(
    params: AdminUserQuery = {}
  ): Promise<AdminPaginatedResponse<AdminUser>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 7)
    if (USE_MOCK_ADMIN) {
      const search = normalizeSearchValue(params.search ?? "")
      const items = getMockUsers().filter(
        (user) =>
          (!search ||
            normalizeSearchValue(
              `${user.name} ${user.organization} ${user.role} ${user.status}`
            ).includes(search)) &&
          (!params.role || user.role === params.role) &&
          (!params.status || user.status === params.status)
      )
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize
      }
    }
    const { data } = await axiosClient.get<AdminPaginatedResponse<AdminUser>>(
      "/admin/users",
      { params: { ...params, page, pageSize } }
    )
    return data
  },

  async getUserDetail(businessId: string): Promise<AdminUserDetail> {
    if (USE_MOCK_ADMIN) {
      const business = getMockBusinesses().find(
        (item) => item.subscriptionId === businessId
      )
      const user = business
        ? getMockUsers().find(
            (item) =>
              item.organization === business.name &&
              item.role === "Chủ cửa hàng"
          ) ?? {
            name: business.owner,
            organization: business.name,
            role: "Chủ cửa hàng",
            status: business.status,
            lastLogin: "—"
          }
        : getMockUsers().find((item) => item.organization === "Nền tảng")
      if (!user) throw new Error(`User ${businessId} was not found`)
      const sessions: AdminUserSession[] = [
        {
          device: "Chrome trên Windows",
          location: "Việt Nam",
          lastActive: user.lastLogin,
          status: "Đang hoạt động"
        },
        {
          device: "Safari trên iPhone",
          location: "Việt Nam",
          lastActive: "25/10/2026 · 20:10",
          status: "Đã đăng xuất"
        }
      ]
      const activities: AdminUserActivity[] = [
        {
          action: "Đăng nhập hệ thống",
          time: user.lastLogin,
          source: "Web Admin"
        },
        {
          action: "Cập nhật thông tin tài khoản",
          time: "23/10/2026 · 08:32",
          source: "Web Admin"
        },
        {
          action: "Đổi mật khẩu",
          time: "20/10/2026 · 14:05",
          source: "Web Admin"
        }
      ]
      return {
        user,
        email: `${normalizeSearchValue(user.name).replaceAll(
          " ",
          "."
        )}@omniretail.vn`,
        phone: "Đang cập nhật",
        sessions,
        activities
      }
    }
    const { data } = await axiosClient.get<AdminUserDetail>(
      `/admin/users/${businessId}`
    )
    return data
  },

  async getBusinessUsers(
    businessId: string,
    params: AdminBusinessUsersQuery = {}
  ): Promise<AdminPaginatedResponse<AdminUser>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 7)
    if (USE_MOCK_ADMIN) {
      const business = getMockBusinesses().find(
        (item) => item.subscriptionId === businessId
      )
      if (!business) throw new Error(`Business ${businessId} was not found`)
      const search = normalizeSearchValue(params.search ?? "")
      const items = getMockUsers()
        .filter((user) => user.organization === business.name)
        .filter(
          (user) =>
            (!search ||
              normalizeSearchValue(
                `${user.name} ${user.role} ${user.status}`
              ).includes(search)) &&
            (!params.role || user.role === params.role) &&
            (!params.status || user.status === params.status)
        )
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize
      }
    }
    const { data } = await axiosClient.get<AdminPaginatedResponse<AdminUser>>(
      `/admin/businesses/${businessId}/users`,
      {
        params: {
          search: params.search,
          role: params.role,
          status: params.status,
          page,
          pageSize
        }
      }
    )
    return data
  },

  async getPlans(): Promise<AdminPlan[]> {
    if (USE_MOCK_ADMIN) return getMockPlans()
    const { data } = await axiosClient.get<AdminPlan[]>("/admin/plans")
    return data
  },

  async getSubscriptions(): Promise<AdminSubscription[]> {
    if (USE_MOCK_ADMIN) return getMockSubscriptions()
    const { data } = await axiosClient.get<AdminSubscription[]>(
      "/admin/subscriptions"
    )
    return data
  },

  async getSubscriptionsPage(
    params: AdminSubscriptionQuery = {}
  ): Promise<AdminPaginatedResponse<AdminSubscription>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 7)
    if (USE_MOCK_ADMIN) {
      const search = normalizeSearchValue(params.search ?? "")
      const items = getMockSubscriptions().filter(
        (subscription) =>
          (!search ||
            normalizeSearchValue(
              `${subscription.id} ${subscription.business} ${subscription.plan}`
            ).includes(search)) &&
          (!params.plan || subscription.plan === params.plan) &&
          (!params.status || subscription.status === params.status) &&
          (!params.cycle ||
            subscription.cycle
              .toLocaleLowerCase("vi-VN")
              .includes(params.cycle.toLocaleLowerCase("vi-VN")))
      )
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize
      }
    }
    const { data } = await axiosClient.get<
      AdminPaginatedResponse<AdminSubscription>
    >("/admin/subscriptions", { params: { ...params, page, pageSize } })
    return data
  },

  async getSubscriptionDetail(
    subscriptionId: string
  ): Promise<AdminSubscriptionDetail> {
    if (USE_MOCK_ADMIN) {
      const subscription = getMockSubscriptions().find(
        (item) => item.id === subscriptionId
      )
      if (!subscription)
        throw new Error(`Subscription ${subscriptionId} was not found`)
      const business = getMockBusinesses().find(
        (item) => item.name === subscription.business
      )
      const price =
        subscription.plan === "Pro"
          ? "599.000đ / tháng"
          : subscription.plan === "Basic"
            ? "299.000đ / tháng"
            : "0đ / tháng"
      return {
        ...subscription,
        businessId: business?.subscriptionId ?? "",
        price,
        startsAt: subscription.cycle.split(" – ")[0] ?? "Đang cập nhật",
        endsAt: subscription.cycle.split(" – ")[1] ?? "Đang cập nhật",
        nextPayment: subscription.cycle.split(" – ")[1] ?? "Đang cập nhật",
        history: [
          {
            time: "23/09/2026 · 09:12",
            event: "Gia hạn thuê bao",
            plan: subscription.plan,
            effectiveAt: subscription.cycle.split(" – ")[0] ?? "Đang cập nhật",
            actor: business?.owner ?? "Hệ thống"
          },
          {
            time: "01/08/2026 · 14:33",
            event: "Cập nhật gói dịch vụ",
            plan: subscription.plan,
            effectiveAt: subscription.cycle.split(" – ")[0] ?? "Đang cập nhật",
            actor: "Quản trị viên"
          }
        ]
      }
    }
    const { data } = await axiosClient.get<AdminSubscriptionDetail>(
      `/admin/subscriptions/${subscriptionId}`
    )
    return data
  },

  async getJobs(): Promise<AdminJob[]> {
    if (USE_MOCK_ADMIN) return getMockJobs()
    const { data } = await axiosClient.get<AdminJob[]>("/admin/jobs")
    return data
  },

  async getJobsPage(
    params: AdminJobQuery = {}
  ): Promise<AdminPaginatedResponse<AdminJob>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 7)
    if (USE_MOCK_ADMIN) {
      const search = normalizeSearchValue(params.search ?? "")
      const items = getMockJobs().filter((job) => {
        return (
          (!search ||
            normalizeSearchValue(
              `${job.id} ${job.business} ${job.errorCode}`
            ).includes(search)) &&
          (!params.status || job.status === params.status)
        )
      })
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize
      }
    }
    const { data } = await axiosClient.get<AdminPaginatedResponse<AdminJob>>(
      "/admin/jobs",
      { params: { ...params, page, pageSize } }
    )
    return data
  },

  async getJobDetail(jobId: string): Promise<AdminJobDetail> {
    if (USE_MOCK_ADMIN) {
      const job = getMockJobs().find((item) => item.id === jobId)
      if (!job) throw new Error(`Job ${jobId} was not found`)
      const business = getMockBusinesses().find(
        (item) => item.name === job.business
      )
      return {
        ...job,
        businessId: business?.subscriptionId ?? "",
        platform: "Shopee",
        task: "Đồng bộ tồn kho",
        reference: `STK-${job.id.replace("JOB-", "")}-${
          business?.subscriptionId ?? "UNKNOWN"
        }`,
        errorMessage:
          "Nền tảng đối tác từ chối yêu cầu do vượt giới hạn gọi API. Hãy thử lại sau thời gian chờ.",
        attemptsHistory: [
          {
            attempt: "Lần 1",
            time: "22:01:02",
            result: job.errorCode,
            duration: "420 ms"
          },
          {
            attempt: "Lần 2",
            time: "22:03:02",
            result: job.errorCode,
            duration: "438 ms"
          },
          {
            attempt: "Lần 3",
            time: "22:07:02",
            result: job.errorCode,
            duration: "404 ms"
          }
        ]
      }
    }
    const { data } = await axiosClient.get<AdminJobDetail>(
      `/admin/jobs/${jobId}`
    )
    return data
  },

  async getLimits(): Promise<AdminLimit[]> {
    if (USE_MOCK_ADMIN) return getMockLimits()
    const { data } = await axiosClient.get<AdminLimit[]>("/admin/limits")
    return data
  },

  async getLimitsPage(
    params: AdminLimitQuery = {}
  ): Promise<AdminPaginatedResponse<AdminLimit>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 7)
    if (USE_MOCK_ADMIN) {
      const base = getMockLimits()
      const items = getMockBusinesses()
        .map(
          (business, index) =>
            base[index % base.length] && {
              ...base[index % base.length],
              business: business.name,
              plan: business.plan
            }
        )
        .filter((item): item is AdminLimit => Boolean(item))
        .filter(
          (item) =>
            (!params.search ||
              normalizeSearchValue(`${item.business} ${item.plan}`).includes(
                normalizeSearchValue(params.search)
              )) &&
            (!params.plan || item.plan === params.plan) &&
            (!params.alert || item.alert === params.alert)
        )
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize
      }
    }
    const { data } = await axiosClient.get<AdminPaginatedResponse<AdminLimit>>(
      "/admin/limits",
      { params: { ...params, page, pageSize } }
    )
    return data
  },

  async getServices(): Promise<AdminService[]> {
    if (USE_MOCK_ADMIN) return getMockServices()
    const { data } = await axiosClient.get<AdminService[]>("/admin/monitoring")
    return data
  },

  async getIntegrations(): Promise<AdminIntegration[]> {
    if (USE_MOCK_ADMIN) return getMockIntegrations()
    const { data } = await axiosClient.get<AdminIntegration[]>(
      "/admin/integrations"
    )
    return data
  },

  async getAuditLogsPage(params: AdminAuditQuery = {}): Promise<AdminPaginatedResponse<AdminAuditLog>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 7)
    if (USE_MOCK_ADMIN) {
      const search = normalizeSearchValue(params.search ?? "")
      const items = getMockAuditLogs().filter((log) =>
        (!search || normalizeSearchValue(`${log.actor} ${log.scope} ${log.action} ${log.target}`).includes(search)) &&
        (!params.scope || log.scope === params.scope) &&
        (!params.result || log.result === params.result)
      )
      return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }
    }
    const { data } = await axiosClient.get<AdminPaginatedResponse<AdminAuditLog>>(
      "/admin/audit-logs",
      { params: { ...params, page, pageSize } }
    )
    return data
  },

  async getIntegrationsPage(
    params: AdminIntegrationQuery = {}
  ): Promise<AdminPaginatedResponse<AdminIntegration>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 4)
    if (USE_MOCK_ADMIN) {
      const search = normalizeSearchValue(params.search ?? "")
      const items = getMockIntegrations().filter(
        (item) =>
          (!search ||
            normalizeSearchValue(
              `${item.business} ${item.channel} ${item.environment} ${item.status}`
            ).includes(search)) &&
          (!params.channel || item.channel === params.channel) &&
          (!params.status || item.status === params.status)
      )
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        total: items.length,
        page,
        pageSize
      }
    }
    const { data } = await axiosClient.get<
      AdminPaginatedResponse<AdminIntegration>
    >("/admin/integrations", { params: { ...params, page, pageSize } })
    return data
  },

  async getIntegrationDetail(
    integrationId: string
  ): Promise<AdminIntegrationDetail> {
    if (USE_MOCK_ADMIN) {
      const integration = getMockIntegrations().find(
        (item) => item.id === integrationId
      )
      if (!integration)
        throw new Error(`Integration ${integrationId} was not found`)
      return {
        ...integration,
        endpoint: `https://api.omniretail.vn/webhooks/${integration.id.toLowerCase()}`,
        shopName:
          integration.business === "Mộc Store"
            ? "Mộc Store Official"
            : `${integration.business} Official`,
        shopId: `SHOP-${String(integration.id).replace("INT-", "")}`,
        internalBranch:
          integration.business === "Mộc Store"
            ? "Chi nhánh 1 - Quận 1"
            : "Chi nhánh chính",
        tokenStatus:
          integration.status === "Xác thực lại" ? "Đã hết hạn" : "Còn hạn",
        tokenExpiresAt:
          integration.status === "Xác thực lại"
            ? "Hết hạn vào 15:30 - 28/10/2026"
            : "Hết hạn vào 15:30 - 28/11/2026",
        scopes: [
          "orders.read",
          "orders.write",
          "inventory.update",
          "products.read"
        ],
        inventorySync: "Một chiều: Kho nội bộ → Sàn",
        priceSync: "Tự động cập nhật giá lên sàn",
        orderPolling:
          integration.status === "Chưa đồng bộ"
            ? "Polling mỗi 5 phút"
            : "Webhook tự động",
        connectedAt: "26/10/2026 · 09:30",
        syncLogs: [
          {
            id: `${integration.id}-SYNC-01`,
            type: "Đồng bộ đơn hàng",
            result: "Thành công (200)",
            createdAt: "02/11/2026 · 09:45"
          },
          {
            id: `${integration.id}-SYNC-02`,
            type: "Cập nhật tồn kho SKU-102",
            result:
              integration.status === "Xác thực lại"
                ? "Thất bại (401)"
                : "Thành công (200)",
            errorMessage:
              integration.status === "Xác thực lại"
                ? "Shopee API Error: Access token expired"
                : undefined,
            createdAt: "01/11/2026 · 18:20"
          },
          {
            id: `${integration.id}-SYNC-03`,
            type: "Kéo danh mục sản phẩm",
            result: "Thành công (200)",
            createdAt: "01/11/2026 · 12:05"
          },
          {
            id: `${integration.id}-SYNC-04`,
            type: "Đồng bộ đơn hàng",
            result: "Thành công (200)",
            createdAt: "31/10/2026 · 16:40"
          },
          {
            id: `${integration.id}-SYNC-05`,
            type: "Cập nhật tồn kho SKU-087",
            result: "Thất bại (500)",
            errorMessage: "Sàn phản hồi lỗi tạm thời, hệ thống sẽ thử lại.",
            createdAt: "30/10/2026 · 10:12"
          }
        ],
        webhooks: [
          {
            id: `${integration.id}-WH-01`,
            event: "order.created",
            status: "Đã nhận",
            receivedAt: "02/11/2026 · 09:42"
          },
          {
            id: `${integration.id}-WH-02`,
            event: "product.updated",
            status: "Đã xử lý",
            receivedAt: "02/11/2026 · 09:38"
          }
        ]
      }
    }
    const { data } = await axiosClient.get<AdminIntegrationDetail>(
      `/admin/integrations/${integrationId}`
    )
    return data
  },

  async getNotifications(): Promise<AdminNotification[]> {
    if (USE_MOCK_ADMIN) return getMockNotifications()
    const { data } = await axiosClient.get<AdminNotification[]>(
      "/admin/notifications"
    )
    return data
  },

  async getSettings(): Promise<AdminSettings> {
    if (USE_MOCK_ADMIN) return readMockData("settings", { ...settings })
    const { data } = await axiosClient.get<AdminSettings>("/admin/settings")
    return data
  },

  async updateSettings(input: AdminSettings): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData("settings", input)
      return
    }
    await axiosClient.patch("/admin/settings", input)
  },

  async getNotificationsPage(params: AdminNotificationQuery = {}): Promise<AdminPaginatedResponse<AdminNotification>> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.max(1, params.pageSize ?? 6)
    if (USE_MOCK_ADMIN) {
      const search = normalizeSearchValue(params.search ?? "")
      const now = new Date("2026-11-05T23:59:59")
      const items = getMockNotifications().filter((notification) =>
        (!search || normalizeSearchValue(`${notification.title} ${notification.audience} ${notification.type}`).includes(search)) &&
        (!params.type || notification.type === params.type) &&
        (!params.time || params.time === "all" || (() => {
          const match = notification.sentAt.match(/^(\d{2})\/(\d{2})/)
          if (!match) return false
          const date = new Date(now.getFullYear(), Number(match[2]) - 1, Number(match[1]))
          const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
          return params.time === "today" ? days === 0 : params.time === "7d" ? days < 7 : days < 30
        })()) &&
        (!params.status || notification.status === params.status)
      )
      return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }
    }
    const { data } = await axiosClient.get<AdminPaginatedResponse<AdminNotification>>(
      "/admin/notifications",
      { params: { ...params, page, pageSize } }
    )
    return data
  },

  async getNotificationDetail(notificationId: string): Promise<AdminNotification> {
    if (USE_MOCK_ADMIN) {
      const notification = getMockNotifications().find((item) => item.id === notificationId)
      if (!notification) throw new Error(`Notification ${notificationId} was not found`)
      return notification
    }
    const { data } = await axiosClient.get<AdminNotification>(`/admin/notifications/${notificationId}`)
    return data
  },

  async updateNotification(notificationId: string, input: UpdateNotificationInput): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData("notifications", getMockNotifications().map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              title: input.title,
              audience: input.plan ? `${input.audience} · ${input.plan}` : input.audience,
              type: input.type,
              content: input.content,
              status: input.scheduledAt ? "Đã lên lịch" : "Đã gửi",
              sentAt: input.scheduledAt ?? "Vừa gửi"
            }
          : notification
      ))
      return
    }
    await axiosClient.patch(`/admin/notifications/${notificationId}`, input)
  },

  async createBusiness(input: CreateBusinessInput): Promise<void> {
    if (USE_MOCK_ADMIN) {
      const current = getMockBusinesses()
      writeMockData("businesses", [
        ...current,
        {
          name: input.name,
          owner: input.ownerName,
          plan: "Free",
          status: "Đang thử",
          subscriptionId: `TH${Date.now()}`,
          users: 1
        }
      ])
      return
    }
    await axiosClient.post("/admin/businesses", input)
  },

  async updateBusiness(
    businessId: string,
    input: UpdateBusinessInput
  ): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData(
        "businesses",
        getMockBusinesses().map((business) =>
          business.subscriptionId === businessId
            ? {
                ...business,
                name: input.name,
                owner: input.ownerName
              }
            : business
        )
      )
      return
    }
    await axiosClient.patch(`/admin/businesses/${businessId}`, input)
  },

  async lockBusiness(
    businessId: string,
    input: LockBusinessInput
  ): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData(
        "businesses",
        getMockBusinesses().map((business) =>
          business.subscriptionId === businessId
            ? { ...business, status: "Đã khóa" }
            : business
        )
      )
      return
    }
    await axiosClient.post(`/admin/businesses/${businessId}/lock`, input)
  },

  async updatePlan(planId: string, input: UpdatePlanInput): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData(
        "plans",
        getMockPlans().map((plan) =>
          plan.name === planId
            ? {
                ...plan,
                name: input.name,
                limits: [
                  `${input.maxBranches ?? 0} chi nhánh`,
                  `${input.maxUsers ?? 0} người dùng`,
                  `${input.maxProducts ?? 0} sản phẩm`,
                  `${input.storageGb ?? 0} GB lưu trữ`
                ]
              }
            : plan
        )
      )
      return
    }
    await axiosClient.patch(`/admin/plans/${planId}`, input)
  },

  async createPlan(input: CreatePlanInput): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData("plans", [
        ...getMockPlans(),
        {
          name: input.name,
          price: "Theo cấu hình",
          limits: [
            `${input.maxBranches ?? 0} chi nhánh`,
            `${input.maxUsers ?? 0} người dùng`,
            `${input.maxProducts ?? 0} sản phẩm`,
            `${input.storageGb ?? 0} GB lưu trữ`
          ]
        }
      ])
      return
    }
    await axiosClient.post("/admin/plans", input)
  },

  async changeSubscriptionPlan(
    subscriptionId: string,
    input: ChangeSubscriptionPlanInput
  ): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData(
        "subscriptions",
        getMockSubscriptions().map((subscription) =>
          subscription.id === subscriptionId
            ? { ...subscription, plan: input.plan }
            : subscription
        )
      )
      return
    }
    await axiosClient.post(
      `/admin/subscriptions/${subscriptionId}/change-plan`,
      input
    )
  },

  async createNotification(input: CreateNotificationInput): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData("notifications", [
        ...getMockNotifications(),
        {
          id: `NTF-${Date.now()}`,
          title: input.title,
          audience: input.plan ? `${input.audience} · ${input.plan}` : input.audience,
          type: input.type,
          status: input.scheduledAt ? "Đã lên lịch" : "Đã gửi",
          sentAt: input.scheduledAt ?? "Vừa gửi",
          content: input.content
        }
      ])
      return
    }
    await axiosClient.post("/admin/notifications", input)
  },

  async retryJob(input: RetryJobInput): Promise<void> {
    if (USE_MOCK_ADMIN) {
      writeMockData(
        "jobs",
        getMockJobs().map((job) =>
          job.id === input.jobId
            ? {
                ...job,
                attempts: "1 / 3",
                createdAt: "Vừa thử lại",
                status: "retrying"
              }
            : job
        )
      )
      return
    }
    await axiosClient.post(`/admin/jobs/${input.jobId}/retry`)
  }
}
