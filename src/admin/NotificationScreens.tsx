/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useEffect, useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"
import { Send } from "lucide-react"
import { adminMutationKeys, adminMutationOptions, adminQueryOptions, useAdminMutation } from "@/api/admin"
import { useQuery } from "@tanstack/react-query"
import { Badge, Button, Card, DataTable, Field, Heading } from "./AdminUi"

const href = (screen: string) => screen === "dashboard" ? "/" : `/admin/${screen}`

export function Notifications() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")
  const [time, setTime] = useState<"all" | "today" | "7d" | "30d">("all")
  const [page, setPage] = useState(1)
  const pageSize = 6
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const query = useQuery(adminQueryOptions.notificationsPage({ search, type, time, status, page, pageSize }))
  if (query.isLoading) return <><Heading title="Thông báo hệ thống" description="Quản lý thông báo gửi đến doanh nghiệp và người dùng."/><Card className="p-6 text-xs text-[#829591]">Đang tải dữ liệu thông báo...</Card></>
  if (query.isError) return <><Heading title="Thông báo hệ thống" description="Quản lý thông báo gửi đến doanh nghiệp và người dùng."/><Card className="p-6 text-xs text-[#c65248]">Không thể tải dữ liệu thông báo.</Card></>
  const rows = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const updateStatus = (value: string) => {
    setStatus(value)
    setPage(1)
  }
  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }
  return <><Heading title="Thông báo hệ thống" description="Quản lý thông báo gửi đến doanh nghiệp và người dùng." action={<Button href={href("notification-new")}><Send size={13}/> Soạn thông báo</Button>}/><div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs"><button type="button" onClick={() => updateStatus("")} className={!status ? "border-b-2 border-[#00876a] px-2 pb-3 font-bold text-[#00876a]" : "px-2 pb-3 text-[#829591]"}>Tất cả</button><button type="button" onClick={() => updateStatus("Đã gửi")} className={status === "Đã gửi" ? "border-b-2 border-[#00876a] px-2 pb-3 font-bold text-[#00876a]" : "px-2 pb-3 text-[#829591]"}>Đã gửi</button><button type="button" onClick={() => updateStatus("Bản nháp")} className={status === "Bản nháp" ? "border-b-2 border-[#00876a] px-2 pb-3 font-bold text-[#00876a]" : "px-2 pb-3 text-[#829591]"}>Bản nháp</button></div><Card><div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4"><input className="input min-w-[220px] flex-1" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm theo tiêu đề thông báo..." /><select className="input w-36" value={time} onChange={(event) => { setTime(event.target.value as "all" | "today" | "7d" | "30d"); setPage(1) }}><option value="all">Tất cả thời gian</option><option value="today">Hôm nay</option><option value="7d">7 ngày qua</option><option value="30d">30 ngày qua</option></select><select className="input w-32" value={type} onChange={(event) => updateFilter(setType, event.target.value)}><option value="">Tất cả loại</option><option value="Bảo trì">Bảo trì</option><option value="Cập nhật">Cập nhật</option><option value="Hướng dẫn">Hướng dẫn</option></select><select className="input w-36" value={status} onChange={(event) => updateStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="Đã gửi">Đã gửi</option><option value="Đã lên lịch">Đã lên lịch</option><option value="Bản nháp">Bản nháp</option></select></div>{rows.length === 0 ? <p className="p-8 text-center text-xs text-[#829591]">Không tìm thấy thông báo phù hợp.</p> : <DataTable headers={["Tiêu đề","Đối tượng nhận","Loại","Trạng thái","Thời gian",""]} rows={rows.map(x => [<b>{x.title}</b>,x.audience,x.type,<Badge tone={x.status === "Đã lên lịch" ? "amber" : x.status === "Bản nháp" ? "gray" : "green"}>{x.status}</Badge>,x.sentAt,x.status === "Bản nháp" ? <Link to={`${href("notification-new")}?notificationId=${encodeURIComponent(x.id)}`} className="text-[#00876a]">Chỉnh sửa</Link> : <Link to={`${href("notification-detail")}?notificationId=${encodeURIComponent(x.id)}`} className="text-[#00876a]">Xem chi tiết</Link>])}/>}<div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]"><span>{total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} trong số {total}</span><button type="button" disabled={page === 1} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.max(1, page - 1))}>‹</button><span>Trang {page}/{pageCount}</span><button type="button" disabled={page >= pageCount} className="rounded border border-[#dfe7e5] px-2 py-1 disabled:opacity-40" onClick={() => setPage(Math.min(pageCount, page + 1))}>›</button></div></Card></>
}

