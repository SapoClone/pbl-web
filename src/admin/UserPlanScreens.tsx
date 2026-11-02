/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Plus, Search, X } from "lucide-react"
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

export function UsersPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 7
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const query = useQuery(
    adminQueryOptions.users({ search, role, status, page, pageSize })
  )
  const previousData = useRef(query.data)
  if (query.isError)
    return (
      <>
        <Heading
          title="Người dùng"
          description="Tra cứu người dùng trên toàn nền tảng."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu người dùng.
        </Card>
      </>
    )
  if (query.data) previousData.current = query.data
  const rows = query.data?.items ?? previousData.current?.items ?? []
  const total = query.data?.total ?? previousData.current?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }
  return (
    <>
      <Heading
        title="Người dùng"
        description="Tra cứu người dùng trên toàn nền tảng."
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
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên, doanh nghiệp..."
            />
            {query.isFetching && (
              <Loader2
                className="absolute right-9 top-2.5 animate-spin text-[#00876a]"
                size={14}
              />
            )}{" "}
            {searchInput && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                className="absolute right-3 top-2 text-[#829591]"
                onClick={() => setSearchInput("")}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <select
            className="input w-40"
            value={role}
            onChange={(event) => updateFilter(setRole, event.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            <option value="Quản trị viên">Quản trị viên</option>
            <option value="Chủ cửa hàng">Chủ cửa hàng</option>
            <option value="Quản lý chi nhánh">Quản lý chi nhánh</option>
            <option value="Nhân viên">Nhân viên</option>
          </select>
          <select
            className="input w-40"
            value={status}
            onChange={(event) => updateFilter(setStatus, event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Hoạt động">Hoạt động</option>
            <option value="Chưa xác thực">Chưa xác thực</option>
            <option value="Đang khóa">Đang khóa</option>
          </select>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-xs text-[#829591]">
            Không tìm thấy người dùng phù hợp.
          </p>
        ) : (
          <>
            <DataTable
              headers={[
                "Người dùng",
                "Doanh nghiệp",
                "Vai trò",
                "Trạng thái",
                "Đăng nhập gần nhất",
                ""
              ]}
              rows={rows.map((x) => [
                <div>
                  <b>{x.name}</b>
                  <p className="text-[10px] text-[#829591]">
                    {x.name.toLowerCase().replaceAll(" ", "")}@omniretail.vn
                  </p>
                </div>,
                x.organization,
                x.role,
                <Badge
                  tone={
                    x.status === "Hoạt động"
                      ? "green"
                      : x.status === "Chưa xác thực"
                        ? "amber"
                        : "red"
                  }
                >
                  {x.status}
                </Badge>,
                x.lastLogin,
                <Link
                  to={`${href("user-detail")}?business=${encodeURIComponent(
                    x.businessId ?? "PLATFORM"
                  )}`}
                  className="text-[#00876a]"
                >
                  Xem chi tiết
                </Link>
              ])}
            />
            <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
              <span>
                {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}{" "}
                trong số {total}
              </span>
              <button
                type="button"
                disabled={page === 1}
                className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40"
                onClick={() => setPage(Math.max(1, page - 1))}
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
                onClick={() => setPage(Math.min(pageCount, page + 1))}
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

export function UserDetail() {
  const businessId =
    new URLSearchParams(window.location.search).get("business") ?? "TH0001"
  const query = useQuery(adminQueryOptions.userDetail(businessId))
  const [activeTab, setActiveTab] = useState<
    "profile" | "sessions" | "activities"
  >("profile")
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Người dùng"
          description="Đang tải thông tin tài khoản..."
        />
        <Card className="p-6 text-xs text-[#829591]">Đang tải dữ liệu...</Card>
      </>
    )
  if (query.isError || !query.data)
    return (
      <>
        <Heading title="Người dùng" description="Thông tin tài khoản" />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải thông tin người dùng.
        </Card>
      </>
    )
  const detail = query.data
  const { user } = detail
  const tabs = [
    { key: "profile" as const, label: "Hồ sơ" },
    { key: "sessions" as const, label: "Phiên đăng nhập" },
    { key: "activities" as const, label: "Lịch sử hoạt động" }
  ]
  return (
    <>
      <Heading
        title={user.name}
        description={`Người dùng / ${user.role} / ${user.organization}`}
      />
      <div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 pb-3 ${activeTab === tab.key
                ? "border-b-2 border-[#00876a] font-bold text-[#00876a]"
                : "text-[#284341]"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "profile" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
          <Card className="p-6">
            <h2 className="font-bold">Thông tin tài khoản</h2>
            <InfoGrid
              items={[
                ["Email", detail.email],
                ["Điện thoại", detail.phone],
                ["Doanh nghiệp", `${user.organization} · ${businessId}`],
                ["Vai trò", user.role],
                ["Trạng thái", user.status],
                ["Hoạt động gần nhất", user.lastLogin]
              ]}
            />
          </Card>
          <Card className="p-6">
            <h2 className="font-bold">Bảo mật tài khoản</h2>
            <p className="mt-5 text-[10px] text-[#829591]">
              ĐỔI MẬT KHẨU GẦN NHẤT
            </p>
            <b className="text-xs">23/10/2026 · 08:32</b>
            <p className="mt-5 text-[10px] text-[#829591]">
              {
                detail.sessions.filter(
                  (session) => session.status === "Đang hoạt động"
                ).length
              }{" "}
              phiên đang hoạt động
            </p>
            <Button tone="plain">Thu hồi tất cả phiên</Button>
          </Card>
        </div>
      )}
      {activeTab === "sessions" && (
        <Card>
          <div className="p-5">
            <h2 className="font-bold">Phiên đăng nhập</h2>
            <p className="mt-1 text-xs text-[#829591]">
              Theo dõi các thiết bị đã đăng nhập vào tài khoản.
            </p>
          </div>
          <DataTable
            headers={["Thiết bị", "Vị trí", "Hoạt động gần nhất", "Trạng thái"]}
            rows={detail.sessions.map((session) => [
              <b>{session.device}</b>,
              session.location,
              session.lastActive,
              <Badge
                tone={session.status === "Đang hoạt động" ? "green" : "gray"}
              >
                {session.status}
              </Badge>
            ])}
          />
        </Card>
      )}
      {activeTab === "activities" && (
        <Card>
          <div className="p-5">
            <h2 className="font-bold">Lịch sử hoạt động</h2>
            <p className="mt-1 text-xs text-[#829591]">
              Các thao tác quản trị gần đây của tài khoản.
            </p>
          </div>
          <DataTable
            headers={["Thao tác", "Thời gian", "Nguồn"]}
            rows={detail.activities.map((activity) => [
              <b>{activity.action}</b>,
              activity.time,
              activity.source
            ])}
          />
        </Card>
      )}
      <div className="mt-4 rounded-md bg-[#e7f1fa] p-4 text-xs text-[#3778a9]">
        Mọi thao tác quản trị trên người dùng đều được ghi vào nhật ký hệ thống.
      </div>
    </>
  )
}

export function Plans() {
  const query = useQuery(adminQueryOptions.plans())
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Gói dịch vụ"
          description="Quản lý hạn mức, giá và quyền lợi của các gói dịch vụ."
        />
        <Card className="p-6 text-xs text-[#829591]">
          Đang tải dữ liệu gói dịch vụ...
        </Card>
      </>
    )
  if (query.isError)
    return (
      <>
        <Heading
          title="Gói dịch vụ"
          description="Quản lý hạn mức, giá và quyền lợi của các gói dịch vụ."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu gói dịch vụ.
        </Card>
      </>
    )
  const rows = query.data ?? []
  return (
    <>
      <Heading
        title="Gói dịch vụ"
        description="Quản lý hạn mức, giá và quyền lợi của các gói dịch vụ."
        action={
          <Button href={href("plan-config")}>
            <Plus size={14} /> Tạo gói
          </Button>
        }
      />

      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-3">
  {rows.map((x, i) => (
    <Card
      key={x.name}
      className={`flex h-full flex-col justify-between p-6 ${i === 2 ? "border-[#00876a]" : ""}`}
    >
      {/* Khối nội dung phía trên: dùng flex-grow để tự động chiếm khoảng trống thừa */}
      <div className="grow">
        <Badge>
          {i === 0
            ? "Đang cung cấp"
            : i === 1
              ? "Đang hoạt động"
              : "Phổ biến"}
        </Badge>
        <h2 className="mt-5 text-xl font-bold">{x.name}</h2>
        <p className="mt-2 text-2xl font-bold text-[#00876a]">
          {x.price} <span className="text-xs">/ tháng</span>
        </p>
        <ul className="my-6 space-y-3 text-xs">
          {x.limits.map((s) => (
            <li key={s}>✓ {s}</li>
          ))}
        </ul>
      </div>

      {/* Nút bấm ở dưới cùng, sẽ luôn thẳng hàng ngang ở mọi card */}
      <Button
        tone="plain"
        href={`${href("plan-config")}?planId=${encodeURIComponent(
          x.name
        )}`}
      >
        Chỉnh sửa gói
      </Button>
    </Card>
  ))}
</div>
    </>
  )
}

export function PlanConfig({ notify }: { notify: (message: string) => void }) {
  const navigate = useNavigate()
  const planId = new URLSearchParams(window.location.search).get("planId")
  const isEditing = Boolean(planId)
  const plansQuery = useQuery(adminQueryOptions.plans())
  const subscriptionsQuery = useQuery(adminQueryOptions.subscriptions())
  const currentPlan = plansQuery.data?.find((plan) => plan.name === planId)
  const mutation = useAdminMutation(
    isEditing
      ? adminMutationOptions.updatePlan(planId ?? "")
      : adminMutationOptions.createPlan(),
    [adminMutationKeys.plans]
  )
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim(),
      status: String(form.get("status") || "").trim(),
      maxBranches: Number(form.get("maxBranches")),
      maxUsers: Number(form.get("maxUsers")),
      maxProducts: Number(form.get("maxProducts")),
      storageGb: Number(form.get("storageGb"))
    }
    if (
      !input.name ||
      !Number.isFinite(input.maxBranches) ||
      !Number.isFinite(input.maxUsers) ||
      !Number.isFinite(input.maxProducts) ||
      !Number.isFinite(input.storageGb)
    ) {
      notify("Vui lòng nhập tên gói")
      return
    }
    const activeSubscriptions = (subscriptionsQuery.data ?? []).filter(
      (subscription) =>
        subscription.plan === planId && subscription.status !== "Đã hết hạn"
    )
    const currentLimits = (currentPlan?.limits ?? []).map((limit) =>
      Number(limit.match(/\d[\d.]*/)?.[0].replaceAll(".", "") ?? 0)
    )
    const nextLimits = [
      input.maxBranches ?? 0,
      input.maxUsers ?? 0,
      input.maxProducts ?? 0,
      input.storageGb ?? 0
    ]
    const isReduced = nextLimits.some(
      (limit, index) => limit < (currentLimits[index] ?? 0)
    )
    if (
      isEditing &&
      activeSubscriptions.length > 0 &&
      isReduced &&
      !window.confirm(
        `Gói ${planId} đang được ${activeSubscriptions.length} thuê bao sử dụng. Giảm hạn mức có thể ảnh hưởng đến doanh nghiệp đang dùng gói này. Bạn vẫn muốn lưu?`
      )
    ) {
      return
    }
    try {
      await mutation.mutateAsync(input)
      const message = isEditing
        ? `Đã lưu cấu hình gói ${input.name}`
        : `Đã tạo gói ${input.name} thành công`
      notify(message)
      window.sessionStorage.setItem("admin-toast", message)
      await navigate({ to: href("plans") })
    } catch {
      notify("Không thể lưu cấu hình gói")
    }
  }
  const defaultLimits = currentPlan?.limits ?? []
  const limitValue = (index: number, fallback: string) =>
    defaultLimits[index]?.match(/\d[\d.]*/)?.[0].replaceAll(".", "") ?? fallback
  return (
    <>
      <Heading
        title={isEditing ? `Cấu hình gói ${planId}` : "Tạo gói dịch vụ"}
        description="Cập nhật giá, hạn mức và quyền lợi."
      />
      <form onSubmit={save}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-5 font-bold">Thông tin gói</h2>
            <div className="space-y-5">
              <Field
                name="name"
                label="Tên gói"
                value={currentPlan?.name ?? ""}
                required
              />
              <Field
                name="description"
                label="Mô tả"
                value="Dành cho doanh nghiệp tăng trưởng"
              />
              <Field name="status" label="Trạng thái" value="Đang cung cấp" />
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="mb-5 font-bold">Hạn mức sử dụng</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                name="maxBranches"
                label="Số chi nhánh tối đa"
                value={limitValue(0, "1")}
              />
              <Field
                name="maxUsers"
                label="Số người dùng tối đa"
                value={limitValue(1, "3")}
              />
              <Field
                name="maxProducts"
                label="Số sản phẩm tối đa"
                value={limitValue(2, "100")}
              />
              <Field
                name="storageGb"
                label="Dung lượng lưu trữ (GB)"
                value={limitValue(3, "10")}
              />
            </div>
          </Card>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button tone="plain" href={href("plans")}>
            Hủy
          </Button>
          <Button type="submit">
            {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </form>
    </>
  )
}
