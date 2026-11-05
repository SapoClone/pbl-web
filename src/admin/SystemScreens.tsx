/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, RefreshCw, Search, X } from "lucide-react"
import { adminQueryOptions } from "@/api/admin"
import { Badge, Button, Card, DataTable, Heading } from "./AdminUi"
import { Link } from "@tanstack/react-router"

const href = (screen: string) =>
  screen === "dashboard" ? "/" : `/admin/${screen}`

export function Limits() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [plan, setPlan] = useState("")
  const [alert, setAlert] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 4
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const query = useQuery(adminQueryOptions.limitsPage({ search, plan, alert, page, pageSize }))
  const previousData = useRef(query.data)
  if (query.data) previousData.current = query.data
  if (query.isError)
    return (
      <>
        <Heading
          title="Hạn mức sử dụng"
          description="Theo dõi mức tiêu thụ tài nguyên theo từng doanh nghiệp."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu hạn mức.
        </Card>
      </>
    )
  const rows = query.data?.items ?? previousData.current?.items ?? []
  const total = query.data?.total ?? previousData.current?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const detail = rows.find((item) => item.detail.length > 0)
  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }
  return (
    <>
      <Heading
        title="Hạn mức sử dụng"
        description="Theo dõi mức tiêu thụ tài nguyên theo từng doanh nghiệp."
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4">
          <label className="relative min-w-[250px] flex-1">
            <Search className="absolute left-3 top-2.5 text-[#829591]" size={14} />
            <input className="input pl-9 pr-16" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm doanh nghiệp, gói..." />
            {query.isFetching && <Loader2 className="absolute right-9 top-2.5 animate-spin text-[#00876a]" size={14} />}
            {searchInput && <button type="button" aria-label="Xóa tìm kiếm hạn mức" className="absolute right-3 top-2 text-[#829591]" onClick={() => setSearchInput("")}><X size={15} /></button>}
          </label>
          <select className="input w-36" value={plan} onChange={(event) => updateFilter(setPlan, event.target.value)}>
            <option value="">Tất cả gói</option><option value="Free">Free</option><option value="Basic">Basic</option><option value="Pro">Pro</option>
          </select>
          <select className="input w-44" value={alert} onChange={(event) => updateFilter(setAlert, event.target.value)}>
            <option value="">Tất cả cảnh báo</option><option value="Bình thường">Bình thường</option><option value="Gần hạn mức">Gần hạn mức</option><option value="Vượt hạn mức">Vượt hạn mức</option>
          </select>
        </div>
        <DataTable
          headers={[
            "Doanh nghiệp",
            "Gói",
            "Chi nhánh",
            "Người dùng",
            "Sản phẩm",
            "Dung lượng",
            "Cảnh báo"
          ]}
          rows={rows.map((x) => [
            <b>{x.business}</b>,
            x.plan,
            x.branches,
            x.users,
            x.products,
            x.storage,
            <Badge
              tone={
                x.alert === "Vượt hạn mức"
                  ? "red"
                  : x.alert === "Gần hạn mức"
                    ? "amber"
                    : "green"
              }
            >
              {x.alert}
            </Badge>
          ])}
        />
        <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
          <span>{total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} trong số {total}</span>
          <button type="button" disabled={page === 1} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.max(1, page - 1))}>‹</button>
          <span>Trang {page}/{pageCount}</span>
          <button type="button" disabled={page >= pageCount} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.min(pageCount, page + 1))}>›</button>
        </div>
      </Card>
      {detail && (
        <Card className="mt-4 p-6">
          <h2 className="font-bold">{detail.business} · Chi tiết sử dụng</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {detail.detail.map((x) => (
              <div key={x.resource}>
                <div className="flex justify-between text-xs">
                  <span>{x.resource}</span>
                  <b>{x.value}</b>
                </div>
                <div className="mt-2 h-2 rounded bg-[#e6eeeb]">
                  <div
                    style={{ width: `${x.percent}%` }}
                    className={`h-2 rounded ${
                      x.percent === 100 ? "bg-[#d95f54]" : "bg-[#00876a]"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

export function Monitoring({ notify }: { notify: (message: string) => void }) {
  const query = useQuery(adminQueryOptions.services())
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Giám sát hệ thống"
          description="Sức khỏe dịch vụ và lưu lượng toàn nền tảng."
        />
        <Card className="p-6 text-xs text-[#829591]">
          Đang tải dữ liệu giám sát...
        </Card>
      </>
    )
  if (query.isError)
    return (
      <>
        <Heading
          title="Giám sát hệ thống"
          description="Sức khỏe dịch vụ và lưu lượng toàn nền tảng."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu giám sát.
        </Card>
      </>
    )
  const rows = query.data ?? []
  return (
    <>
      <Heading
        title="Giám sát hệ thống"
        description="Sức khỏe dịch vụ và lưu lượng toàn nền tảng."
        action={
          <Button onClick={() => notify("Đã cập nhật dữ liệu giám sát")}>
            <RefreshCw size={13} /> Cập nhật dữ liệu
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Độ trễ API", "142 ms", "P95 · 30 phút"],
          ["Tỷ lệ lỗi", "0,28%", "Trong ngưỡng"],
          ["Người dùng hoạt động", "642", "24 giờ qua"],
          ["Hàng đợi", "28 job", "Đang chờ"]
        ].map((x) => (
          <Card className="p-5" key={x[0]}>
            <p className="text-xs text-[#829591]">{x[0]}</p>
            <b className="mt-2 block text-2xl">{x[1]}</b>
            <p className="mt-1 text-[10px] text-[#00876a]">{x[2]}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <DataTable
          headers={[
            "Dịch vụ",
            "Trạng thái",
            "Độ trễ / tải",
            "Cập nhật gần nhất",
            ""
          ]}
          rows={rows.map((x, i) => [
            <b>{x.name}</b>,
            <Badge tone={x.status === "Cảnh báo" ? "amber" : "green"}>
              {x.status}
            </Badge>,
            x.load,
            x.updatedAt,
            <Link
              to={i === rows.length - 1 ? href("jobs") : href("monitoring")}
              className="text-[#00876a]"
            >
              Xem chi tiết
            </Link>
          ])}
        />
      </Card>
    </>
  )
}

export function Integrations() {
  const [activeTab, setActiveTab] = useState<"connections" | "sync" | "webhooks">("connections")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [channel, setChannel] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState("")
  const [connectionAction, setConnectionAction] = useState("")
  const pageSize = 4
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const query = useQuery(adminQueryOptions.integrationsPage({ search, channel, status, page, pageSize }))
  const detailQuery = useQuery(adminQueryOptions.integrationDetail(selectedId))
  const rows = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const selected = detailQuery.data
  const selectFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }
  const tabs = [
    { key: "connections" as const, label: "Kết nối" },
    { key: "sync" as const, label: "Lịch sử đồng bộ" },
    { key: "webhooks" as const, label: "Webhook" }
  ]
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Theo dõi tích hợp"
          description="Tình trạng kết nối và đồng bộ từ các kênh bán hàng."
        />
        <Card className="p-6 text-xs text-[#829591]">
          Đang tải dữ liệu tích hợp...
        </Card>
      </>
    )
  if (query.isError)
    return (
      <>
        <Heading
          title="Theo dõi tích hợp"
          description="Tình trạng kết nối và đồng bộ từ các kênh bán hàng."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải dữ liệu tích hợp.
        </Card>
      </>
    )
  return (
    <>
      <Heading
        title="Theo dõi tích hợp"
        description="Tình trạng kết nối và đồng bộ từ các kênh bán hàng."
      />
      <div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            className={activeTab === tab.key ? "border-b-2 border-[#00876a] px-2 pb-3 font-bold text-[#00876a]" : "px-2 pb-3 text-[#829591]"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4">
          <label className="relative min-w-[250px] flex-1">
            <Search className="absolute left-3 top-2.5 text-[#829591]" size={14} />
            <input className="input pl-9 pr-16" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm doanh nghiệp, kênh..." />
            {query.isFetching && <Loader2 className="absolute right-9 top-2.5 animate-spin text-[#00876a]" size={14} />}
            {searchInput && <button type="button" aria-label="Xóa tìm kiếm tích hợp" className="absolute right-3 top-2 text-[#829591]" onClick={() => setSearchInput("")}><X size={15} /></button>}
          </label>
          <select className="input w-36" value={channel} onChange={(event) => selectFilter(setChannel, event.target.value)}>
            <option value="">Tất cả kênh</option><option value="Shopee">Shopee</option><option value="TikTok Shop">TikTok Shop</option>
          </select>
          <select className="input w-40" value={status} onChange={(event) => selectFilter(setStatus, event.target.value)}>
            <option value="">Tất cả trạng thái</option><option value="Đã kết nối">Đã kết nối</option><option value="Xác thực lại">Xác thực lại</option><option value="Chưa đồng bộ">Chưa đồng bộ</option>
          </select>
        </div>
        {activeTab === "connections" && (
          <DataTable
            headers={["Doanh nghiệp / chi nhánh", "Kênh", "Môi trường", "Trạng thái", "Đồng bộ gần nhất", ""]}
            rows={rows.map((x) => [
              <b>{x.business}</b>,
              x.channel,
              x.environment,
              <Badge tone={x.status === "Xác thực lại" ? "amber" : x.status === "Chưa đồng bộ" ? "blue" : "green"}>{x.status}</Badge>,
              x.lastSync,
              <button type="button" className="text-[#00876a]" onClick={() => setSelectedId(x.id)}>Xem chi tiết</button>
            ])}
          />
        )}
        {activeTab === "sync" && selected && (
          <DataTable
            headers={["Loại đồng bộ", "Kết quả", "Thông điệp", "Thời gian"]}
            rows={selected.syncLogs.map((item) => [
              item.type,
              <Badge tone={item.result.startsWith("Thành công") ? "green" : "red"}>{item.result}</Badge>,
              item.errorMessage ?? "—",
              item.createdAt
            ])}
          />
        )}
        {activeTab === "webhooks" && selected && (
          <DataTable
            headers={["Sự kiện", "Trạng thái", "Thời gian nhận", "Mã webhook"]}
            rows={selected.webhooks.map((item) => [
              item.event,
              <Badge tone="green">{item.status}</Badge>,
              item.receivedAt,
              item.id
            ])}
          />
        )}
        {activeTab !== "connections" && !selected && (
          <div className="p-6 text-xs text-[#829591]">Chọn “Xem chi tiết” ở tab Kết nối để xem dữ liệu.</div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
          <span>{total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} trong số {total}</span>
          <button type="button" disabled={page === 1} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.max(1, page - 1))}>‹</button>
          <span>Trang {page}/{pageCount}</span>
          <button type="button" disabled={page >= pageCount} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.min(pageCount, page + 1))}>›</button>
        </div>
      </Card>
      {selectedId && (
        <div className="fixed inset-0 z-30 bg-[#284341]/25" onClick={() => setSelectedId("")}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-[620px] overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            {detailQuery.isLoading && <div className="text-xs text-[#829591]">Đang tải chi tiết tích hợp...</div>}
            {detailQuery.isError && <div className="text-xs text-[#c65248]">Không thể tải chi tiết tích hợp.</div>}
            {selected && (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-[#e8eeec] pb-5">
                  <div><p className="text-[10px] uppercase tracking-wider text-[#829591]">Chi tiết gian hàng</p><h2 className="mt-1 text-xl font-bold">{selected.shopName}</h2><p className="mt-1 text-xs text-[#829591]">{selected.business} · {selected.channel}</p></div>
                  <button type="button" aria-label="Đóng chi tiết tích hợp" className="rounded p-1 text-[#829591] hover:bg-[#f3f6f5]" onClick={() => setSelectedId("")}><X size={18} /></button>
                </div>
                <section className="border-b border-[#e8eeec] py-5"><h3 className="font-bold">Thông tin định danh gian hàng</h3><div className="mt-4 grid gap-4 text-xs sm:grid-cols-2"><div><span className="text-[#829591]">Kênh kết nối</span><b className="mt-1 block">{selected.channel}</b></div><div><span className="text-[#829591]">Shop ID</span><b className="mt-1 block">{selected.shopId}</b></div><div><span className="text-[#829591]">Chi nhánh liên kết</span><b className="mt-1 block">{selected.internalBranch}</b></div><div><span className="text-[#829591]">Môi trường</span><b className="mt-1 block">{selected.environment}</b></div></div></section>
                <section className="border-b border-[#e8eeec] py-5"><h3 className="font-bold">Trạng thái xác thực & mã Token</h3><div className="mt-4 flex items-center gap-2 text-xs"><Badge tone={selected.tokenStatus === "Còn hạn" ? "green" : "red"}>{selected.tokenStatus}</Badge><span className="text-[#829591]">{selected.tokenExpiresAt}</span></div><div className="mt-4 flex flex-wrap gap-2">{selected.scopes.map((scope) => <Badge key={scope} tone="gray">{scope}</Badge>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setConnectionAction("Đã gửi yêu cầu kiểm tra kết nối tới sàn.")}><RefreshCw size={13} /> Kiểm tra kết nối lại</Button><Button tone="danger" onClick={() => setConnectionAction("Đã ghi nhận yêu cầu hủy liên kết.")}>Hủy liên kết</Button></div>{connectionAction && <p className="mt-3 text-xs text-[#00876a]">{connectionAction}</p>}</section>
                <section className="border-b border-[#e8eeec] py-5"><h3 className="font-bold">Cấu hình quy tắc đồng bộ</h3><div className="mt-4 grid gap-4 text-xs sm:grid-cols-3"><div><span className="text-[#829591]">Tồn kho</span><b className="mt-1 block">{selected.inventorySync}</b></div><div><span className="text-[#829591]">Giá</span><b className="mt-1 block">{selected.priceSync}</b></div><div><span className="text-[#829591]">Quét đơn</span><b className="mt-1 block">{selected.orderPolling}</b></div></div></section>
                <section className="py-5"><h3 className="font-bold">Nhật ký đồng bộ gần nhất</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="text-[10px] uppercase text-[#829591]"><tr><th className="pb-3 pr-3">Thời gian</th><th className="pb-3 pr-3">Loại tác vụ</th><th className="pb-3">Kết quả / thông điệp</th></tr></thead><tbody>{selected.syncLogs.map((log) => <tr key={log.id} className="border-t border-[#edf1f0] align-top"><td className="whitespace-nowrap py-3 pr-3">{log.createdAt}</td><td className="py-3 pr-3">{log.type}</td><td className="py-3"><Badge tone={log.result.startsWith("Thành công") ? "green" : "red"}>{log.result}</Badge>{log.errorMessage && <p className="mt-1 text-[#c65248]">{log.errorMessage}</p>}</td></tr>)}</tbody></table></div></section>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