export function NotificationDetail() {
  const notificationId = new URLSearchParams(window.location.search).get("notificationId") ?? ""
  const query = useQuery(adminQueryOptions.notificationDetail(notificationId))
  if (query.isLoading) return <><Heading title="Chi tiết thông báo" description="Thông báo chỉ đọc." /><Card className="p-6 text-xs text-[#829591]">Đang tải thông báo...</Card></>
  if (query.isError || !query.data) return <><Heading title="Chi tiết thông báo" description="Thông báo chỉ đọc." /><Card className="p-6 text-xs text-[#c65248]">Không thể tải thông báo.</Card></>
  const notification = query.data
  return <><Heading title={notification.title} description="Thông báo chỉ đọc." /><Card className="p-6"><div className="flex flex-wrap gap-2"><Badge tone={notification.status === "Đã lên lịch" ? "amber" : "green"}>{notification.status}</Badge><Badge tone="gray">{notification.type}</Badge></div><dl className="mt-6 grid gap-5 text-xs sm:grid-cols-2"><div><dt className="text-[#829591]">Đối tượng nhận</dt><dd className="mt-1 font-bold">{notification.audience}</dd></div><div><dt className="text-[#829591]">Thời gian</dt><dd className="mt-1 font-bold">{notification.sentAt}</dd></div></dl><div className="mt-6 border-t border-[#edf1f0] pt-5"><h2 className="font-bold">Nội dung</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#607975]">{notification.content}</p></div><div className="mt-6"><Button tone="plain" href={href("notifications")}>Quay lại danh sách</Button></div></Card></>
}

