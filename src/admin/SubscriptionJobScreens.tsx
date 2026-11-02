/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { queryClient } from "@/api/tanstack-query"
import { Loader2, RefreshCw, Search, X } from "lucide-react"
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
  Filters,
  Heading,
  InfoGrid,
} from "./AdminUi"

const href = (screen: string) =>
  screen === "dashboard" ? "/" : `/admin/${screen}`

export function Subscriptions() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [plan, setPlan] = useState("")
  const [status, setStatus] = useState("")
  const [cycle, setCycle] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 3
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const query = useQuery(adminQueryOptions.subscriptionsPage({ search, plan, status, cycle, page, pageSize }))
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Thuê bao"
          description="Theo dõi vòng đời, thanh toán và thay đổi gói dịch vụ."
        />
        <Card className="p-6 text-xs text-[#829591]">
          Đang tải dữ liệu thuê bao...
        </Card>
      </>
    )
  if (query.isError)
    return (
      <>
        <Heading
          title="Thuê bao"
          description="Theo dõi vòng đời, thanh toán và thay đổi gói dịch vụ."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu thuê bao.
        </Card>
      </>
    )
  const rows = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }
  return (
    <>
      <Heading
        title="Thuê bao"
        description="Theo dõi vòng đời, thanh toán và thay đổi gói dịch vụ."
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4">
          <label className="relative min-w-[250px] flex-1">
            <Search className="absolute left-3 top-2.5 text-[#829591]" size={14} />
            <input className="input pl-9 pr-16" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm mã thuê bao, doanh nghiệp..." />
            {query.isFetching && <Loader2 className="absolute right-9 top-2.5 animate-spin text-[#00876a]" size={14} />}
            {searchInput && <button type="button" aria-label="Xóa tìm kiếm thuê bao" className="absolute right-3 top-2 text-[#829591]" onClick={() => setSearchInput("")}><X size={15} /></button>}
          </label>
          <select className="input w-36" value={plan} onChange={(event) => updateFilter(setPlan, event.target.value)}>
            <option value="">Tất cả gói</option><option value="Free">Free</option><option value="Basic">Basic</option><option value="Pro">Pro</option>
          </select>
          <select className="input w-44" value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}>
            <option value="">Tất cả trạng thái</option><option value="Hoạt động">Hoạt động</option><option value="Đang hoạt động">Đang hoạt động</option><option value="Sắp hết hạn">Sắp hết hạn</option><option value="Đã hết hạn">Đã hết hạn</option>
          </select>
          <select className="input w-36" value={cycle} onChange={(event) => updateFilter(setCycle, event.target.value)}>
            <option value="">Tất cả chu kỳ</option><option value="01/10">Tháng 10</option><option value="12/10">Tháng 12</option><option value="25/09">Tháng 9</option><option value="01/09">Tháng 9</option>
          </select>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-xs text-[#829591]">
            Không tìm thấy thuê bao phù hợp.
          </p>
        ) : (
          <>
            <DataTable
              headers={[
                "Mã thuê bao",
                "Doanh nghiệp",
                "Gói",
                "Chu kỳ",
                "Trạng thái",
                ""
              ]}
              rows={rows.map((x) => [
                <b>{x.id}</b>,
                x.business,
                x.plan,
                x.cycle,
                <Badge tone={x.status.includes("hạn") ? "amber" : "green"}>
                  {x.status}
                </Badge>,
                <Link to={`${href("subscription-detail")}?subscriptionId=${encodeURIComponent(x.id)}`} className="text-[#00876a]">
                  Xem chi tiết
                </Link>
              ])}
            />
            <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
            <span>{total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} trong số {total}</span>
            <button type="button" disabled={page === 1} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.max(1, page - 1))}>‹</button>
            <span>Trang {page}/{pageCount}</span>
            <button type="button" disabled={page >= pageCount} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.min(pageCount, page + 1))}>›</button>
            </div>
          </>
        )}
      </Card>
    </>
  )
}

