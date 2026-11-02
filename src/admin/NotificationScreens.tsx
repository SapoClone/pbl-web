/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"
import { Send } from "lucide-react"
import { adminMutationKeys, adminMutationOptions, adminQueryOptions, useAdminMutation } from "@/api/admin"
import { useQuery } from "@tanstack/react-query"
import { Badge, Button, Card, DataTable, Field, Filters, Heading } from "./AdminUi"

const href = (screen: string) => screen === "dashboard" ? "/" : `/admin/${screen}`

export function Notifications() {
  const query = useQuery(adminQueryOptions.notifications())
  const [search, setSearch] = useState("")
  if (query.isLoading) return <><Heading title="Thông báo hệ thống" description="Quản lý thông báo gửi đến doanh nghiệp và người dùng."/><Card className="p-6 text-xs text-[#829591]">Đang tải dữ liệu thông báo...</Card></>
  if (query.isError) return <><Heading title="Thông báo hệ thống" description="Quản lý thông báo gửi đến doanh nghiệp và người dùng."/><Card className="p-6 text-xs text-[#c65248]">Không thể tải dữ liệu thông báo.</Card></>
  const rows = (query.data ?? []).filter((x) => `${x.title} ${x.audience} ${x.type}`.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN")))
  return <><Heading title="Thông báo hệ thống" description="Quản lý thông báo gửi đến doanh nghiệp và người dùng." action={<Button href={href("notification-new")}><Send size={13}/> Soạn thông báo</Button>}/><div className="mb-5 flex gap-6 border-b border-[#dfe7e5] text-xs"><b className="border-b-2 border-[#00876a] px-2 pb-3 text-[#00876a]">Tất cả</b><span>Đã gửi</span><span>Bản nháp</span></div><Card><Filters placeholder="Tìm theo tiêu đề thông báo..." onSearch={setSearch} isLoading={query.isFetching}/>{rows.length === 0 ? <p className="p-8 text-center text-xs text-[#829591]">Không tìm thấy thông báo phù hợp.</p> : <DataTable headers={["Tiêu đề","Đối tượng nhận","Loại","Trạng thái","Thời gian",""]} rows={rows.map(x => [<b>{x.title}</b>,x.audience,x.type,<Badge tone={x.status === "Bản nháp" ? "gray" : "green"}>{x.status}</Badge>,x.sentAt,<Link to={href("notification-new")} className="text-[#00876a]">{x.status === "Bản nháp" ? "Chỉnh sửa" : "Xem chi tiết"}</Link>])}/>}</Card></>
}

export function NotificationForm({ notify }: { notify: (message: string) => void }) {
  const mutation = useAdminMutation(adminMutationOptions.createNotification(), [adminMutationKeys.notifications])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      title: String(form.get("title") || "").trim(),
      audience: String(form.get("audience") || "all"),
      type: String(form.get("type") || "").trim(),
      content: String(form.get("content") || "").trim()
    }
    if (!input.title || !input.type || !input.content) {
      notify("Vui lòng nhập tiêu đề, loại và nội dung thông báo")
      return
    }
    try {
      await mutation.mutateAsync(input)
      notify("Thông báo đã được gửi thành công")
    } catch {
      notify("Không thể gửi thông báo")
    }
  }
  return <><Heading title="Soạn thông báo" description="Tạo thông báo mới gửi đến người dùng nền tảng."/><form onSubmit={submit}><div className="grid gap-4 lg:grid-cols-[1.4fr_.7fr]"><Card className="p-6"><h2 className="mb-5 font-bold">Nội dung thông báo</h2><div className="space-y-5"><Field name="title" label="Tiêu đề" value="Bảo trì hệ thống định kỳ" required/><Field name="type" label="Loại thông báo" value="Bảo trì"/><label className="block text-xs font-bold">Nội dung<textarea name="content" className="input mt-2 min-h-44" defaultValue="Hệ thống sẽ bảo trì từ 00:00 đến 02:00 ngày 29/10/2026. Trong thời gian này, một số chức năng có thể tạm gián đoạn." required/></label><Button tone="plain" type="button">Lưu bản nháp</Button></div></Card><div className="space-y-4"><Card className="p-6"><h2 className="mb-5 font-bold">Đối tượng nhận</h2><label className="flex gap-2 text-xs"><input type="radio" defaultChecked name="audience" value="all"/> Toàn bộ doanh nghiệp</label><label className="mt-3 flex gap-2 text-xs"><input type="radio" name="audience" value="plan"/> Doanh nghiệp theo gói</label><p className="mt-6 text-xs text-[#829591]">100 doanh nghiệp · 642 người dùng</p></Card><Card className="p-6"><h2 className="font-bold">Thời gian gửi</h2><label className="mt-4 flex gap-2 text-xs"><input type="radio" defaultChecked name="time" value="now"/> Gửi ngay</label><label className="mt-3 flex gap-2 text-xs"><input type="radio" name="time" value="scheduled"/> Lên lịch</label></Card></div></div><div className="mt-5 flex justify-end"><Button type="submit">{mutation.isPending ? "Đang gửi..." : <><Send size={13}/> Gửi thông báo</>}</Button></div></form></>
}