export function NotificationForm({ notify }: { notify: (message: string) => void }) {
  const plansQuery = useQuery(adminQueryOptions.plans())
  const [audience, setAudience] = useState("all")
  const [sendTime, setSendTime] = useState("now")
  const [selectedPlan, setSelectedPlan] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const notificationId = new URLSearchParams(window.location.search).get("notificationId") ?? ""
  const draftQuery = useQuery(adminQueryOptions.notificationDetail(notificationId))
  const isEditingDraft = Boolean(notificationId)
  const createMutation = useAdminMutation(adminMutationOptions.createNotification(), [adminMutationKeys.notifications])
  const updateMutation = useAdminMutation(adminMutationOptions.updateNotification(notificationId), [adminMutationKeys.notifications])
  const mutation = isEditingDraft ? updateMutation : createMutation
  useEffect(() => {
    const notification = draftQuery.data
    if (!notification) return
    setAudience(notification.audience.includes(" · ") ? "plan" : "all")
    setSelectedPlan(notification.audience.split(" · ")[1] ?? "")
    setSendTime(notification.status === "Đã lên lịch" ? "scheduled" : "now")
    setScheduledAt(notification.status === "Đã lên lịch" ? notification.sentAt : "")
  }, [draftQuery.data])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      title: String(form.get("title") || "").trim(),
      audience,
      plan: audience === "plan" ? selectedPlan : undefined,
      type: String(form.get("type") || "").trim(),
      content: String(form.get("content") || "").trim(),
      scheduledAt: sendTime === "scheduled" ? scheduledAt : undefined
    }
    if (!input.title || !input.type || !input.content || (audience === "plan" && !selectedPlan) || (sendTime === "scheduled" && !scheduledAt)) {
      notify("Vui lòng nhập đầy đủ thông tin thông báo")
      return
    }
    try {
      await mutation.mutateAsync(input)
      notify(isEditingDraft ? "Đã cập nhật bản nháp" : sendTime === "scheduled" ? "Thông báo đã được lên lịch" : "Thông báo đã được gửi thành công")
    } catch {
      notify("Không thể gửi thông báo")
    }
  }
  if (isEditingDraft && (draftQuery.isLoading || !draftQuery.data)) return <><Heading title="Chỉnh sửa bản nháp" description="Tiếp tục soạn thông báo." /><Card className="p-6 text-xs text-[#829591]">Đang tải bản nháp...</Card></>
  const draft = draftQuery.data
  return <><Heading title={isEditingDraft ? "Chỉnh sửa bản nháp" : "Soạn thông báo"} description="Tạo thông báo mới gửi đến người dùng nền tảng."/><form onSubmit={submit}><div className="grid gap-4 lg:grid-cols-[1.4fr_.7fr]"><Card className="p-6"><h2 className="mb-5 font-bold">Nội dung thông báo</h2><div className="space-y-5"><Field name="title" label="Tiêu đề" value={draft?.title ?? "Bảo trì hệ thống định kỳ"} required/><Field name="type" label="Loại thông báo" value={draft?.type ?? "Bảo trì"}/><label className="block text-xs font-bold">Nội dung<textarea name="content" className="input mt-2 min-h-44" defaultValue={draft?.content ?? "Hệ thống sẽ bảo trì từ 00:00 đến 02:00 ngày 29/10/2026. Trong thời gian này, một số chức năng có thể tạm gián đoạn."} required/></label><Button tone="plain" type="button">Lưu bản nháp</Button></div></Card><div className="space-y-4"><Card className="p-6"><h2 className="mb-5 font-bold">Đối tượng nhận</h2><label className="flex gap-2 text-xs"><input type="radio" checked={audience === "all"} onChange={() => setAudience("all")} name="audience" value="all"/> Toàn bộ doanh nghiệp</label><label className="mt-3 flex gap-2 text-xs"><input type="radio" checked={audience === "plan"} onChange={() => setAudience("plan")} name="audience" value="plan"/> Doanh nghiệp theo gói</label>{audience === "plan" && <label className="mt-4 block text-xs font-bold">Chọn gói dịch vụ<select className="input mt-2" value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)} required><option value="">Chọn gói</option>{(plansQuery.data ?? []).map((plan) => <option key={plan.name} value={plan.name}>{plan.name} · {plan.price}</option>)}</select></label>}<p className="mt-6 text-xs text-[#829591]">Đối tượng sẽ được xác định theo dữ liệu thuê bao hiện tại.</p></Card><Card className="p-6"><h2 className="font-bold">Thời gian gửi</h2><label className="mt-4 flex gap-2 text-xs"><input type="radio" checked={sendTime === "now"} onChange={() => setSendTime("now")} name="time" value="now"/> Gửi ngay</label><label className="mt-3 flex gap-2 text-xs"><input type="radio" checked={sendTime === "scheduled"} onChange={() => setSendTime("scheduled")} name="time" value="scheduled"/> Lên lịch</label>{sendTime === "scheduled" && <label className="mt-4 block text-xs font-bold">Chọn ngày và giờ<input className="input mt-2" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required/></label>}</Card></div></div><div className="mt-5 flex justify-end gap-2"><Button tone="plain" href={href("notifications")}>Hủy</Button><Button type="submit">{mutation.isPending ? "Đang lưu..." : <><Send size={13}/> {isEditingDraft ? "Gửi thông báo" : sendTime === "scheduled" ? "Lên lịch thông báo" : "Gửi thông báo"}</>}</Button></div></form></>
}
