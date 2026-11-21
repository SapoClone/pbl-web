import { type FormEvent, useMemo, useState } from "react"
import {
  CheckCircle2,
  Pencil,
  Percent,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AnimatedSwitch,
  CopyCodeBadge,
  KpiStatCard
} from "@/components/ui/micro-ux"
import { useToast } from "@/components/ui/toast"
import {
  createCustomerGroup,
  deleteCustomerGroup,
  updateCustomerGroup,
  type CustomerGroupItem
} from "@/api/customer/crm"

type GroupDraft = {
  code: string
  name: string
  description: string
  defaultDiscountRate: string
}

const emptyDraft: GroupDraft = {
  code: "",
  name: "",
  description: "",
  defaultDiscountRate: "0"
}

const inputCls =
  "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

export function CustomerGroupsPanel({
  isDemo,
  groups,
  onGroupsChange,
  onRefresh
}: {
  isDemo: boolean
  groups: CustomerGroupItem[]
  onGroupsChange: (updater: (prev: CustomerGroupItem[]) => CustomerGroupItem[]) => void
  onRefresh: () => Promise<void>
}) {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerGroupItem | null>(null)
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter((g) => {
      const matchSearch =
        !q ||
        `${g.code} ${g.name} ${g.description ?? ""}`.toLowerCase().includes(q)
      const matchStatus = statusFilter === "ALL" || g.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [groups, search, statusFilter])

  const stats = useMemo(() => {
    const activeCount = groups.filter((g) => g.status === "ACTIVE").length
    const totalAssigned = groups.reduce(
      (sum, g) => sum + Number(g.customerCount ?? 0),
      0
    )
    const maxDiscount = groups.reduce(
      (max, g) => Math.max(max, Number(g.defaultDiscountRate ?? 0)),
      0
    )
    return { activeCount, totalAssigned, maxDiscount }
  }, [groups])

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft)
    setFormError("")
    setModalOpen(true)
  }

  const openEdit = (group: CustomerGroupItem) => {
    setEditing(group)
    setDraft({
      code: group.code,
      name: group.name,
      description: group.description ?? "",
      defaultDiscountRate: String(Number(group.defaultDiscountRate ?? 0))
    })
    setFormError("")
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError("")
    const trimmedName = draft.name.trim()
    const rate = Number(draft.defaultDiscountRate || 0)

    if (!trimmedName) {
      setFormError("Vui lòng nhập tên nhóm khách hàng.")
      return
    }
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setFormError("Tỷ lệ chiết khấu mặc định phải từ 0% đến 100%.")
      return
    }

    setSaving(true)
    try {
      if (editing) {
        if (!isDemo) {
          const updated = await updateCustomerGroup(editing.id, {
            name: trimmedName,
            description: draft.description.trim() || undefined,
            defaultDiscountRate: rate
          })
          onGroupsChange((prev) =>
            prev.map((g) =>
              g.id === editing.id
                ? { ...g, ...updated, customerCount: g.customerCount }
                : g
            )
          )
          await onRefresh()
        } else {
          onGroupsChange((prev) =>
            prev.map((g) =>
              g.id === editing.id
                ? {
                    ...g,
                    name: trimmedName,
                    description: draft.description.trim() || null,
                    defaultDiscountRate: rate
                  }
                : g
            )
          )
        }
        toast({
          title: "Đã cập nhật nhóm khách hàng",
          description: `Nhóm "${trimmedName}" đang áp dụng chiết khấu mặc định ${rate}%.`,
          variant: "success"
        })
      } else {
        const cleanCode =
          draft.code.trim().toUpperCase() ||
          `GRP-${String(groups.length + 1).padStart(3, "0")}`

        if (!isDemo) {
          const created = await createCustomerGroup({
            code: draft.code.trim() ? cleanCode : undefined,
            name: trimmedName,
            description: draft.description.trim() || undefined,
            defaultDiscountRate: rate
          })
          onGroupsChange((prev) => [...prev, { ...created, customerCount: 0 }])
          await onRefresh()
        } else {
          onGroupsChange((prev) => [
            ...prev,
            {
              id: `grp-${Date.now()}`,
              code: cleanCode,
              name: trimmedName,
              description: draft.description.trim() || null,
              defaultDiscountRate: rate,
              status: "ACTIVE",
              customerCount: 0,
              isSeeded: false
            }
          ])
        }
        toast({
          title: "Đã tạo nhóm khách hàng mới",
          description: `Nhóm "${trimmedName}" (${cleanCode}) đã sẵn sàng phân loại & áp khuyến mãi.`,
          variant: "success"
        })
      }
      setModalOpen(false)
    } catch {
      setFormError(
        "Không thể lưu nhóm khách hàng (tên hoặc mã nhóm có thể đã tồn tại)."
      )
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (group: CustomerGroupItem) => {
    const nextStatus = group.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      if (!isDemo) {
        await updateCustomerGroup(group.id, {
          status: nextStatus,
          forceDeactivate: nextStatus === "INACTIVE"
        })
        await onRefresh()
      }
      onGroupsChange((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, status: nextStatus } : g))
      )
      toast({
        title:
          nextStatus === "ACTIVE"
            ? `Đã kích hoạt nhóm ${group.name}`
            : `Đã tạm ngưng nhóm ${group.name}`,
        variant: "info"
      })
    } catch {
      toast({
        title: "Không thể đổi trạng thái nhóm",
        description: "Vui lòng kiểm tra khách hàng đang thuộc nhóm này.",
        variant: "error"
      })
    }
  }

  const handleDelete = async (group: CustomerGroupItem) => {
    if (group.isSeeded) {
      toast({
        title: "Nhóm mặc định hệ thống",
        description: "Không thể xóa nhóm khởi tạo sẵn, bạn có thể tạm ngưng nếu không dùng.",
        variant: "warning"
      })
      return
    }
    if (Number(group.customerCount ?? 0) > 0) {
      toast({
        title: "Nhóm đang có khách hàng",
        description: "Vui lòng chuyển khách hàng sang nhóm khác trước khi xóa.",
        variant: "warning"
      })
      return
    }
    if (!window.confirm(`Xóa vĩnh viễn nhóm khách hàng "${group.name}"?`)) {
      return
    }

    try {
      if (!isDemo) {
        await deleteCustomerGroup(group.id)
        await onRefresh()
      }
      onGroupsChange((prev) => prev.filter((g) => g.id !== group.id))
      toast({
        title: "Đã xóa nhóm khách hàng",
        description: `Nhóm ${group.code} đã được gỡ khỏi danh mục.`,
        variant: "success"
      })
    } catch {
      toast({
        title: "Không thể xóa nhóm khách hàng",
        description: "Nhóm có thể đang được tham chiếu bởi hồ sơ khách hàng.",
        variant: "error"
      })
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiStatCard
          label="Tổng nhóm phân loại"
          value={groups.length}
          hint="Áp dụng cho cả POS, Web & Sàn"
          icon={Users}
          tone="emerald"
        />
        <KpiStatCard
          label="Nhóm đang hoạt động"
          value={stats.activeCount}
          hint="Sẵn sàng gắn vào chương trình KM"
          icon={CheckCircle2}
          tone="sky"
        />
        <KpiStatCard
          label="Khách hàng đã phân nhóm"
          value={stats.totalAssigned}
          hint="Đồng bộ tự động chính sách giá"
          icon={ShieldCheck}
          tone="indigo"
        />
        <KpiStatCard
          label="Chiết khấu nhóm cao nhất"
          value={`${stats.maxDiscount}%`}
          hint="Ưu đãi mặc định theo nhóm B2B / VIP"
          icon={Percent}
          tone="amber"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã nhóm, tên nhóm (VIP, Đại lý, B2B)..."
                className="w-full text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === st
                      ? "bg-[#16866f] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL"
                    ? "Tất cả"
                    : st === "ACTIVE"
                      ? "Đang bật"
                      : "Tạm ngưng"}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={openCreate}
            className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            <Plus size={16} />
            Tạo nhóm khách hàng
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Mã nhóm</th>
                <th className="px-5 py-3 font-semibold">Tên nhóm & Mô tả</th>
                <th className="px-5 py-3 font-semibold">Chiết khấu mặc định</th>
                <th className="px-5 py-3 font-semibold">Số khách hàng</th>
                <th className="px-5 py-3 font-semibold">Trạng thái</th>
                <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((group) => {
                const discount = Number(group.defaultDiscountRate ?? 0)
                return (
                  <tr key={group.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <CopyCodeBadge
                        code={group.code}
                        variant="mono"
                        onCopied={(c) =>
                          toast({
                            title: `Đã sao chép mã nhóm ${c}`,
                            variant: "info"
                          })
                        }
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#163d36]">
                          {group.name}
                        </span>
                        {group.isSeeded ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            Mặc định
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {group.description || "Không có ghi chú chính sách."}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {discount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-[#e6f5ee] px-2.5 py-0.5 text-xs font-semibold text-[#147853]">
                          Giảm {discount}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Giá niêm yết (0%)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold tabular-nums text-[#163d36]">
                        {Number(group.customerCount ?? 0).toLocaleString("vi-VN")}
                      </span>{" "}
                      <span className="text-xs text-slate-400">khách</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <AnimatedSwitch
                          checked={group.status === "ACTIVE"}
                          onChange={() => void handleToggleStatus(group)}
                          label={`Bật/tắt nhóm ${group.name}`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            group.status === "ACTIVE"
                              ? "text-[#147853]"
                              : "text-slate-400"
                          }`}
                        >
                          {group.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Chỉnh sửa nhóm"
                        onClick={() => openEdit(group)}
                        className="text-slate-400 hover:text-[#16866f]"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Xóa nhóm"
                        onClick={() => void handleDelete(group)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">
              Chưa có nhóm khách hàng nào khớp bộ lọc hiện tại.
            </p>
          ) : null}
        </div>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#163d36]/35 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#163d36]">
                  {editing
                    ? "Chỉnh sửa nhóm khách hàng"
                    : "Tạo nhóm khách hàng mới"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Nhóm khách hàng được liên kết trực tiếp với Khuyến mãi & Bảng giá.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600">
                  Mã nhóm (Tự sinh nếu để trống)
                  <input
                    disabled={Boolean(editing)}
                    placeholder="VD: VIP-GOLD, B2B-NORTH"
                    className={`${inputCls} font-mono uppercase disabled:bg-slate-50`}
                    value={draft.code}
                    onChange={(e) =>
                      setDraft({ ...draft, code: e.target.value.toUpperCase() })
                    }
                  />
                </label>

                <label className="block text-xs font-medium text-slate-600">
                  Chiết khấu mặc định (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    className={inputCls}
                    value={draft.defaultDiscountRate}
                    onChange={(e) =>
                      setDraft({ ...draft, defaultDiscountRate: e.target.value })
                    }
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-600">
                Tên nhóm khách hàng *
                <input
                  required
                  placeholder="VD: Khách VIP OmniClub, Đại lý Miền Bắc..."
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>

              <label className="block text-xs font-medium text-slate-600">
                Mô tả điều kiện / quyền lợi nhóm
                <textarea
                  rows={3}
                  placeholder="Mô tả tiêu chí xếp nhóm hoặc ưu đãi đi kèm..."
                  className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>

              {formError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {formError}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#16866f] text-white hover:bg-[#0f705d]"
              >
                {saving
                  ? "Đang lưu..."
                  : editing
                    ? "Lưu cập nhật"
                    : "Tạo nhóm"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
