import { type FormEvent, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Check,
  Edit3,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  X
} from "lucide-react"
import {
  type CreatePriceListInput,
  type PriceListApi,
  createPriceList,
  getPriceListById,
  listPriceLists,
  updatePriceList,
  upsertPriceListItems
} from "@/api/catalog/pricing"
import {
  type CatalogVariant as SellableVariant,
  listActiveVariants
} from "@/api/catalog/variants"
import { listBranches } from "@/api/platform/branches"
import { Button } from "@/components/ui/button"
import { SlideOverDrawer } from "@/components/ui/drawer"
import { AnimatedSwitch, ChannelBadge } from "@/components/ui/micro-ux"
import { useToast } from "@/components/ui/toast"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const PRICE_CHANNELS = [
  { value: "POS", label: "POS Tại quầy" },
  { value: "LAZADA", label: "Lazada" },
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK", label: "TikTok Shop" },
  { value: "WEBSITE", label: "Website" }
] as const

const DEMO_VARIANTS: SellableVariant[] = [
  {
    variantId: "55555555-5555-4555-8555-555555555501",
    productId: "66666666-6666-4666-8666-666666666601",
    name: "Bình giữ nhiệt Terra 500ml",
    label: "Xanh Rêu",
    skuCode: "TER-500-GRN",
    barcode: "8938501234001",
    price: 420000,
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555502",
    productId: "66666666-6666-4666-8666-666666666602",
    name: "Túi tote canvas Daily",
    label: "Trắng Kem",
    skuCode: "TOT-DAILY-01",
    barcode: "8938501234002",
    price: 185000,
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555503",
    productId: "66666666-6666-4666-8666-666666666603",
    name: "Cốc gốm thủ công Mộc",
    label: "Men Nâu",
    skuCode: "CER-MOC-08",
    barcode: "8938501234003",
    price: 260000,
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555504",
    productId: "66666666-6666-4666-8666-666666666604",
    name: "Nến thơm Gỗ tuyết tùng",
    label: "200g",
    skuCode: "CAN-CEDAR-02",
    barcode: "8938501234004",
    price: 320000,
    status: "active"
  }
]

const DEMO_PRICE_LISTS: PriceListApi[] = [
  {
    id: "77777777-7777-4777-8777-777777777701",
    name: "Bảng giá Bán lẻ Mặc định (POS & Website)",
    currency: "VND",
    isDefault: true,
    status: "ACTIVE",
    startDate: null,
    endDate: null,
    version: 1,
    branchIds: [],
    channelTypes: ["POS", "WEBSITE"],
    items: [
      {
        id: "77777777-7777-4777-8777-777777777711",
        priceListId: "77777777-7777-4777-8777-777777777701",
        variantId: "55555555-5555-4555-8555-555555555501",
        skuCode: "TER-500-GRN",
        price: 420000,
        version: 1,
        updatedAt: "2026-10-15T08:00:00.000Z"
      },
      {
        id: "77777777-7777-4777-8777-777777777712",
        priceListId: "77777777-7777-4777-8777-777777777701",
        variantId: "55555555-5555-4555-8555-555555555502",
        skuCode: "TOT-DAILY-01",
        price: 185000,
        version: 1,
        updatedAt: "2026-10-15T08:00:00.000Z"
      }
    ],
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-15T08:00:00.000Z"
  },
  {
    id: "77777777-7777-4777-8777-777777777702",
    name: "Bảng giá Sàn TMĐT (Lazada & Shopee +12% bù phí sàn)",
    currency: "VND",
    isDefault: false,
    status: "ACTIVE",
    startDate: "2026-01-01",
    endDate: "2027-12-31",
    version: 2,
    branchIds: [],
    channelTypes: ["LAZADA", "SHOPEE"],
    items: [
      {
        id: "77777777-7777-4777-8777-777777777721",
        priceListId: "77777777-7777-4777-8777-777777777702",
        variantId: "55555555-5555-4555-8555-555555555501",
        skuCode: "TER-500-GRN",
        price: 470000,
        version: 1,
        updatedAt: "2026-10-20T09:00:00.000Z"
      },
      {
        id: "77777777-7777-4777-8777-777777777722",
        priceListId: "77777777-7777-4777-8777-777777777702",
        variantId: "55555555-5555-4555-8555-555555555502",
        skuCode: "TOT-DAILY-01",
        price: 209000,
        version: 1,
        updatedAt: "2026-10-20T09:00:00.000Z"
      },
      {
        id: "77777777-7777-4777-8777-777777777723",
        priceListId: "77777777-7777-4777-8777-777777777702",
        variantId: "55555555-5555-4555-8555-555555555503",
        skuCode: "CER-MOC-08",
        price: 292000,
        version: 1,
        updatedAt: "2026-10-20T09:00:00.000Z"
      }
    ],
    createdAt: "2026-10-10T08:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z"
  },
  {
    id: "77777777-7777-4777-8777-777777777703",
    name: "Bảng giá Ưu đãi Khai trương Chi nhánh Quận 1 (-8%)",
    currency: "VND",
    isDefault: false,
    status: "ACTIVE",
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    version: 1,
    branchIds: ["11111111-1111-4111-8111-111111111101"],
    channelTypes: ["POS"],
    items: [],
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-01T08:00:00.000Z"
  }
]

