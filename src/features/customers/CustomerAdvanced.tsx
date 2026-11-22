import { useEffect, useState, type FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { getCustomer, updateCustomer } from "@/api/customer/customers"
import {
  adjustCustomerLoyalty,
  assignCustomerGroup,
  createCustomerGroup,
  createCustomerTag,
  deleteCustomerGroup,
  findDuplicateCustomers,
  getCustomerLoyalty,
  getCustomerImportTemplate,
  listCustomerGroups,
  listCustomerLoyaltyTransactions,
  listCustomerOrders,
  listCustomerTags,
  mergeCustomers,
  updateCustomerGroup,
  type CustomerGroup,
  type DuplicateGroup,
  type ImportResult
} from "@/api/customer/advanced"

const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f]"

export function CustomerDetailsDialog({ customerId, isDemo, onClose }: { customerId: string; isDemo: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"profile" | "orders" | "loyalty">("profile")
  const [ordersPage, setOrdersPage] = useState(1)
  const [loyaltyPage, setLoyaltyPage] = useState(1)
  const [groupId, setGroupId] = useState("")
  const [tagIds, setTagIds] = useState<string[]>([])
  const [segmentError, setSegmentError] = useState("")
  const [segmentSaving, setSegmentSaving] = useState(false)
  const [adjustment, setAdjustment] = useState({ points: "", reason: "" })
  const [loyaltyError, setLoyaltyError] = useState("")
  const [loyaltySaving, setLoyaltySaving] = useState(false)
  const queryClient = useQueryClient()
  const customerQuery = useQuery({ queryKey: ["customer-detail", customerId], queryFn: () => getCustomer(customerId), enabled: !isDemo })
  const groupsQuery = useQuery({ queryKey: ["customer-groups"], queryFn: listCustomerGroups, enabled: !isDemo })
  const tagsQuery = useQuery({ queryKey: ["customer-tags"], queryFn: listCustomerTags, enabled: !isDemo })
  const ordersQuery = useQuery({ queryKey: ["customer-orders", customerId, ordersPage], queryFn: () => listCustomerOrders(customerId, ordersPage), enabled: !isDemo && tab === "orders" })
  const loyaltyQuery = useQuery({ queryKey: ["customer-loyalty", customerId], queryFn: () => getCustomerLoyalty(customerId), enabled: !isDemo && tab === "loyalty" })
  const transactionsQuery = useQuery({ queryKey: ["customer-loyalty-transactions", customerId, loyaltyPage], queryFn: () => listCustomerLoyaltyTransactions(customerId, loyaltyPage), enabled: !isDemo && tab === "loyalty" })
  const customer = isDemo ? null : customerQuery.data

  useEffect(() => {
    if (!customer) return
    setGroupId(customer.customerGroupId ?? "")
    setTagIds(customer.tags?.map((tag) => tag.id) ?? [])
  }, [customer])

  const saveSegments = async () => {
    if (!customer) return
    setSegmentError("")
    setSegmentSaving(true)
    try {
      if ((customer.customerGroupId ?? "") !== groupId) await assignCustomerGroup(customer.id, groupId || null)
      const refreshed = await getCustomer(customer.id)
      await updateCustomer(customer.id, { version: refreshed.version, tagIds })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-detail", customerId] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-groups"] })
      ])
    } catch (error) {
      setSegmentError(apiError(error))
    } finally {
      setSegmentSaving(false)
    }
  }

  const submitAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!customer) return
    const points = Number(adjustment.points)
    if (!Number.isInteger(points) || points === 0 || adjustment.reason.trim().length < 3) {
      setLoyaltyError("Nhập số điểm khác 0 và lý do ít nhất 3 ký tự.")
      return
    }
    setLoyaltySaving(true)
    setLoyaltyError("")
    try {
      await adjustCustomerLoyalty(customer.id, points, adjustment.reason.trim())
      setAdjustment({ points: "", reason: "" })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-loyalty", customerId] }),
        queryClient.invalidateQueries({ queryKey: ["customer-loyalty-transactions", customerId] }),
        queryClient.invalidateQueries({ queryKey: ["customer-detail", customerId] })
      ])
    } catch (error) {
      setLoyaltyError(apiError(error))
    } finally {
      setLoyaltySaving(false)
    }
  }

  return <Overlay onClose={onClose} wide><section className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl"><DialogHeader title={customer?.name ?? "Hồ sơ khách hàng"} onClose={onClose} />
    {isDemo ? <p className="mt-5 text-sm text-slate-500">Các chức năng nâng cao chỉ khả dụng khi kết nối dữ liệu thật.</p> : customerQuery.isLoading ? <p className="mt-5 text-sm text-slate-500">Đang tải hồ sơ...</p> : customerQuery.isError ? <p role="alert" className="mt-5 text-sm text-red-600">{apiError(customerQuery.error)}</p> : customer && <>
      <nav className="mt-5 flex gap-2 border-b border-slate-100">{([["profile", "Hồ sơ & phân nhóm"], ["orders", "Lịch sử đơn"], ["loyalty", "Tích điểm"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`border-b-2 px-3 py-2 text-sm ${tab === id ? "border-[#16866f] font-semibold text-[#16866f]" : "border-transparent text-slate-500"}`}>{label}</button>)}</nav>
      {tab === "profile" && <div className="mt-5 grid gap-5 md:grid-cols-2"><div className="space-y-2 text-sm text-slate-600"><p><b>Mã khách:</b> {customer.code}</p><p><b>Điện thoại:</b> {customer.phone ?? customer.phoneMasked ?? "—"}</p><p><b>Email:</b> {customer.email ?? "—"}</p><p><b>Ngày sinh:</b> {(customer.dateOfBirth ?? customer.dob)?.slice(0, 10) ?? "—"}</p><p><b>Địa chỉ:</b> {customer.addresses?.find((a) => a.isDefault)?.addressLine ?? customer.addresses?.[0]?.addressLine ?? "—"}</p><p><b>Ghi chú:</b> {customer.note ?? "—"}</p><p><b>Loyalty:</b> {customer.loyaltyPoints ?? 0} điểm</p></div><div className="space-y-4"><label className="block text-xs font-medium text-slate-600">Nhóm khách<select className={inputClass} value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Không thuộc nhóm</option>{(groupsQuery.data ?? []).filter((group) => group.status === "ACTIVE").map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><fieldset className="rounded-lg border border-slate-200 p-3"><legend className="px-1 text-xs font-medium text-slate-600">Thẻ khách hàng</legend><div className="mt-1 flex max-h-36 flex-wrap gap-2 overflow-auto">{(tagsQuery.data ?? []).map((tag) => <label key={tag.id} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1.5 text-xs"><input type="checkbox" checked={tagIds.includes(tag.id)} onChange={(event) => setTagIds((current) => event.target.checked ? [...current, tag.id] : current.filter((id) => id !== tag.id))} />{tag.name}</label>)}{tagsQuery.data?.length === 0 && <span className="text-xs text-slate-400">Chưa có thẻ nào.</span>}</div></fieldset>{segmentError && <p role="alert" className="text-sm text-red-600">{segmentError}</p>}<Button type="button" disabled={segmentSaving} onClick={() => void saveSegments()} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{segmentSaving ? "Đang lưu..." : "Lưu nhóm và thẻ"}</Button></div></div>}
      {tab === "orders" && <div className="mt-5 overflow-x-auto">{ordersQuery.isLoading ? <p className="text-sm text-slate-500">Đang tải lịch sử đơn...</p> : ordersQuery.isError ? <p role="alert" className="text-sm text-red-600">{apiError(ordersQuery.error)}</p> : <><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-slate-400"><tr>{["Mã đơn", "Kênh", "Trạng thái", "Giá trị", "Ngày"].map((label) => <th key={label} className="border-b px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{ordersQuery.data?.items.map((order) => <tr key={order.id}><td className="border-b p-3 font-medium">{order.orderCode}</td><td className="border-b p-3">{order.channelType}</td><td className="border-b p-3">{order.orderStatus}</td><td className="border-b p-3">{order.originalOrderTotal.toLocaleString("vi-VN")} ₫</td><td className="border-b p-3">{new Date(order.completedAt).toLocaleDateString("vi-VN")}</td></tr>)}</tbody></table>{ordersQuery.data?.items.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Chưa có đơn hàng trong lịch sử.</p>}{(ordersQuery.data?.total ?? 0) > 10 && <PageButtons page={ordersPage} pages={Math.ceil((ordersQuery.data?.total ?? 0) / 10)} loading={ordersQuery.isFetching} onPage={setOrdersPage} />}</>}</div>}
      {tab === "loyalty" && <div className="mt-5 space-y-5"><div className="grid gap-3 sm:grid-cols-3">{[["Khả dụng", loyaltyQuery.data?.availablePoints], ["Đang giữ", loyaltyQuery.data?.heldPoints], ["Tích lũy", loyaltyQuery.data?.lifetimeEarnedPoints]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-[#163d36]">{typeof value === "number" ? value.toLocaleString("vi-VN") : loyaltyQuery.isLoading ? "…" : "—"}</p></div>)}</div>{loyaltyQuery.isError && <p role="alert" className="text-sm text-red-600">{apiError(loyaltyQuery.error)}</p>}<form onSubmit={(event) => void submitAdjustment(event)} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[140px_1fr_auto]"><input type="number" step="1" className={inputClass} placeholder="± số điểm" value={adjustment.points} onChange={(event) => setAdjustment((value) => ({ ...value, points: event.target.value }))} /><input required minLength={3} className={inputClass} placeholder="Lý do điều chỉnh" value={adjustment.reason} onChange={(event) => setAdjustment((value) => ({ ...value, reason: event.target.value }))} /><Button type="submit" disabled={loyaltySaving} className="bg-[#16866f] text-white">{loyaltySaving ? "Đang lưu..." : "Điều chỉnh"}</Button></form>{loyaltyError && <p role="alert" className="text-sm text-red-600">{loyaltyError}</p>}<div><h3 className="mb-2 text-sm font-semibold text-[#163d36]">Giao dịch điểm</h3>{transactionsQuery.isLoading ? <p className="text-sm text-slate-500">Đang tải giao dịch...</p> : transactionsQuery.data?.data.length ? <div className="divide-y divide-slate-100">{transactionsQuery.data.data.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 py-2 text-sm"><div><p className="font-medium">{transaction.type}{transaction.orderCode ? ` · ${transaction.orderCode}` : ""}</p><p className="text-xs text-slate-400">{transaction.reason || new Date(transaction.createdAt).toLocaleString("vi-VN")}</p></div><span className={transaction.points >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{transaction.points > 0 ? "+" : ""}{transaction.points}</span></div>)}</div> : <p className="text-sm text-slate-500">Chưa có giao dịch điểm.</p>}{(transactionsQuery.data?.pagination.totalPages ?? 0) > 1 && <PageButtons page={loyaltyPage} pages={transactionsQuery.data?.pagination.totalPages ?? 1} loading={transactionsQuery.isFetching} onPage={setLoyaltyPage} />}</div></div>}
    </>}
  </section></Overlay>
}

export function CustomerSegmentsDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"groups" | "tags">("groups")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const groupsQuery = useQuery({ queryKey: ["customer-groups"], queryFn: listCustomerGroups })
  const tagsQuery = useQuery({ queryKey: ["customer-tags"], queryFn: listCustomerTags })

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      if (tab === "groups") await createCustomerGroup({ name: name.trim(), description: description.trim() || undefined })
      else await createCustomerTag(name.trim())
      setName("")
      setDescription("")
      await queryClient.invalidateQueries({ queryKey: tab === "groups" ? ["customer-groups"] : ["customer-tags"] })
    } catch (error) {
      setError(apiError(error))
    } finally {
      setSaving(false)
    }
  }

  const toggleGroup = async (group: CustomerGroup) => {
    try {
      const deactivating = group.status === "ACTIVE"
      const forceDeactivate = deactivating && group.customerCount > 0
      if (forceDeactivate && !window.confirm(`Nhóm này đang có ${group.customerCount} khách. Tắt nhóm sẽ giữ nguyên các khách đang được gán vào nhóm. Tiếp tục?`)) return
      await updateCustomerGroup(group.id, { status: deactivating ? "INACTIVE" : "ACTIVE", ...(forceDeactivate ? { forceDeactivate: true } : {}) })
      await queryClient.invalidateQueries({ queryKey: ["customer-groups"] })
    } catch (error) { setError(apiError(error)) }
  }
  const removeGroup = async (group: CustomerGroup) => {
    if (!window.confirm(`Xóa nhóm ${group.name}? Chỉ xóa được nhóm rỗng.`)) return
    try {
      await deleteCustomerGroup(group.id)
      await queryClient.invalidateQueries({ queryKey: ["customer-groups"] })
    } catch (error) { setError(apiError(error)) }
  }

  return <Overlay onClose={onClose} wide><section className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl"><DialogHeader title="Quản lý nhóm và thẻ" onClose={onClose} /><nav className="mt-4 flex gap-2">{([["groups", "Nhóm khách"], ["tags", "Thẻ khách"]] as const).map(([id, label]) => <Button key={id} type="button" variant={tab === id ? "default" : "outline"} onClick={() => setTab(id)}>{label}</Button>)}</nav><form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input required className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder={tab === "groups" ? "Tên nhóm" : "Tên thẻ"} />{tab === "groups" ? <input className={inputClass} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả (tùy chọn)" /> : <div /> }<Button disabled={saving} className="bg-[#16866f] text-white">Thêm</Button></form>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-4 max-h-[50vh] divide-y divide-slate-100 overflow-auto">{tab === "groups" ? (groupsQuery.data ?? []).map((group) => <div key={group.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{group.name} <span className="text-xs text-slate-400">{group.code}</span></p><p className="text-xs text-slate-500">{group.customerCount} khách · {group.status}{group.isSeeded ? " · mặc định" : ""}</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void toggleGroup(group)}>{group.status === "ACTIVE" ? "Tắt" : "Kích hoạt"}</Button>{!group.isSeeded && group.customerCount === 0 && <Button type="button" variant="outline" size="sm" onClick={() => void removeGroup(group)}>Xóa</Button>}</div></div>) : (tagsQuery.data ?? []).map((tag) => <p key={tag.id} className="py-3 text-sm">{tag.name}</p>)}</div></section></Overlay>
}

export function CustomerImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const run = async (dryRun: boolean) => {
    if (!file) { setError("Chọn tệp CSV trước."); return }
    setBusy(true)
    setError("")
    try {
      const response = await (await import("@/api/customer/advanced")).importCustomersCsv(file, dryRun)
      setResult(response)
      if (!dryRun) onImported()
    } catch (error) { setError(apiError(error)) }
    finally { setBusy(false) }
  }
  const downloadTemplate = async () => {
    try { downloadBlob(await getCustomerImportTemplate(), "mau-nhap-khach-hang.csv") }
    catch (error) { setError(apiError(error)) }
  }
  return <Overlay onClose={onClose}><section className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"><DialogHeader title="Nhập khách hàng từ CSV" onClose={onClose} /><p className="mt-3 text-sm text-slate-500">Tệp CSV tối đa 5 MB, tối đa 5.000 dòng. Cột bắt buộc: name.</p><Button type="button" variant="outline" className="mt-3" onClick={() => void downloadTemplate()}>Tải mẫu CSV</Button><input type="file" accept=".csv,text/csv" className="mt-4 block w-full text-sm" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null) }} />{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}{result && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><p>{result.total} dòng · {result.created} tạo · {result.updated} cập nhật · {result.failed} lỗi</p>{result.errors.slice(0, 8).map((item, index) => <p key={`${item.row}-${index}`} className="mt-1 text-xs text-red-600">Dòng {item.row}: {item.field} — {item.code}</p>)}</div>}<div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy || !file} onClick={() => void run(true)}>Kiểm tra</Button><Button type="button" disabled={busy || !file} onClick={() => void run(false)} className="bg-[#16866f] text-white">{busy ? "Đang xử lý..." : "Nhập dữ liệu"}</Button></div></section></Overlay>
}

export function CustomerDuplicatesDialog({ onClose, onMerged }: { onClose: () => void; onMerged: () => void }) {
  const [selected, setSelected] = useState<DuplicateGroup | null>(null)
  const [sourceId, setSourceId] = useState("")
  const [targetId, setTargetId] = useState("")
  const [reason, setReason] = useState("Hồ sơ trùng lặp")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const duplicateQuery = useQuery({ queryKey: ["customer-duplicates"], queryFn: findDuplicateCustomers })
  const candidatesQuery = useQuery({ queryKey: ["duplicate-candidates", selected?.customerIds], queryFn: async () => Promise.all((selected?.customerIds ?? []).map(getCustomer)), enabled: Boolean(selected) })
  const merge = async () => {
    if (!sourceId || !targetId || sourceId === targetId) { setError("Chọn hai hồ sơ khác nhau."); return }
    if (!window.confirm("Hợp nhất hồ sơ nguồn vào hồ sơ đích? Thao tác này không thể hoàn tác.")) return
    setBusy(true)
    setError("")
    try {
      await mergeCustomers(sourceId, targetId, reason)
      setSelected(null)
      onMerged()
    } catch (error) { setError(apiError(error)) }
    finally { setBusy(false) }
  }
  return <Overlay onClose={onClose} wide><section className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl"><DialogHeader title="Phát hiện và gộp hồ sơ trùng" onClose={onClose} /><p className="mt-2 text-xs text-slate-500">Trùng tên chỉ là gợi ý; hãy kiểm tra kỹ trước khi gộp. Hồ sơ nguồn sẽ được đưa vào hồ sơ đích.</p>{duplicateQuery.isLoading ? <p className="mt-5 text-sm text-slate-500">Đang dò trùng...</p> : duplicateQuery.isError ? <p role="alert" className="mt-5 text-sm text-red-600">{apiError(duplicateQuery.error)}</p> : <div className="mt-4 max-h-[50vh] divide-y divide-slate-100 overflow-auto">{duplicateQuery.data?.items.map((group, index) => <div key={`${group.matchType}-${group.matchValue}-${index}`} className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">{group.matchType === "EMAIL" ? "Trùng email" : "Trùng tên"}: {group.matchValue}</p><p className="text-xs text-slate-500">{group.count} hồ sơ</p></div><Button type="button" variant="outline" size="sm" onClick={() => { setSelected(group); setSourceId(""); setTargetId(""); setError("") }}>Chọn để gộp</Button></div>)}{duplicateQuery.data?.total === 0 && <p className="py-8 text-center text-sm text-slate-500">Không tìm thấy hồ sơ trùng.</p>}</div>}
    {selected && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold">Chọn hồ sơ nguồn và hồ sơ đích</p>{candidatesQuery.isLoading ? <p className="mt-2 text-xs">Đang tải hồ sơ...</p> : <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs">Nguồn<select className={inputClass} value={sourceId} onChange={(event) => setSourceId(event.target.value)}><option value="">Chọn hồ sơ sẽ gộp đi</option>{(candidatesQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code} · {item.phoneMasked ?? item.phone ?? "ẩn số"}</option>)}</select></label><label className="text-xs">Đích<select className={inputClass} value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Chọn hồ sơ giữ lại</option>{(candidatesQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code} · {item.phoneMasked ?? item.phone ?? "ẩn số"}</option>)}</select></label></div>}<input className={`${inputClass} mt-3`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do" />{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}<div className="mt-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setSelected(null)}>Hủy</Button><Button type="button" disabled={busy || candidatesQuery.isLoading} onClick={() => void merge()} className="bg-red-600 text-white hover:bg-red-700">{busy ? "Đang gộp..." : "Gộp hồ sơ"}</Button></div></div>}
  </section></Overlay>
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function apiError(error: unknown) {
  if (!axios.isAxiosError(error)) return "Không thể thực hiện thao tác."
  const data = error.response?.data as { message?: string | string[]; errorCode?: string } | undefined
  return (Array.isArray(data?.message) ? data.message.join(" ") : data?.message) || data?.errorCode || "Không thể thực hiện thao tác."
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 pt-12 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>{children}</div>
}

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><h2 className="text-lg font-semibold text-[#163d36]">{title}</h2><button type="button" onClick={onClose} aria-label="Đóng"><X size={19} className="text-slate-400" /></button></header>
}

function PageButtons({ page, pages, loading, onPage }: { page: number; pages: number; loading: boolean; onPage: (page: number) => void }) {
  return <div className="mt-3 flex items-center justify-end gap-2"><span className="mr-2 text-xs text-slate-500">Trang {page} / {pages}</span><Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>Trước</Button><Button type="button" variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => onPage(page + 1)}>Sau</Button></div>
}