export function SubscriptionDetail() {
  const subscriptionId = new URLSearchParams(window.location.search).get("subscriptionId") ?? "SUB-0001"
  const query = useQuery(adminQueryOptions.subscriptionDetail(subscriptionId))
  if (query.isLoading) return <><Heading title="Thuê bao" description="Đang tải thông tin thuê bao..." /><Card className="p-6 text-xs text-[#829591]">Đang tải dữ liệu...</Card></>
  if (query.isError || !query.data) return <><Heading title="Thuê bao" description="Thông tin thuê bao" /><Card className="p-6 text-xs text-[#c65248]">Không thể tải thông tin thuê bao.</Card></>
  const subscription = query.data
  return (
    <>
      <Heading
        title={`Thuê bao ${subscription.id}`}
        description={`Thuê bao / ${subscription.business}`}
        action={<Button href={`${href("change-plan")}?subscriptionId=${encodeURIComponent(subscription.id)}`}>Gán / đổi gói</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex justify-between">
            <h2 className="font-bold">Thông tin thuê bao</h2>
            <Badge tone={subscription.status.includes("hạn") ? "amber" : "green"}>{subscription.status}</Badge>
          </div>
          <p className="mt-7 text-xs">          {subscription.plan}</p>
          <p className="mt-2 text-2xl font-bold text-[#00876a]">
            {subscription.price}
          </p>
          <InfoGrid
            items={[
              ["Ngày bắt đầu", subscription.startsAt],
              ["Ngày kết thúc", subscription.endsAt],
              ["Doanh nghiệp", `${subscription.business} · ${subscription.businessId}`]
            ]}
          />
        </Card>
        <Card className="p-6">
          <h2 className="font-bold">Thanh toán kỳ tiếp theo</h2>
          <p className="mt-7 text-3xl font-bold">          {subscription.price}</p>
          <p className="mt-2 text-xs text-[#829591]">
            Hạn thanh toán {subscription.nextPayment}
          </p>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="p-5">
          <h2 className="font-bold">Lịch sử gia hạn và thay đổi gói</h2>
        </div>
        <DataTable
          headers={[
            "Thời gian",
            "Sự kiện",
            "Gói",
            "Ngày hiệu lực",
            "Người thực hiện"
          ]}
          rows={subscription.history.map((item) => [
            item.time,
            item.event,
            item.plan,
            item.effectiveAt,
            item.actor
          ])}
        />
      </Card>
    </>
  )
}

export function ChangePlan({ notify }: { notify: (message: string) => void }) {
  const navigate = useNavigate()
  const subscriptionId = new URLSearchParams(window.location.search).get("subscriptionId") ?? "SUB-0001"
  const subscriptionQuery = useQuery(adminQueryOptions.subscriptionDetail(subscriptionId))
  const plansQuery = useQuery(adminQueryOptions.plans())
  const limitsQuery = useQuery(adminQueryOptions.limits())
  const [selectedPlanName, setSelectedPlanName] = useState("")
  const mutation = useAdminMutation(
    adminMutationOptions.changeSubscriptionPlan(subscriptionId),
    [adminMutationKeys.subscriptions]
  )
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      businessId: subscriptionQuery.data?.businessId ?? "",
      plan: String(form.get("plan") || "").trim(),
      startsAt: String(form.get("startsAt") || ""),
      endsAt: String(form.get("endsAt") || ""),
      note: String(form.get("note") || "").trim()
    }
    if (!input.plan || !input.startsAt || !input.endsAt) {
      notify("Vui lòng nhập đầy đủ thông tin đổi gói")
      return
    }
    if (exceededLimits.length > 0) {
      notify(`Không thể đổi gói: ${exceededLimits.map((item) => item.label).join(", ")} vượt hạn mức gói mới`)
      return
    }
    try {
      await mutation.mutateAsync(input)
      const message = "Đã cập nhật gói dịch vụ"
      notify(message)
      window.sessionStorage.setItem("admin-toast", message)
      await navigate({ to: href("subscriptions") })
    } catch {
      notify("Không thể cập nhật gói dịch vụ")
    }
  }
  if (subscriptionQuery.isLoading || plansQuery.isLoading || limitsQuery.isLoading) return <><Heading title="Gán / Đổi gói dịch vụ" description="Đang tải dữ liệu thuê bao..." /><Card className="p-6 text-xs text-[#829591]">Đang tải dữ liệu...</Card></>
  if (subscriptionQuery.isError || !subscriptionQuery.data) return <><Heading title="Gán / Đổi gói dịch vụ" description="Thông tin thuê bao" /><Card className="p-6 text-xs text-[#c65248]">Không thể tải dữ liệu thuê bao.</Card></>
  const subscription = subscriptionQuery.data
  const selectedPlan = plansQuery.data?.find((plan) => plan.name === (selectedPlanName || subscription.plan))
  const usage = limitsQuery.data?.find((item) => item.business === subscription.business)
  const usageValues = [
    { label: "Chi nhánh", value: usage?.branches ?? "", unit: "" },
    { label: "Người dùng", value: usage?.users ?? "", unit: "" },
    { label: "Sản phẩm", value: usage?.products ?? "", unit: "" },
    { label: "Dung lượng", value: usage?.storage ?? "", unit: " GB" }
  ]
  const limitRows = usageValues.map((item, index) => {
    const usageValue = Number(item.value.split("/")[0].replace(/[^\d]/g, "")) || 0
    const planLimit = Number(selectedPlan?.limits[index]?.match(/\d[\d.]*/)?.[0].replaceAll(".", "") ?? 0)
    return {
      ...item,
      usageValue,
      planLimit,
      isExceeded: planLimit > 0 && usageValue > planLimit
    }
  })
  const exceededLimits = limitRows.filter((item) => item.isExceeded)
  return (
    <>
      <Heading
        title="Gán / Đổi gói dịch vụ"
        description={`Thuê bao ${subscription.id} · ${subscription.business}`}
      />
      <form onSubmit={submit}>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_.7fr]">
          <Card className="p-6">
            <h2 className="mb-5 font-bold">Gói mới và thời gian hiệu lực</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Doanh nghiệp" value={`${subscription.business} · ${subscription.businessId}`} />
              <label className="block text-xs font-bold">
                Gói dịch vụ mới
                <select
                  name="plan"
                  className="input mt-2"
                  value={selectedPlan?.name ?? subscription.plan}
                  onChange={(event) => setSelectedPlanName(event.target.value)}
                  required
                >
                  {(plansQuery.data ?? []).map((plan) => (
                    <option key={plan.name} value={plan.name}>
                      {plan.name} · {plan.price}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                name="startsAt"
                label="Ngày hiệu lực"
                value={new Date().toISOString().slice(0, 10)}
                type="date"
              />
              <Field
                name="endsAt"
                label="Ngày kết thúc"
                value={subscription.endsAt}
                type="date"
              />
              <label className="block text-xs font-bold sm:col-span-2">
                Ghi chú thay đổi
                <textarea name="note" className="input mt-2 min-h-24" />
              </label>
            </div>
            {exceededLimits.length > 0 && (
              <div className="mt-5 rounded-md bg-[#fde8e5] p-3 text-xs text-[#c65248]">
                Không thể đổi gói: {exceededLimits.map((item) => item.label).join(", ")} đang vượt hạn mức gói mới.
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="font-bold">Kiểm tra hạn mức gói mới</h2>
            <p className="mt-2 text-xs text-[#829591]">Đang dùng / hạn mức của gói {selectedPlan?.name ?? subscription.plan}</p>
            {limitRows.map((x) => (
              <div className="mt-5 flex justify-between text-xs" key={x.label}>
                <span>{x.label}</span>
                <b className={x.isExceeded ? "text-[#c65248]" : "text-[#00876a]"}>
                  {x.usageValue.toLocaleString("vi-VN")}{x.unit} / {x.planLimit.toLocaleString("vi-VN")}{x.unit}
                  <span className="ml-2 text-[10px] font-normal">{x.isExceeded ? "Vượt" : "Đạt"}</span>
                </b>
              </div>
            ))}
          </Card>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button tone="plain" href={href("subscription-detail")}>
            Hủy
          </Button>
          <Button type="submit">
            {mutation.isPending ? "Đang lưu..." : "Xác nhận đổi gói"}
          </Button>
        </div>
      </form>
    </>
  )
}

export function Jobs() {
  const [activeTab, setActiveTab] = useState<"pending" | "retrying" | "resolved">("pending")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 7
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const allJobsQuery = useQuery(adminQueryOptions.jobs())
  const query = useQuery(adminQueryOptions.jobsPage({ search, status: activeTab, page, pageSize }))
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Job lỗi"
          description="Theo dõi và xử lý các tác vụ đồng bộ không thành công."
        />
        <Card className="p-6 text-xs text-[#829591]">
          Đang tải dữ liệu job lỗi...
        </Card>
      </>
    )
  if (query.isError)
    return (
      <>
        <Heading
          title="Job lỗi"
          description="Theo dõi và xử lý các tác vụ đồng bộ không thành công."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu job lỗi.
        </Card>
      </>
    )
  const rows = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const statusCounts = {
    pending: (allJobsQuery.data ?? []).filter((job) => job.status === "pending").length,
    retrying: (allJobsQuery.data ?? []).filter((job) => job.status === "retrying").length,
    resolved: (allJobsQuery.data ?? []).filter((job) => job.status === "resolved").length
  }
  return (
    <>
      <Heading
        title="Job lỗi"
        description="Theo dõi và xử lý các tác vụ đồng bộ không thành công."
      />
      <div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs">
        {[
          ["pending", `Cần xử lý (${statusCounts.pending})`],
          ["retrying", `Đang thử lại (${statusCounts.retrying})`],
          ["resolved", `Đã xử lý (${statusCounts.resolved})`]
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={activeTab === key ? "border-b-2 border-[#00876a] px-2 pb-3 font-bold text-[#00876a]" : "px-2 pb-3 text-[#829591]"}
            onClick={() => {
              setActiveTab(key as "pending" | "retrying" | "resolved")
              setPage(1)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Card>
        <Filters onSearch={setSearchInput} isLoading={query.isFetching} placeholder="Tìm mã job, doanh nghiệp, mã lỗi..." />
        {rows.length === 0 ? (
          <p className="p-8 text-center text-xs text-[#829591]">
            Không tìm thấy job phù hợp.
          </p>
        ) : (
          <DataTable
            headers={[
              "Job / Thời gian",
              "Doanh nghiệp",
              "Mã lỗi",
              "Số lần thử",
              "Trạng thái",
              ""
            ]}
            rows={rows.map((x) => [
              <div>
                <b>{x.id}</b>
                <p className="text-[10px] text-[#829591]">{x.createdAt}</p>
              </div>,
              x.business,
              <b className="text-[#c65248]">{x.errorCode}</b>,
              x.attempts,
              <Badge tone={x.status === "resolved" ? "green" : x.status === "pending" ? "red" : "amber"}>
                {x.status === "resolved" ? "Đã xử lý" : x.status === "pending" ? "Vượt số lần thử" : "Đang thử lại"}
              </Badge>,
              <Link
                to={`${href("job-detail")}?jobId=${encodeURIComponent(x.id)}`}
                className="text-[#00876a]"
                preload="intent"
                onMouseEnter={() => {
                  void queryClient.prefetchQuery(adminQueryOptions.jobDetail(x.id))
                }}
              >
                Xem chi tiết
              </Link>
            ])}
          />
        )}
        <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
          <span>{total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} trong số {total}</span>
          <button type="button" disabled={page === 1} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.max(1, page - 1))}>‹</button>
          <span>Trang {page}/{pageCount}</span>
          <button type="button" disabled={page >= pageCount} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.min(pageCount, page + 1))}>›</button>
        </div>
      </Card>
    </>
  )
}

export function JobDetail({ notify }: { notify: (message: string) => void }) {
  const jobId = new URLSearchParams(window.location.search).get("jobId") ?? "JOB-00984"
  const query = useQuery(adminQueryOptions.jobDetail(jobId))
  const mutation = useAdminMutation(adminMutationOptions.retryJob(), [
    adminMutationKeys.jobs
  ])
  const retry = async () => {
    try {
      await mutation.mutateAsync({ jobId })
      notify(`Đã đưa ${jobId} vào hàng đợi thử lại`)
    } catch {
      notify("Không thể thử lại job")
    }
  }
  if (query.isLoading) return (
    <>
      <Heading title="Job lỗi" description="Đang tải thông tin job..." />
      <div className="grid min-h-[220px] gap-4 lg:grid-cols-[1.4fr_.8fr]">
        <Card className="animate-pulse p-6"><div className="h-4 w-32 rounded bg-[#edf1f0]" /><div className="mt-6 grid gap-5 sm:grid-cols-2"><div className="h-8 rounded bg-[#f3f6f5]" /><div className="h-8 rounded bg-[#f3f6f5]" /><div className="h-8 rounded bg-[#f3f6f5]" /><div className="h-8 rounded bg-[#f3f6f5]" /></div></Card>
        <Card className="animate-pulse p-6"><div className="h-4 w-24 rounded bg-[#edf1f0]" /><div className="mt-6 h-20 rounded bg-[#f3f6f5]" /></Card>
      </div>
      <Card className="mt-4 min-h-[180px] animate-pulse p-6"><div className="h-4 w-36 rounded bg-[#edf1f0]" /></Card>
    </>
  )
  if (query.isError || !query.data) return <><Heading title="Job lỗi" description="Thông tin job" /><Card className="p-6 text-xs text-[#c65248]">Không thể tải thông tin job.</Card></>
  const job = query.data
  return (
    <>
      <Heading
        title={`Job ${job.id}`}
        description={`Job lỗi / ${job.platform} · ${job.task}`}
        action={
          <Button onClick={retry}>
            <RefreshCw size={13} />{" "}
            {mutation.isPending ? "Đang thử..." : "Thử lại job"}
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
        <Card className="p-6">
          <h2 className="font-bold">Thông tin tác vụ</h2>
          <InfoGrid
            items={[
              ["Doanh nghiệp", `${job.business} · ${job.businessId}`],
              ["Nền tảng / tác vụ", `${job.platform} · ${job.task}`],
              ["Mã tham chiếu", job.reference],
              ["Ngày tạo", job.createdAt],
              ["Số lần thử", job.attempts]
            ]}
          />
        </Card>
        <Card className="p-6">
          <h2 className="font-bold">Chi tiết lỗi</h2>
          <b className="mt-5 block text-sm text-[#c65248]">{job.errorCode}</b>
          <p className="mt-3 text-xs leading-5 text-[#829591]">{job.errorMessage}</p>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="p-5">
          <h2 className="font-bold">Lịch sử thực thi</h2>
        </div>
        <DataTable
          headers={["Lần thử", "Thời gian", "Kết quả", "Thời gian xử lý"]}
          rows={job.attemptsHistory.map((attempt) => [
            attempt.attempt,
            attempt.time,
            attempt.result,
            attempt.duration
          ])}
        />
      </Card>
    </>
  )
}