const formatMoney = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`

const parseApiErr = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message
    if (Array.isArray(msg)) return msg.join(", ")
    if (typeof msg === "string" && msg.trim()) return msg
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function PriceListsPanel() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const isDemo = useStoreAuth((s) => Boolean(s.tokens?.isDemo))

  const [demoLists, setDemoLists] = useState<PriceListApi[]>(DEMO_PRICE_LISTS)

  const priceListsQuery = useQuery({
    queryKey: ["catalog-price-lists"],
    queryFn: listPriceLists,
    enabled: !isDemo
  })

  const variantsQuery = useQuery({
    queryKey: ["catalog-variants"],
    queryFn: listActiveVariants,
    enabled: !isDemo
  })

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: !isDemo
  })

  const priceLists = isDemo ? demoLists : (priceListsQuery.data ?? [])
  const variants = isDemo
    ? DEMO_VARIANTS
    : (variantsQuery.data ?? [])
  const branches: Array<{ id: string; name: string }> = isDemo
    ? [
        { id: "11111111-1111-4111-8111-111111111101", name: "Chi nhánh Quận 1" },
        { id: "11111111-1111-4111-8111-111111111102", name: "Chi nhánh Cầu Giấy" }
      ]
    : (branchesQuery.data?.data ?? []).map((b) => ({ id: b.id, name: b.name }))

  const branchNameById = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches]
  )

  const [search, setSearch] = useState("")
  const [channelFilter, setChannelFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const [formOpen, setFormOpen] = useState(false)
  const [editingList, setEditingList] = useState<PriceListApi | null>(null)
  const [matrixTarget, setMatrixTarget] = useState<PriceListApi | null>(null)

  const filteredLists = useMemo(() => {
    const q = search.trim().toLowerCase()
    return priceLists.filter((pl) => {
      if (q && !pl.name.toLowerCase().includes(q)) return false
      if (statusFilter !== "ALL" && pl.status !== statusFilter) return false
      if (channelFilter !== "ALL") {
        const ch = pl.channelTypes ?? []
        if (ch.length > 0 && !ch.includes(channelFilter)) return false
      }
      return true
    })
  }, [channelFilter, priceLists, search, statusFilter])

  const handleToggleStatus = async (pl: PriceListApi) => {
    const nextStatus = pl.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    if (isDemo) {
      setDemoLists((prev) =>
        prev.map((item) =>
          item.id === pl.id ? { ...item, status: nextStatus } : item
        )
      )
      toast.success(
        nextStatus === "ACTIVE"
          ? `Đã bật bảng giá "${pl.name}"`
          : `Đã tạm ngưng bảng giá "${pl.name}"`
      )
      return
    }
    try {
      await updatePriceList(pl.id, {
        status: nextStatus,
        expectedVersion: pl.version
      })
      await queryClient.invalidateQueries({ queryKey: ["catalog-price-lists"] })
      toast.success(
        nextStatus === "ACTIVE"
          ? `Đã bật bảng giá "${pl.name}"`
          : `Đã tạm ngưng bảng giá "${pl.name}"`
      )
    } catch (error) {
      toast.error(
        "Không thể cập nhật trạng thái bảng giá",
        parseApiErr(error, "Vui lòng thử lại.")
      )
    }
  }

  return (
    <div className="space-y-5">
      {/* Callout banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="shadow-xs mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#16866f]">
            <Tag size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#163d36]">
              Chiến lược giá bán đa kênh &amp; chi nhánh (Omnichannel Pricing)
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Tách biệt giá bán tại quầy POS với giá niêm yết trên Lazada / Shopee để bù chi phí chiết khấu sàn hoặc chạy giá ưu đãi theo chi nhánh.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingList(null)
            setFormOpen(true)
          }}
          className="shrink-0 bg-[#16866f] text-white hover:bg-[#0f705d]"
        >
          <Plus size={16} className="mr-1.5" />
          Tạo bảng giá mới
        </Button>
      </div>

      {/* Main Card */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên bảng giá..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 p-1 text-xs">
              {[
                { key: "ALL", label: "Mọi kênh" },
                { key: "POS", label: "POS" },
                { key: "LAZADA", label: "Lazada" },
                { key: "SHOPEE", label: "Shopee" },
                { key: "WEBSITE", label: "Website" }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setChannelFilter(item.key)}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    channelFilter === item.key
                      ? "bg-[#16866f] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <select
              aria-label="Lọc trạng thái bảng giá"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang áp dụng</option>
              <option value="INACTIVE">Tạm ngưng</option>
            </select>
          </div>
        </div>

        {!isDemo && priceListsQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : filteredLists.length === 0 ? (
          <div className="p-12 text-center">
            <Tag size={34} className="mx-auto text-slate-300" />
            <p className="mt-2.5 text-sm font-medium text-slate-700">
              Chưa có bảng giá nào phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tạo bảng giá riêng cho POS hoặc sàn Lazada/Shopee để quản lý biên lợi nhuận chính xác.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Tên Bảng giá</th>
                  <th className="px-5 py-3.5 font-semibold">Kênh bán áp dụng</th>
                  <th className="px-5 py-3.5 font-semibold">Phạm vi Chi nhánh</th>
                  <th className="px-5 py-3.5 font-semibold">Hiệu lực thời gian</th>
                  <th className="px-5 py-3.5 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLists.map((pl) => {
                  const channels = pl.channelTypes ?? []
                  return (
                    <tr
                      key={pl.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#163d36]">
                            {pl.name}
                          </span>
                          {pl.isDefault && (
                            <span className="rounded-full bg-[#e6f5ee] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#147853]">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Tiền tệ: {pl.currency} · Phiên bản v{pl.version}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {channels.length === 0 ? (
                            <ChannelBadge channel="ALL" size="xs" />
                          ) : (
                            channels.map((ch) => (
                              <ChannelBadge key={ch} channel={ch} size="xs" />
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-700">
                        {pl.branchIds.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <Store size={13} className="text-[#16866f]" />
                            Toàn bộ chi nhánh
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {pl.branchIds.map((bid) => (
                              <span
                                key={bid}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                {branchNameById.get(bid) ?? "Chi nhánh"}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarRange size={13} className="text-slate-400" />
                          {pl.startDate || pl.endDate
                            ? `${pl.startDate ?? "Bắt đầu ngay"} → ${pl.endDate ?? "Vô thời hạn"}`
                            : "Áp dụng liên tục"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <AnimatedSwitch
                            checked={pl.status === "ACTIVE"}
                            onChange={() => void handleToggleStatus(pl)}
                            label={`Bật hoặc tắt ${pl.name}`}
                          />
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              pl.status === "ACTIVE"
                                ? "bg-[#e6f5ee] text-[#147853]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {pl.status === "ACTIVE"
                              ? "Đang áp dụng"
                              : "Tạm ngưng"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMatrixTarget(pl)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#b8e2d2] bg-[#f2fbf6] px-3 py-1.5 text-xs font-semibold text-[#147853] transition hover:bg-[#e6f5ee]"
                          >
                            <SlidersHorizontal size={13} />
                            Bảng giá SKU
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingList(pl)
                              setFormOpen(true)
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Edit3 size={13} />
                            Sửa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
      {formOpen && (
        <PriceListFormModal
          initial={editingList}
          branches={branches}
          isDemo={isDemo}
          onClose={() => setFormOpen(false)}
          onSaved={async (saved, isCreate) => {
            if (isDemo) {
              setDemoLists((prev) =>
                isCreate
                  ? [saved, ...prev]
                  : prev.map((x) => (x.id === saved.id ? saved : x))
              )
            } else {
              await queryClient.invalidateQueries({
                queryKey: ["catalog-price-lists"]
              })
            }
            setFormOpen(false)
            toast.success(
              isCreate
                ? `Đã tạo bảng giá "${saved.name}"`
                : `Đã cập nhật bảng giá "${saved.name}"`
            )
          }}
        />
      )}

      {/* SKU Matrix Drawer */}
      <PriceListMatrixDrawer
        priceList={matrixTarget}
        variants={variants}
        isDemo={isDemo}
        onClose={() => setMatrixTarget(null)}
        onSaved={(updatedList) => {
          if (isDemo) {
            setDemoLists((prev) =>
              prev.map((x) => (x.id === updatedList.id ? updatedList : x))
            )
          } else {
            void queryClient.invalidateQueries({
              queryKey: ["catalog-price-lists"]
            })
          }
          setMatrixTarget(null)
          toast.success(
            `Đã cập nhật giá SKU cho "${updatedList.name}"`,
            `Lưu thành công ${updatedList.items?.length ?? 0} mức giá biến thể.`
          )
        }}
      />
    </div>
  )
}

function PriceListFormModal({
  initial,
  branches,
  isDemo,
  onClose,
  onSaved
}: {
  initial: PriceListApi | null
  branches: Array<{ id: string; name: string }>
  isDemo: boolean
  onClose: () => void
  onSaved: (saved: PriceListApi, isCreate: boolean) => Promise<void>
}) {
  const isEdit = Boolean(initial)
  const [name, setName] = useState(initial?.name ?? "")
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [channelTypes, setChannelTypes] = useState<string[]>(
    initial?.channelTypes ?? []
  )
  const [branchIds, setBranchIds] = useState<string[]>(
    initial?.branchIds ?? []
  )
  const [startDate, setStartDate] = useState(initial?.startDate ?? "")
  const [endDate, setEndDate] = useState(initial?.endDate ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const toggleChannel = (val: string) => {
    setChannelTypes((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    )
  }

  const toggleBranch = (id: string) => {
    setBranchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name.trim()) {
      setError("Vui lòng nhập tên bảng giá.")
      return
    }
    if (isDefault && branchIds.length > 0) {
      setError(
        "Bảng giá mặc định áp dụng toàn hệ thống nên không giới hạn theo từng chi nhánh lẻ."
      )
      return
    }
    if (startDate && endDate && startDate > endDate) {
      setError("Ngày bắt đầu không được sau ngày kết thúc.")
      return
    }

    setSubmitting(true)
    try {
      const payload: CreatePriceListInput = {
        name: name.trim(),
        currency: "VND",
        isDefault,
        branchIds: isDefault ? [] : branchIds,
        channelTypes,
        startDate: startDate || null,
        endDate: endDate || null
      }

      if (isDemo) {
        const now = new Date().toISOString()
        const saved: PriceListApi = {
          id: initial?.id ?? crypto.randomUUID(),
          name: payload.name,
          currency: "VND",
          isDefault: Boolean(payload.isDefault),
          status: initial?.status ?? "ACTIVE",
          startDate: payload.startDate ?? null,
          endDate: payload.endDate ?? null,
          version: (initial?.version ?? 0) + 1,
          branchIds: payload.branchIds ?? [],
          channelTypes: payload.channelTypes ?? [],
          items: initial?.items ?? [],
          createdAt: initial?.createdAt ?? now,
          updatedAt: now
        }
        await onSaved(saved, !isEdit)
      } else if (isEdit && initial) {
        const updated = await updatePriceList(initial.id, {
          ...payload,
          expectedVersion: initial.version
        })
        await onSaved(updated, false)
      } else {
        const created = await createPriceList(payload)
        await onSaved(created, true)
      }
    } catch (err) {
      setError(parseApiErr(err, "Không thể lưu bảng giá."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#163d36]/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Chỉnh sửa bảng giá" : "Tạo bảng giá mới"}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl duration-150 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#16866f]">
              Thiết lập Bảng giá
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-[#163d36]">
              {isEdit ? "Chỉnh sửa thông tin bảng giá" : "Tạo bảng giá mới"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <label className="block text-xs font-medium text-slate-600">
            Tên bảng giá *
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="VD: Bảng giá Sàn Shopee & Lazada (+12%)"
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                Kênh bán áp dụng
              </span>
              <span className="text-[11px] text-slate-400">
                {channelTypes.length === 0
                  ? "Mọi kênh bán"
                  : `Đã chọn ${channelTypes.length} kênh`}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRICE_CHANNELS.map((ch) => {
                const active = channelTypes.includes(ch.value)
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-[#16866f] bg-[#e6f5ee] text-[#147853]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {ch.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-[#163d36]">
                Đặt làm Bảng giá Mặc định toàn cửa hàng
              </p>
              <p className="text-[11px] text-slate-500">
                Dùng làm giá gốc dự phòng khi chi nhánh không có bảng giá riêng.
              </p>
            </div>
            <AnimatedSwitch
              checked={isDefault}
              onChange={(next) => {
                setIsDefault(next)
                if (next) setBranchIds([])
              }}
              label="Đặt làm bảng giá mặc định"
            />
          </div>

          {!isDefault && branches.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Giới hạn theo Chi nhánh (tuỳ chọn)
                </span>
                <span className="text-[11px] text-slate-400">
                  {branchIds.length === 0
                    ? "Toàn bộ chi nhánh"
                    : `${branchIds.length} chi nhánh`}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {branches.map((b) => {
                  const active = branchIds.includes(b.id)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBranch(b.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-[#16866f] bg-[#e6f5ee] font-semibold text-[#147853]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-600">
              Hiệu lực từ ngày
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#16866f]"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Đến hết ngày
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#16866f]"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            {submitting
              ? "Đang lưu..."
              : isEdit
                ? "Cập nhật bảng giá"
                : "Tạo bảng giá"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function PriceListMatrixDrawer({
  priceList,
  variants,
  isDemo,
  onClose,
  onSaved
}: {
  priceList: PriceListApi | null
  variants: SellableVariant[]
  isDemo: boolean
  onClose: () => void
  onSaved: (updated: PriceListApi) => void
}) {
  const [search, setSearch] = useState("")
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({})
  const [formulaMode, setFormulaMode] = useState<
    "PERCENT_UP" | "PERCENT_DOWN" | "AMOUNT_UP" | "AMOUNT_DOWN"
  >("PERCENT_UP")
  const [formulaValue, setFormulaValue] = useState("12")
  const [roundThousand, setRoundThousand] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const detailQuery = useQuery({
    queryKey: ["catalog-price-list-detail", priceList?.id],
    queryFn: () => getPriceListById(priceList!.id),
    enabled: Boolean(priceList?.id) && !isDemo
  })

  useEffect(() => {
    if (!priceList) return
    const sourceItems = isDemo
      ? (priceList.items ?? [])
      : (detailQuery.data?.items ?? priceList.items ?? [])
    const map: Record<string, string> = {}
    for (const item of sourceItems) {
      map[item.variantId] = String(item.price)
    }
    setDraftPrices(map)
    setError("")
  }, [detailQuery.data, isDemo, priceList])

  const filteredVariants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return variants
    return variants.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.skuCode.toLowerCase().includes(q) ||
        (v.label ?? "").toLowerCase().includes(q)
    )
  }, [search, variants])

  const applyBulkFormula = () => {
    const val = Number(formulaValue)
    if (Number.isNaN(val) || val < 0) return
    setDraftPrices((prev) => {
      const next = { ...prev }
      for (const v of filteredVariants) {
        const base = v.price
        let computed = base
        if (formulaMode === "PERCENT_UP") {
          computed = base * (1 + val / 100)
        } else if (formulaMode === "PERCENT_DOWN") {
          computed = base * Math.max(0, 1 - val / 100)
        } else if (formulaMode === "AMOUNT_UP") {
          computed = base + val
        } else {
          computed = Math.max(0, base - val)
        }
        if (roundThousand) {
          computed = Math.round(computed / 1000) * 1000
        } else {
          computed = Math.round(computed)
        }
        next[v.variantId] = String(Math.max(0, computed))
      }
      return next
    })
  }

  const configuredCount = useMemo(
    () =>
      Object.values(draftPrices).filter(
        (val) => val.trim() !== "" && Number(val) >= 0
      ).length,
    [draftPrices]
  )

  const handleSave = async () => {
    if (!priceList) return
    setError("")
    const itemsPayload: Array<{ variantId: string; price: number }> = []
    for (const [variantId, raw] of Object.entries(draftPrices)) {
      const trimmed = raw.trim()
      if (!trimmed) continue
      const num = Number(trimmed)
      if (!Number.isInteger(num) || num < 0) {
        setError("Tất cả mức giá nhập phải là số nguyên VND không âm.")
        return
      }
      itemsPayload.push({ variantId, price: num })
    }

    if (itemsPayload.length === 0) {
      setError("Vui lòng thiết lập giá cho ít nhất 1 biến thể SKU.")
      return
    }

    setSaving(true)
    try {
      if (isDemo) {
        const now = new Date().toISOString()
        const updated: PriceListApi = {
          ...priceList,
          updatedAt: now,
          items: itemsPayload.map((it) => {
            const v = variants.find((x) => x.variantId === it.variantId)
            return {
              id: crypto.randomUUID(),
              priceListId: priceList.id,
              variantId: it.variantId,
              skuCode: v?.skuCode,
              price: it.price,
              version: 1,
              updatedAt: now
            }
          })
        }
        onSaved(updated)
      } else {
        const saved = await upsertPriceListItems(priceList.id, itemsPayload)
        onSaved(saved)
      }
    } catch (err) {
      setError(parseApiErr(err, "Không thể lưu ma trận giá biến thể."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SlideOverDrawer
      open={Boolean(priceList)}
      onClose={onClose}
      width="2xl"
      eyebrow="Ma trận định giá SKU"
      title={priceList?.name ?? ""}
      subtitle="Điều chỉnh giá bán riêng cho từng SKU hoặc áp dụng công thức tính giá hàng loạt theo kênh bán."
      headerExtra={
        priceList ? (
          <div className="flex flex-wrap items-center gap-2">
            {(priceList.channelTypes ?? []).length === 0 ? (
              <ChannelBadge channel="ALL" size="xs" />
            ) : (
              (priceList.channelTypes ?? []).map((ch) => (
                <ChannelBadge key={ch} channel={ch} size="xs" />
              ))
            )}
            <span className="text-xs text-slate-500">
              Đã cấu hình{" "}
              <strong className="font-semibold text-[#163d36]">
                {configuredCount}/{variants.length}
              </strong>{" "}
              biến thể
            </span>
          </div>
        ) : null
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            <Check size={15} className="mr-1.5" />
            {saving ? "Đang lưu..." : `Lưu ${configuredCount} mức giá SKU`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Bulk Formula Bar */}
        <div className="shadow-xs rounded-xl border border-[#cce8dc] bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16866f]">
            <Sparkles size={14} />
            Công thức tính giá hàng loạt từ Giá gốc
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <select
              value={formulaMode}
              onChange={(e) =>
                setFormulaMode(e.target.value as typeof formulaMode)
              }
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#16866f]"
            >
              <option value="PERCENT_UP">Tăng + (%) so với Giá gốc</option>
              <option value="PERCENT_DOWN">Giảm - (%) so với Giá gốc</option>
              <option value="AMOUNT_UP">Cộng thêm + (VND)</option>
              <option value="AMOUNT_DOWN">Trừ bớt - (VND)</option>
            </select>

            <input
              type="number"
              min={0}
              value={formulaValue}
              onChange={(e) => setFormulaValue(e.target.value)}
              className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold tabular-nums text-[#163d36] outline-none focus:border-[#16866f]"
            />

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={roundThousand}
                onChange={(e) => setRoundThousand(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#16866f]"
              />
              Làm tròn nghìn đồng (1.000 ₫)
            </label>

            <Button
              type="button"
              size="sm"
              onClick={applyBulkFormula}
              className="ml-auto bg-[#e6f5ee] text-[#147853] hover:bg-[#d3ede1]"
            >
              Áp dụng cho {filteredVariants.length} SKU đang lọc
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {/* Search & Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3.5">
            <div className="relative max-w-sm">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm biến thể hoặc mã SKU..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-[#16866f]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Biến thể &amp; SKU</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Giá gốc (Base)
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Giá theo Bảng giá (VND)
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Chênh lệch
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVariants.map((v) => {
                  const raw = draftPrices[v.variantId] ?? ""
                  const hasVal = raw.trim() !== ""
                  const numVal = hasVal ? Number(raw) : null
                  const diff =
                    numVal !== null && !Number.isNaN(numVal)
                      ? numVal - v.price
                      : null
                  const diffPct =
                    diff !== null && v.price > 0
                      ? ((diff / v.price) * 100).toFixed(1)
                      : null

                  return (
                    <tr key={v.variantId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#163d36]">
                          {v.name}
                          {v.label ? (
                            <span className="ml-1.5 font-normal text-slate-500">
                              ({v.label})
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {v.skuCode}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-600">
                        {formatMoney(v.price)}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={raw}
                          onChange={(e) =>
                            setDraftPrices((prev) => ({
                              ...prev,
                              [v.variantId]: e.target.value
                            }))
                          }
                          placeholder={String(v.price)}
                          className="h-9 w-40 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold tabular-nums text-[#163d36] outline-none focus:border-[#16866f] focus:ring-2 focus:ring-[#16866f]/15"
                        />
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {diff === null ? (
                          <span className="text-slate-400">Dùng giá gốc</span>
                        ) : diff === 0 ? (
                          <span className="font-medium text-slate-500">
                            0 ₫ (0%)
                          </span>
                        ) : diff > 0 ? (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700">
                            <ArrowUpRight size={13} />+
                            {formatMoney(diff)} (+{diffPct}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-[#147853]">
                            <ArrowDownRight size={13} />
                            {formatMoney(diff)} ({diffPct}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SlideOverDrawer>
  )
}
