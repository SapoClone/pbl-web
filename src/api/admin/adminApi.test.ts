import { adminApi } from "./adminApi"

const mockKeys = [
  "pbl-admin-mock:businesses",
  "pbl-admin-mock:plans",
  "pbl-admin-mock:subscriptions",
  "pbl-admin-mock:jobs",
  "pbl-admin-mock:notifications"
]

describe("adminApi mock provider", () => {
  beforeEach(() => {
    mockKeys.forEach((key) => localStorage.removeItem(key))
  })

  it("persists system settings through the admin API", async () => {
    const current = await adminApi.getSettings()
    await adminApi.updateSettings({ ...current, platformName: "Omniretail Test" })

    expect((await adminApi.getSettings()).platformName).toBe("Omniretail Test")
  })

  it("derives shared dashboard job metrics from the jobs API data", async () => {
    const jobs = await adminApi.getJobs()
    const dashboard = await adminApi.getDashboard()
    const pendingCount = jobs.filter((job) => job.status === "pending").length
    const jobMetric = dashboard.metrics.find((metric) => metric.label === "Job cần xử lý")

    expect(jobMetric?.value).toBe(String(pendingCount))
    expect(dashboard.services.find((service) => service.name === "Hàng đợi")?.detail)
      .toBe(`${pendingCount} job cần xử lý`)
  })

  it("persists a created business", async () => {
    await adminApi.createBusiness({
      name: "Test Store",
      accessCode: "test-store",
      ownerName: "Test Owner",
      ownerEmail: "owner@test.vn"
    })

    const businesses = await adminApi.getBusinesses()
    expect(businesses.at(-1)).toMatchObject({
      name: "Test Store",
      owner: "Test Owner",
      plan: "Free",
      status: "Đang thử",
      users: 1
    })
  })

  it("updates and locks an existing business", async () => {
    await adminApi.updateBusiness("TH0001", {
      name: "Updated Store",
      accessCode: "updated-store",
      ownerName: "Updated Owner",
      ownerEmail: "updated@test.vn"
    })
    await adminApi.lockBusiness("TH0001", {
      reason: "Test lock",
      preserveData: true
    })

    const businesses = await adminApi.getBusinesses()
    expect(businesses[0]).toMatchObject({
      name: "Updated Store",
      owner: "Updated Owner",
      status: "Đã khóa"
    })
  })

  it("persists plan, subscription, and job mutations", async () => {
    await adminApi.updatePlan("Pro", {
      name: "Pro",
      maxBranches: 8,
      maxUsers: 40,
      maxProducts: 20000,
      storageGb: 100
    })
    await adminApi.changeSubscriptionPlan("SUB-0001", {
      businessId: "TH0001",
      plan: "Basic",
      startsAt: "2026-11-01",
      endsAt: "2026-12-01"
    })
    await adminApi.retryJob({ jobId: "JOB-00984" })

    expect((await adminApi.getPlans()).at(-1)?.limits).toContain("40 người dùng")
    expect((await adminApi.getSubscriptions())[0].plan).toBe("Basic")
    expect((await adminApi.getJobs())[0].attempts).toBe("1 / 3")
  })

  it("persists a sent notification", async () => {
    await adminApi.createNotification({
      title: "Test notification",
      audience: "all",
      type: "Cập nhật",
      content: "Nội dung kiểm thử"
    })

    const notifications = await adminApi.getNotifications()
    expect(notifications.at(-1)).toMatchObject({
      title: "Test notification",
      audience: "all",
      type: "Cập nhật",
      status: "Đã gửi"
    })
  })

  it("returns business users through a paginated API boundary", async () => {
    const firstPage = await adminApi.getBusinessUsers("TH0001", { page: 1, pageSize: 7 })
    const secondPage = await adminApi.getBusinessUsers("TH0001", { page: 2, pageSize: 7 })

    expect(firstPage).toMatchObject({ page: 1, pageSize: 7, total: 24 })
    expect(firstPage.items).toHaveLength(7)
    expect(secondPage.items).toHaveLength(7)
    expect(firstPage.items[0].name).not.toBe(secondPage.items[0].name)
  })

  it("applies business user search and filters before pagination", async () => {
    const result = await adminApi.getBusinessUsers("TH0001", {
      search: "nhân viên 0",
      role: "Nhân viên",
      status: "Hoạt động",
      pageSize: 20
    })

    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((user) => user.role === "Nhân viên" && user.status === "Hoạt động")).toBe(true)
  })

  it("returns paginated users and usable detail activity data", async () => {
    const result = await adminApi.getUsers({ role: "Nhân viên", page: 1, pageSize: 5 })
    const detail = await adminApi.getUserDetail("TH0001")

    expect(result.items).toHaveLength(5)
    expect(result.total).toBeGreaterThan(5)
    expect(detail.user.name).toBe("Minh Anh")
    expect(detail.sessions.length).toBeGreaterThan(0)
    expect(detail.activities.length).toBeGreaterThan(0)
  })

  it("returns subscription and job details from the mock API", async () => {
    const subscription = await adminApi.getSubscriptionDetail("SUB-0001")
    const job = await adminApi.getJobDetail("JOB-00984")

    expect(subscription.business).toBe("Mộc Store")
    expect(subscription.history.length).toBeGreaterThan(0)
    expect(job.errorCode).toBe("E_RATE_LIMIT")
    expect(job.attemptsHistory).toHaveLength(3)
  })

  it("returns filtered and paginated subscriptions through the API boundary", async () => {
    const result = await adminApi.getSubscriptionsPage({
      plan: "Pro",
      status: "Hoạt động",
      page: 1,
      pageSize: 1
    })

    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(1)
    expect(result.total).toBeGreaterThan(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].plan).toBe("Pro")
    expect(result.items[0].status).toBe("Hoạt động")
  })

  it("returns filtered and paginated limits through the API boundary", async () => {
    const result = await adminApi.getLimitsPage({ plan: "Pro", page: 1, pageSize: 1 })

    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(1)
    expect(result.total).toBeGreaterThan(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].plan).toBe("Pro")
  })

  it("returns filtered integrations and their detail history", async () => {
    const page = await adminApi.getIntegrationsPage({ channel: "Shopee", page: 1, pageSize: 1 })
    expect(page.items).toHaveLength(1)
    expect(page.items[0].channel).toBe("Shopee")

    const detail = await adminApi.getIntegrationDetail(page.items[0].id)
    expect(detail.syncLogs.length).toBeGreaterThan(0)
    expect(detail.webhooks.length).toBeGreaterThan(0)
  })

  it("returns jobs filtered by status and paginated", async () => {
    const result = await adminApi.getJobsPage({ status: "pending", page: 1, pageSize: 1 })

    expect(result.total).toBeGreaterThan(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].status).toBe("pending")
  })

  it("returns filtered and paginated audit logs", async () => {
    const result = await adminApi.getAuditLogsPage({ result: "Thất bại", page: 1, pageSize: 1 })

    expect(result.total).toBe(2)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].result).toBe("Thất bại")
  })

  it("filters notifications by type, time, and status before pagination", async () => {
    const result = await adminApi.getNotificationsPage({
      type: "Bảo trì",
      time: "30d",
      status: "Đã gửi",
      page: 1,
      pageSize: 1
    })

    expect(result.total).toBeGreaterThan(0)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].type).toBe("Bảo trì")
    expect(result.items[0].status).toBe("Đã gửi")
  })
})
