/* eslint-disable react/jsx-key -- JSX nodes are individual DataTable cell values; row/cell keys are added by DataTable. */
import { useEffect, useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  adminMutationKeys,
  adminMutationOptions,
  adminQueryOptions,
  useAdminMutation
} from "@/api/admin"
import { Badge, Button, Card, DataTable, Field, Heading } from "./AdminUi"

export function Audit() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [scope, setScope] = useState("")
  const [result, setResult] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 6
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  const query = useQuery(
    adminQueryOptions.auditLogsPage({ search, scope, result, page, pageSize })
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
        title="Nhật ký hoạt động"
        description="Tra cứu thao tác quản trị. Nhật ký chỉ đọc và không thể chỉnh sửa."
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4">
          <input
            className="input min-w-[250px] flex-1"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm người thực hiện, đối tượng..."
          />
          <select
            className="input w-40"
            value={scope}
            onChange={(event) => updateFilter(setScope, event.target.value)}
          >
            <option value="">Tất cả phạm vi</option>
            <option value="Nền tảng">Nền tảng</option>
            <option value="Mộc Store">Mộc Store</option>
            <option value="Lá Xanh Market">Lá Xanh Market</option>
          </select>
          <select
            className="input w-36"
            value={result}
            onChange={(event) => updateFilter(setResult, event.target.value)}
          >
            <option value="">Tất cả kết quả</option>
            <option value="Thành công">Thành công</option>
            <option value="Thất bại">Thất bại</option>
          </select>
        </div>
        {query.isLoading ? (
          <div className="p-6 text-xs text-[#829591]">Đang tải nhật ký...</div>
        ) : query.isError ? (
          <div className="p-6 text-xs text-[#c65248]">
            Không thể tải nhật ký hoạt động.
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#829591]">
            Không tìm thấy nhật ký phù hợp.
          </div>
        ) : (
          <DataTable
            headers={[
              "Thời gian",
              "Người thực hiện",
              "Phạm vi",
              "Hành động",
              "Đối tượng",
              "Kết quả"
            ]}
            rows={rows.map((log) => [
              log.time,
              <b>{log.actor}</b>,
              log.scope,
              log.action,
              log.target,
              <Badge tone={log.result === "Thành công" ? "green" : "red"}>
                {log.result}
              </Badge>
            ])}
          />
        )}
        <div className="flex items-center justify-end gap-2 border-t border-[#edf1f0] p-4 text-[11px] text-[#829591]">
          <span>
            {total === 0 ? 0 : (page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} trong số {total}
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
      </Card>
      <div className="mt-4 rounded-md bg-[#e7f1fa] p-3 text-xs text-[#3778a9]">
        Nhật ký được lưu tối thiểu 12 tháng và không thể sửa hoặc xóa.
      </div>
    </>
  )
}

export function Support({ notify }: { notify: (message: string) => void }) {
  return (
    <>
      <Heading
        title="Hỗ trợ kỹ thuật"
        description="Truy cập doanh nghiệp với quyền chỉ đọc để hỗ trợ xử lý sự cố."
      />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.8fr]">
        <Card className="p-6">
          <h2 className="mb-5 font-bold">Bắt đầu phiên hỗ trợ</h2>
          <div className="space-y-5">
            <Field label="Doanh nghiệp" value="Mộc Store · TH0001" required />
            <label className="block text-xs font-bold">
              Lý do truy cập *
              <textarea
                className="input mt-2 min-h-28"
                defaultValue="Kiểm tra trạng thái đồng bộ đơn hàng từ Shopee"
              />
            </label>
            <Button onClick={() => notify("Đã bắt đầu phiên hỗ trợ chỉ đọc")}>
              Bắt đầu phiên chỉ đọc
            </Button>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-bold">Phạm vi truy cập</h2>
          <Badge className="mt-4">Chỉ đọc</Badge>
          <ul className="mt-5 space-y-3 text-xs">
            <li>✓ Xem thông tin chi tiết và cấu hình</li>
            <li>✓ Xem nhật ký, job lỗi và tích hợp</li>
            <li>✓ Ghi nhận toàn bộ phiên hỗ trợ</li>
            <li className="text-[#c65248]">
              × Không sửa, xóa hoặc tạo dữ liệu
            </li>
          </ul>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="p-5">
          <h2 className="font-bold">Lịch sử phiên hỗ trợ</h2>
        </div>
        <DataTable
          headers={[
            "Phiên",
            "Doanh nghiệp",
            "Người hỗ trợ",
            "Bắt đầu",
            "Kết thúc",
            "Trạng thái"
          ]}
          rows={[
            [
              "SES-0024",
              "Mộc Store",
              "Lan Anh",
              "25/10 · 14:02",
              "14:28",
              "Đã kết thúc"
            ],
            [
              "SES-0023",
              "Lá Xanh Market",
              "Lan Anh",
              "24/10 · 10:15",
              "10:42",
              "Đã kết thúc"
            ]
          ]}
        />
      </Card>
    </>
  )
}

