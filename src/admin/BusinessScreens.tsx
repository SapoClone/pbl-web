/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  CheckCircle2,
  Loader2,
  Lock,
  Plus,
  Search,
  Users,
  X
} from "lucide-react"
import {
  adminMutationKeys,
  adminMutationOptions,
  adminQueryOptions,
  useAdminMutation
} from "@/api/admin"
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  Heading,
  InfoGrid
} from "./AdminUi"

const href = (screen: string) =>
  screen === "dashboard" ? "/" : `/admin/${screen}`

export function Businesses() {
  const params = new URLSearchParams(window.location.search)
  const initialSearch = params.get("search") ?? ""
  const initialStatus = params.get("status") ?? ""
  const initialPlan = params.get("plan") ?? ""
  const initialPage = Math.max(1, Number(params.get("page") ?? "1") || 1)
  const [inputValue, setInputValue] = useState(initialSearch)
  const [debouncedValue, setDebouncedValue] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [plan, setPlan] = useState(initialPlan)
  const [page, setPage] = useState(initialPage)
  const pageSize = 7

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(inputValue.trim())
      setPage(1)
      const next = new URLSearchParams(window.location.search)
      if (inputValue.trim()) next.set("search", inputValue.trim())
      else next.delete("search")
      next.delete("page")
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${next.toString() ? `?${next}` : ""}`
      )
    }, 350)
    return () => window.clearTimeout(timer)
  }, [inputValue])

  const businessesQuery = useQuery(
    adminQueryOptions.businesses({
      search: debouncedValue,
      status,
      plan,
      page,
      pageSize
    })
  )

  if (businessesQuery.isError) {
    return (
      <>
        <Heading
          title="Doanh nghiệp"
          description="Quản lý toàn bộ doanh nghiệp đang sử dụng nền tảng."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu doanh nghiệp.
        </Card>
      </>
    )
  }

  const rows = businessesQuery.data ?? []
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const updateStatus = (value: string) => {
    setStatus(value)
    setPage(1)
    const next = new URLSearchParams(window.location.search)
    if (value) next.set("status", value)
    else next.delete("status")
    next.delete("page")
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next.toString() ? `?${next}` : ""}`
    )
  }
  const updatePlan = (value: string) => {
    setPlan(value)
    setPage(1)
    const next = new URLSearchParams(window.location.search)
    if (value) next.set("plan", value)
    else next.delete("plan")
    next.delete("page")
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next.toString() ? `?${next}` : ""}`
    )
  }
  const updatePage = (nextPage: number) => {
    setPage(nextPage)
    const params = new URLSearchParams(window.location.search)
    if (nextPage > 1) params.set("page", String(nextPage))
    else params.delete("page")
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.toString() ? `?${params}` : ""}`
    )
  }

  return (
    <>
      <Heading
        title="Doanh nghiệp"
        description="Quản lý toàn bộ doanh nghiệp đang sử dụng nền tảng."
        action={
          <Button href={href("business-new")}>
            <Plus size={14} /> Tạo doanh nghiệp
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4">
          <label className="relative min-w-[250px] flex-1">
            <Search
              className="absolute left-3 top-2.5 text-[#829591]"
              size={14}
            />
            <input
              className="input pl-9 pr-16"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Tìm theo tên, mã, email..."
            />
            {businessesQuery.isFetching && (
              <Loader2
                className="absolute right-9 top-2.5 animate-spin text-[#00876a]"
                size={14}
              />
            )}
            {inputValue && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                className="absolute right-3 top-2 text-[#829591] hover:text-[#284341]"
                onClick={() => setInputValue("")}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <select
            className="input w-40"
            value={status}
            onChange={(event) => updateStatus(event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Hoạt động">Hoạt động</option>
            <option value="Đang thử">Đang thử</option>
            <option value="Đã khóa">Đã khóa</option>
          </select>
          <select
            className="input w-40"
            value={plan}
            onChange={(event) => updatePlan(event.target.value)}
          >
            <option value="">Tất cả gói</option>
            <option value="Pro">Pro</option>
            <option value="Basic">Basic</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
        {businessesQuery.isError ? (
          <div className="p-8 text-center text-xs text-[#c65248]">
            Không thể tải dữ liệu doanh nghiệp.
          </div>
        ) : businessesQuery.isLoading ? (
          <div className="p-8 text-center text-xs text-[#829591]">
            Đang tải dữ liệu doanh nghiệp...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#829591]">
            Không tìm thấy doanh nghiệp phù hợp với từ khóa &apos;
            <b>{debouncedValue}</b>&apos;. Vui lòng kiểm tra lại chính tả hoặc
            thử bộ lọc khác.
          </div>
        ) : (
          <>
            <DataTable
              headers={[
                "Doanh nghiệp",
                "Chủ tài khoản",
                "Gói",
                "Trạng thái",
                "Mã thuê bao",
                "Người dùng",
                ""
              ]}
              rows={visibleRows.map((x) => [
                <b>{x.name}</b>,
                x.owner,
                x.plan,
                <Badge
                  tone={
                    x.status === "Đã khóa"
                      ? "red"
                      : x.status === "Đang thử"
                        ? "amber"
                        : "green"
                  }
                >
                  {x.status}
                </Badge>,
                x.subscriptionId,
                x.users,
                <Link
                  className="text-[#00876a]"
                  to={`${href(
                    "business-detail"
                  )}?businessId=${encodeURIComponent(x.subscriptionId)}`}
                >
                  Xem chi tiết
                </Link>
              ])}
            />
            <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
              <span>
                {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, rows.length)} trong số {rows.length}
              </span>
              <button
                type="button"
                disabled={page === 1}
                className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40"
                onClick={() => updatePage(Math.max(1, page - 1))}
              >
                ‹
              </button>
              <span>
                Trang {page}/{pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount}
                className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40"
                onClick={() => updatePage(Math.min(pageCount, page + 1))}
              >
                ›
              </button>
            </div>
          </>
        )}
      </Card>
    </>
  )
}

export function BusinessDetail() {
  const businessId =
    new URLSearchParams(window.location.search).get("businessId") ?? "TH0001"
  const query = useQuery(adminQueryOptions.businessDetail(businessId))
  const subscriptionsQuery = useQuery(adminQueryOptions.subscriptions())
  const plansQuery = useQuery(adminQueryOptions.plans())
  const businessSubscriptions = (subscriptionsQuery.data ?? []).filter(
    (item) => item.business === query.data?.name
  )
  const changePlanMutation = useAdminMutation(
    adminMutationOptions.changeSubscriptionPlan(
      businessSubscriptions[0]?.id ?? "SUB-0001"
    ),
    [adminMutationKeys.subscriptions, adminMutationKeys.businesses]
  )
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "subscriptions" | "activity"
  >("overview")
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState("")
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("")
  const [userRole, setUserRole] = useState("")
  const [userStatus, setUserStatus] = useState("")
  const userPageSize = 7
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedUserSearch(userSearch.trim())
      setUserPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [userSearch])
  const usersQuery = useQuery(
    adminQueryOptions.businessUsers(businessId, {
      search: debouncedUserSearch,
      role: userRole,
      status: userStatus,
      page: userPage,
      pageSize: userPageSize
    })
  )
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Doanh nghiệp"
          description="Đang tải thông tin doanh nghiệp..."
        />
        <Card className="p-6 text-xs text-[#829591]">Đang tải dữ liệu...</Card>
      </>
    )
  if (query.isError || !query.data)
    return (
      <>
        <Heading title="Doanh nghiệp" description="Thông tin doanh nghiệp" />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải thông tin doanh nghiệp.
        </Card>
      </>
    )
  const business = query.data
  const savePlan = async (plan: string) => {
    try {
      await changePlanMutation.mutateAsync({
        businessId: business.id,
        plan,
        startsAt: new Date().toISOString().slice(0, 10),
        endsAt: "",
        note: "Thay đổi từ chi tiết doanh nghiệp"
      })
      setPlanModalOpen(false)
    } catch {
      setPlanModalOpen(false)
    }
  }
  const businessUsers = usersQuery.data?.items ?? []
  const userTotal = usersQuery.data?.total ?? 0
  const userPageCount = Math.max(1, Math.ceil(userTotal / userPageSize))
  const tabs = [
    { key: "overview" as const, label: "Tổng quan" },
    { key: "users" as const, label: "Người dùng & nhân viên" },
    { key: "subscriptions" as const, label: "Danh sách thuê bao" },
    { key: "activity" as const, label: "Hoạt động" }
  ]
  return (
    <>
      <Heading
        title={business.name}
        description={`Mã DN: ${business.id} · Khởi tạo ngày ${business.createdAt}`}
        action={
          <div className="flex gap-2">
            <Button
              tone="plain"
              href={`${href("business-edit")}?businessId=${encodeURIComponent(
                business.id
              )}`}
            >
              Chỉnh sửa
            </Button>
            <Button
              tone="danger"
              href={`${href("business-lock")}?businessId=${encodeURIComponent(
                business.id
              )}`}
            >
              <Lock size={13} /> Khóa doanh nghiệp
            </Button>
          </div>
        }
      />
      <div className="mb-5 flex flex-wrap gap-6 border-b border-[#dfe7e5] text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 pb-3 ${
              activeTab === tab.key
                ? "border-b-2 border-[#00876a] font-bold text-[#00876a]"
                : "text-[#284341] hover:text-[#00876a]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
          <Card className="p-5">
            <h2 className="font-bold">Thông tin doanh nghiệp</h2>
            <InfoGrid
              items={[
                ["Mã doanh nghiệp", business.id],
                ["Tên doanh nghiệp", business.name],
                ["Mã số thuế", business.taxCode],
                ["Email liên hệ", business.ownerEmail],
                ["Ngày khởi tạo", business.createdAt]
              ]}
            />
          </Card>
          <Card className="flex h-full flex-col items-start justify-between gap-3 p-5">
            <div>
            <h2 className="font-bold">Chủ cửa hàng</h2>
            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f3ed] font-bold text-[#00876a]">
                {business.ownerName.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <b className="text-sm">{business.ownerName}</b>
                <p className="text-[11px] text-[#829591]">
                  {business.ownerEmail}
                </p>
              </div>
            </div>{" "}
            </div>
            <Button
              tone="plain"
              href={`${href("user-detail")}?business=${encodeURIComponent(
                business.id
              )}`}
            >
              <Users size={13} /> Xem thông tin chủ cửa hàng
            </Button>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Thuê bao hiện tại</h2>
            <p className="mt-4 text-sm font-bold">
              {business.plan} · {business.billingCycle}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#00876a]">
              {business.price}
            </p>
            <Badge tone="amber" className="mt-3">
              {business.subscriptionStatus}
            </Badge>
            <div className="mt-4">
              <Button tone="plain" onClick={() => setPlanModalOpen(true)}>
                Đổi gói dịch vụ
              </Button>
            </div>
          </Card>
          <Card className="flex h-full flex-col items-start justify-between gap-3 p-5">
            <div>
              <h2 className="font-bold">Hỗ trợ kỹ thuật</h2>
              <p className="mt-4 text-xs text-[#829591]">
              Truy cập không gian doanh nghiệp với quyền chỉ đọc. Mọi phiên đều
              được ghi nhật ký.
            </p>
            </div>
            
            <div className="mt-5">
              <Button tone="plain" href={href("support")}>
                Bắt đầu phiên hỗ trợ
              </Button>
            </div>
          </Card>
        </div>
      )}
      {activeTab === "users" && (
        <Card>
          {" "}
          <div className="border-b border-[#e8eeec] p-4">
            <h2 className="font-bold">Danh sách người dùng & nhân viên</h2>
            <p className="mt-1 text-xs text-[#829591]">
              Nhân viên và chủ doanh nghiệp thuộc {business.name}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="relative min-w-[220px] flex-1">
                <Search
                  className="absolute left-3 top-2.5 text-[#829591]"
                  size={14}
                />
                <input
                  className="input pl-9 pr-16"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Tìm theo tên, vai trò..."
                />
                {usersQuery.isFetching && (
                  <Loader2
                    className="absolute right-9 top-2.5 animate-spin text-[#00876a]"
                    size={14}
                  />
                )}{" "}
                {userSearch && (
                  <button
                    type="button"
                    aria-label="Xóa tìm kiếm người dùng"
                    className="absolute right-3 top-2 text-[#829591]"
                    onClick={() => setUserSearch("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <select
                className="input w-40"
                value={userRole}
                onChange={(event) => {
                  setUserRole(event.target.value)
                  setUserPage(1)
                }}
              >
                <option value="">Tất cả vai trò</option>
                <option value="Chủ cửa hàng">Chủ cửa hàng</option>
                <option value="Nhân viên">Nhân viên</option>
              </select>
              <select
                className="input w-40"
                value={userStatus}
                onChange={(event) => {
                  setUserStatus(event.target.value)
                  setUserPage(1)
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Hoạt động">Hoạt động</option>
                <option value="Chưa xác thực">Chưa xác thực</option>
                <option value="Đã khóa">Đã khóa</option>
              </select>
            </div>{" "}
          </div>
          {usersQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-[#829591]">
              Đang tải danh sách người dùng...
            </div>
          ) : usersQuery.isError ? (
            <div className="p-8 text-center text-xs text-[#c65248]">
              Không thể tải danh sách người dùng.
            </div>
          ) : (
            <>
              <DataTable
                headers={[
                  "Họ tên",
                  "Vai trò",
                  "Trạng thái",
                  "Đăng nhập gần nhất",
                  ""
                ]}
                rows={businessUsers.map((item) => [
                  <b>{item.name}</b>,
                  item.role,
                  <Badge tone={item.status === "Hoạt động" ? "green" : "amber"}>
                    {item.status}
                  </Badge>,
                  item.lastLogin,
                  <Link
                    className="text-[#00876a]"
                    to={`${href("user-detail")}?business=${business.id}`}
                  >
                    Xem chi tiết tài khoản
                  </Link>
                ])}
              />
              <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
                <span>
                  {userTotal === 0 ? 0 : (userPage - 1) * userPageSize + 1}-
                  {Math.min(userPage * userPageSize, userTotal)} trong số{" "}
                  {userTotal}
                </span>
                <button
                  type="button"
                  disabled={userPage === 1}
                  className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40"
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                >
                  ‹
                </button>{" "}
                <span>
                  Trang {userPage}/{userPageCount}
                </span>
                <button
                  type="button"
                  disabled={userPage >= userPageCount}
                  className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40"
                  onClick={() =>
                    setUserPage(Math.min(userPageCount, userPage + 1))
                  }
                >
                  ›
                </button>
              </div>
            </>
          )}
        </Card>
      )}
      {activeTab === "subscriptions" && (
        <Card>
          <div className="p-5">
            <h2 className="font-bold">Danh sách thuê bao của doanh nghiệp</h2>
            <p className="mt-1 text-xs text-[#829591]">
              Lịch sử và trạng thái các thuê bao của {business.name}.
            </p>
          </div>
          <DataTable
            headers={["Mã thuê bao", "Gói", "Chu kỳ", "Trạng thái", ""]}
            rows={businessSubscriptions.map((item) => [
              <b>{item.id}</b>,
              item.plan,
              item.cycle,
              <Badge tone={item.status.includes("hạn") ? "amber" : "green"}>
                {item.status}
              </Badge>,
              <Link className="text-[#00876a]" to={href("subscription-detail")}>
                Xem chi tiết thuê bao
              </Link>
            ])}
          />
        </Card>
      )}
      {activeTab === "activity" && (
        <div className="grid gap-4 lg:grid-cols-[.7fr_1.3fr]">
          <Card className="p-5">
            <h2 className="font-bold">Tóm tắt hoạt động</h2>{" "}
            <p className="mt-4 text-3xl font-bold text-[#00876a]">
              {userTotal}
            </p>
            <p className="mt-1 text-xs text-[#829591]">
              người dùng và nhân viên
            </p>
          </Card>
          <Card>
            <div className="p-5">
              <h2 className="font-bold">Lịch sử thay đổi gói</h2>
            </div>
            <DataTable
              headers={["Thời gian", "Sự kiện", "Gói", "Người thực hiện"]}
              rows={businessSubscriptions.map((item) => [
                item.cycle,
                item.status,
                item.plan,
                business.ownerName
              ])}
            />
          </Card>
        </div>
      )}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Đổi gói dịch vụ</h2>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setPlanModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-xs text-[#829591]">
              Chọn gói mới cho {business.name}.
            </p>
            <div className="mt-5 space-y-2">
              {(plansQuery.data ?? []).map((plan) => (
                <button
                  key={plan.name}
                  type="button"
                  onClick={() => void savePlan(plan.name)}
                  disabled={changePlanMutation.isPending}
                  className="flex w-full items-center justify-between rounded-md border border-[#dfe7e5] p-3 text-left hover:border-[#00876a]"
                >
                  <span>
                    <b>{plan.name}</b>
                    <span className="ml-2 text-xs text-[#829591]">
                      {plan.price}
                    </span>
                  </span>
                  <CheckCircle2
                    size={16}
                    className={
                      plan.name === business.plan
                        ? "text-[#00876a]"
                        : "text-[#dfe7e5]"
                    }
                  />
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button tone="plain" onClick={() => setPlanModalOpen(false)}>
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function BusinessForm({
  title,
  submit,
  edit = false,
  notify
}: {
  title: string
  submit: string
  edit?: boolean
  notify: (message: string) => void
}) {
  const navigate = useNavigate()
  const businessId =
    new URLSearchParams(window.location.search).get("businessId") ?? "TH0001"
  const mutation = useAdminMutation(
    edit
      ? adminMutationOptions.updateBusiness(businessId)
      : adminMutationOptions.createBusiness(),
    [adminMutationKeys.businesses]
  )
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      name: String(form.get("name") || "").trim(),
      accessCode: String(form.get("accessCode") || "").trim(),
      taxCode: String(form.get("taxCode") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      address: String(form.get("address") || "").trim(),
      ownerName: String(form.get("ownerName") || "").trim(),
      ownerEmail: String(form.get("ownerEmail") || "").trim(),
      ownerPhone: String(form.get("ownerPhone") || "").trim()
    }
    if (
      !input.name ||
      !input.accessCode ||
      !input.ownerName ||
      !input.ownerEmail
    ) {
      notify("Vui lòng nhập đầy đủ các trường bắt buộc")
      return
    }
    try {
      await mutation.mutateAsync(input)
      const message = edit
        ? "Đã lưu thay đổi doanh nghiệp"
        : "Đã tạo doanh nghiệp và gửi email thông báo đến chủ tài khoản"
      notify(message)
      window.sessionStorage.setItem("admin-toast", message)
      await navigate({
        to: edit
          ? `${href("business-detail")}?businessId=${encodeURIComponent(
              businessId
            )}`
          : href("businesses")
      })
    } catch {
      notify(
        edit ? "Không thể cập nhật doanh nghiệp" : "Không thể tạo doanh nghiệp"
      )
    }
  }
  return (
    <>
      <Heading
        title={title}
        description={
          edit
            ? "Cập nhật thông tin và chính sách của doanh nghiệp."
            : "Tạo doanh nghiệp mới và tài khoản chủ sở hữu."
        }
      />
      <form onSubmit={save}>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_.7fr]">
          <Card className="p-6">
            <h2 className="mb-5 font-bold">Thông tin doanh nghiệp</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                name="name"
                label="Tên doanh nghiệp"
                value={edit ? "Mộc Store" : ""}
                required
              />
              <Field
                name="accessCode"
                label="Mã truy cập"
                value={edit ? "moc-store" : ""}
                required
              />
              <Field
                name="taxCode"
                label="Mã số thuế"
                value={edit ? "0312345678" : ""}
              />
              <Field
                name="phone"
                label="Số điện thoại"
                value={edit ? "090 123 4567" : ""}
              />
              <label className="block text-xs font-bold sm:col-span-2">
                Địa chỉ
                <textarea
                  name="address"
                  className="input mt-2 min-h-24"
                  defaultValue={edit ? "28 Trần Phú, TP. Hồ Chí Minh" : ""}
                />
              </label>
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="mb-5 font-bold">Chủ cửa hàng</h2>
              <div className="space-y-5">
                <Field
                  name="ownerName"
                  label="Họ và tên"
                  value={edit ? "Minh Anh" : ""}
                  required
                />
                <Field
                  name="ownerEmail"
                  label="Email đăng nhập"
                  value={edit ? "minhanh@mocstore.vn" : ""}
                  type="email"
                  required
                />
                <Field
                  name="ownerPhone"
                  label="Số điện thoại"
                  value={edit ? "090 888 6868" : ""}
                />
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="font-bold">Sau khi lưu</h2>
              <p className="mt-3 text-[11px] leading-5 text-[#829591]">
                Hệ thống tự tạo chi nhánh mặc định và gửi email thiết lập mật
                khẩu cho chủ tài khoản.
              </p>
            </Card>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button tone="plain" href={href("businesses")}>
            Hủy
          </Button>
          <Button type="submit">
            {mutation.isPending ? "Đang lưu..." : submit}
          </Button>
        </div>
      </form>
    </>
  )
}

export function BusinessLock({
  notify
}: {
  notify: (message: string) => void
}) {
  const businessId =
    new URLSearchParams(window.location.search).get("businessId") ?? "TH0001"
  const mutation = useAdminMutation(
    adminMutationOptions.lockBusiness(businessId),
    [adminMutationKeys.businesses]
  )
  const [reason, setReason] = useState("")
  const [preserveData, setPreserveData] = useState(true)
  const submit = async () => {
    if (!reason.trim()) {
      notify("Vui lòng nhập lý do khóa doanh nghiệp")
      return
    }
    try {
      await mutation.mutateAsync({ reason, preserveData })
      notify("Đã khóa doanh nghiệp Mộc Store")
    } catch {
      notify("Không thể khóa doanh nghiệp")
    }
  }
  return (
    <>
      <Heading title="Mộc Store" description="Thông tin doanh nghiệp" />
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#284341]/35 p-4">
        <Card className="w-full max-w-lg p-6 shadow-2xl">
          <h2 className="text-lg font-bold">Khóa doanh nghiệp</h2>
          <p className="mt-1 text-sm font-bold">Mộc Store · TH0001</p>
          <div className="mt-5 rounded-md bg-[#fff2dc] p-3 text-xs text-[#a97724]">
            Người dùng của doanh nghiệp sẽ không thể truy cập hệ thống.
          </div>
          <label className="mt-5 block text-xs font-bold">
            Lý do khóa *
            <textarea
              className="input mt-2 min-h-28"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Mô tả lý do khóa doanh nghiệp..."
            />
          </label>
          <label className="mt-4 flex gap-2 text-xs">
            <input
              type="checkbox"
              checked={preserveData}
              onChange={(event) => setPreserveData(event.target.checked)}
            />{" "}
            Giữ dữ liệu để có thể kích hoạt lại sau này
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <Button tone="plain" href={href("business-detail")}>
              Hủy
            </Button>
            <Button tone="danger" onClick={submit}>
              {mutation.isPending ? "Đang xử lý..." : "Xác nhận khóa"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