export function SettingsPage({
  notify
}: {
  notify: (message: string) => void
}) {
  const [tab, setTab] = useState<"general" | "security" | "email">("general")
  const query = useQuery(adminQueryOptions.settings())
  const mutation = useAdminMutation(adminMutationOptions.updateSettings(), [
    adminMutationKeys.settings
  ])
  if (query.isLoading)
    return (
      <>
        <Heading
          title="Cấu hình hệ thống"
          description="Quản lý thiết lập chung áp dụng cho nền tảng."
        />
        <Card className="p-6 text-xs text-[#829591]">Đang tải cấu hình...</Card>
      </>
    )
  if (query.isError || !query.data)
    return (
      <>
        <Heading
          title="Cấu hình hệ thống"
          description="Quản lý thiết lập chung áp dụng cho nền tảng."
        />
        <Card className="p-6 text-xs text-[#c65248]">
          Không thể tải cấu hình hệ thống.
        </Card>
      </>
    )
  const settings = query.data
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await mutation.mutateAsync({
        ...settings,
        platformName: String(form.get("platformName") ?? settings.platformName),
        supportEmail: String(form.get("supportEmail") ?? settings.supportEmail),
        timezone: String(form.get("timezone") ?? settings.timezone),
        dateFormat: String(form.get("dateFormat") ?? settings.dateFormat),
        currency: String(form.get("currency") ?? settings.currency),
        language: String(form.get("language") ?? settings.language),
        loginLockPolicy: String(
          form.get("loginLockPolicy") ?? settings.loginLockPolicy
        ),
        resetLinkPolicy: String(
          form.get("resetLinkPolicy") ?? settings.resetLinkPolicy
        ),
        auditRetention: String(
          form.get("auditRetention") ?? settings.auditRetention
        ),
        emailSender: String(form.get("emailSender") ?? settings.emailSender),
        emailReplyTo: String(form.get("emailReplyTo") ?? settings.emailReplyTo),
        emailFooter: String(form.get("emailFooter") ?? settings.emailFooter)
      })
      notify("Đã lưu cấu hình hệ thống")
    } catch {
      notify("Không thể lưu cấu hình hệ thống")
    }
  }
  const tabs = [
    ["general", "Thiết lập chung"],
    ["security", "Xác thực & bảo mật"],
    ["email", "Email & thông báo"]
  ] as const
  return (
    <>
      <Heading
        title="Cấu hình hệ thống"
        description="Quản lý thiết lập chung áp dụng cho nền tảng."
      />
      <div className="mb-5 flex gap-5 border-b border-[#dfe7e5] text-xs">
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setTab(key)}
            className={
              tab === key
                ? "border-b-2 border-[#00876a] px-2 pb-3 font-bold text-[#00876a]"
                : "px-2 pb-3 text-[#829591]"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        {tab === "general" && (
          <div className="grid gap-2 lg:grid-cols-[1.4fr_.8fr]">
            <Card className="p-3">
              <h2 className="mb-5 font-bold">Thông tin nền tảng</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <Field
                    name="platformName"
                    label="Tên nền tảng"
                    value={settings.platformName}
                    required
                  />
                </label>
                <label className="sm:col-span-2">
                  <Field
                    name="supportEmail"
                    label="Email hỗ trợ"
                    value={settings.supportEmail}
                    required
                  />
                </label>
                <Field
                  name="timezone"
                  label="Múi giờ"
                  value={settings.timezone}
                />
                <Field
                  name="dateFormat"
                  label="Định dạng ngày"
                  value={settings.dateFormat}
                />
                <Field
                  name="currency"
                  label="Đơn vị tiền tệ mặc định"
                  value={settings.currency}
                />
                <Field
                  name="language"
                  label="Ngôn ngữ mặc định"
                  value={settings.language}
                />
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="font-bold">Phạm vi áp dụng</h2>
              <p className="mt-4 text-xs leading-5 text-[#829591]">
                Các thiết lập này được dùng chung cho toàn bộ nền tảng và sẽ
                được lưu qua API quản trị.
              </p>
            </Card>
          </div>
        )}
        {tab === "security" && (
          <Card className="p-6">
            <h2 className="mb-3 font-bold">Xác thực & bảo mật</h2>
            <div className="space-y-5">
              <label className="block text-xs font-bold">
                Khóa đăng nhập tạm thời
                <textarea
                  name="loginLockPolicy"
                  className="input mt-2 min-h-20"
                  defaultValue={settings.loginLockPolicy}
                />
              </label>
              <label className="block text-xs font-bold">
                Liên kết đặt lại mật khẩu
                <textarea
                  name="resetLinkPolicy"
                  className="input mt-2 min-h-20"
                  defaultValue={settings.resetLinkPolicy}
                />
              </label>
              <label className="block text-xs font-bold">
                Nhật ký hoạt động
                <textarea
                  name="auditRetention"
                  className="input mt-2 min-h-20"
                  defaultValue={settings.auditRetention}
                />
              </label>
            </div>
          </Card>
        )}
        {tab === "email" && (
          <Card className="p-6">
            <h2 className="mb-5 font-bold">Email & thông báo</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                name="emailSender"
                label="Tên người gửi"
                value={settings.emailSender}
              />
              <Field
                name="emailReplyTo"
                label="Email phản hồi"
                value={settings.emailReplyTo}
              />
              <label className="block text-xs font-bold sm:col-span-2">
                Chân trang email
                <textarea
                  name="emailFooter"
                  className="input mt-2 min-h-20"
                  defaultValue={settings.emailFooter}
                />
              </label>
            </div>
          </Card>
        )}
        <div className="mt-3 flex justify-end">
          <Button type="submit">
            {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </form>
    </>
  )
}
