import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Link2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CatalogVariant } from "@/api/catalog/variants"
import {
  parseLazadaShopSku,
  type ChannelConnection,
  type CreateSkuMappingInput,
  type ListingSyncStatus,
  type ReconciliationRun,
  type ReconciliationRunDetail,
  type ReconciliationRunType,
  type ResolveSyncConflictInput,
  type SkuMapping,
  type SkuMappingStatus,
  type SyncConflict,
  type SyncConflictType,
  type SyncJob,
  type SyncJobStatus,
  type SyncJobType,
  type TriggerReconciliationRunInput,
  type UpdateSkuMappingInput
} from "@/api/integration"

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—"

const formatCurrency = (value?: number | null) =>
  value !== null && value !== undefined
    ? `${Number(value).toLocaleString("vi-VN")} ₫`
    : "—"

const MAPPING_STATUS_LABEL: Record<
  SkuMappingStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Đang liên kết",
    className: "bg-emerald-50 text-emerald-700"
  },
  NEEDS_REVIEW: {
    label: "Cần rà soát",
    className: "bg-amber-50 text-amber-700"
  },
  CONFLICT: {
    label: "Trùng / Xung đột",
    className: "bg-red-50 text-red-600"
  },
  INACTIVE: {
    label: "Ngừng đồng bộ",
    className: "bg-slate-100 text-slate-500"
  }
}

const LISTING_SYNC_LABEL: Record<ListingSyncStatus, string> = {
  SYNCED: "Đã đồng bộ tồn & giá",
  MAPPED: "Đã ghép mã SKU",
  SYNC_PENDING: "Đang chờ đồng bộ",
  SYNC_FAILED: "Lỗi đẩy tồn kho",
  NEEDS_REVIEW: "Cần kiểm tra lại",
  NOT_MAPPED: "Chưa liên kết",
  UNSUPPORTED: "Không hỗ trợ"
}

const JOB_TYPE_LABEL: Record<SyncJobType, string> = {
  ORDER_POLL: "Tải đơn hàng mới từ sàn",
  ORDER_IMPORT: "Đồng bộ đơn hàng lẻ",
  ORDER_STATUS_SYNC: "Cập nhật trạng thái đơn hàng",
  INVENTORY_PUBLICATION: "Đẩy tồn kho khả dụng lên sàn",
  PRODUCT_MAPPING_SYNC: "Tải sản phẩm & Tự khớp SKU",
  PRODUCT_PUBLICATION: "Đồng bộ thông tin sản phẩm",
  CONNECTION_TOKEN_REFRESH: "Gia hạn phiên kết nối gian hàng",
  FULL_RECONCILIATION: "Đối soát toàn diện đa kênh",
  INCREMENTAL_RECONCILIATION: "Đối soát định kỳ 24 giờ"
}

const JOB_STATUS_LABEL: Record<
  SyncJobStatus,
  { label: string; className: string }
> = {
  COMPLETED: {
    label: "Hoàn tất",
    className: "bg-emerald-50 text-emerald-700"
  },
  RUNNING: {
    label: "Đang xử lý",
    className: "bg-blue-50 text-blue-700"
  },
  PENDING: {
    label: "Đang chờ",
    className: "bg-slate-100 text-slate-600"
  },
  RETRY_SCHEDULED: {
    label: "Chờ tự động thử lại",
    className: "bg-amber-50 text-amber-700"
  },
  NEEDS_REVIEW: {
    label: "Cần kiểm tra",
    className: "bg-amber-50 text-amber-700"
  },
  DEAD_LETTERED: {
    label: "Tạm dừng do lỗi (Cần chạy lại)",
    className: "bg-red-50 text-red-600"
  },
  FAILED_PERMANENT: {
    label: "Thất bại",
    className: "bg-red-50 text-red-600"
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-slate-100 text-slate-500"
  }
}

const CONFLICT_TYPE_LABEL: Record<SyncConflictType, string> = {
  SKU_UNMAPPED: "Chưa liên kết hàng hóa (Chưa khớp SKU)",
  STOCK_INSUFFICIENT: "Tồn kho khả dụng không đủ xuất đơn",
  SKU_INACTIVE: "Sản phẩm nội bộ đang ngừng kinh doanh",
  QUANTITY_INVALID: "Số lượng đặt hàng không hợp lệ",
  DUPLICATE_EXTERNAL_ORDER: "Trùng mã đơn hàng từ sàn",
  ORDER_STATE_CONFLICT: "Lệch trạng thái giao vận với sàn",
  PAYMENT_EVIDENCE_CONFLICT: "Chênh lệch thông tin thanh toán",
  ADDRESS_INVALID: "Thiếu thông tin địa chỉ nhận hàng",
  PROVIDER_DATA_INCOMPLETE: "Dữ liệu đơn hàng từ sàn chưa đầy đủ",
  PROVIDER_AUTH_EXPIRED: "Phiên kết nối gian hàng hết hạn",
  SYNC_VERSION_CONFLICT: "Xung đột phiên bản dữ liệu tồn kho"
}

const SEVERITY_BADGE: Record<
  SyncConflict["severity"],
  { label: string; className: string }
> = {
  CRITICAL: { label: "Khẩn cấp", className: "bg-red-100 text-red-700" },
  HIGH: { label: "Ưu tiên cao", className: "bg-red-50 text-red-600" },
  MEDIUM: { label: "Trung bình", className: "bg-amber-50 text-amber-700" },
  LOW: { label: "Thấp", className: "bg-slate-100 text-slate-600" }
}

const RUN_TYPE_LABEL: Record<ReconciliationRunType, string> = {
  INCREMENTAL: "Đối soát nhanh (24 giờ gần nhất)",
  FULL: "Đối soát toàn diện (Đơn hàng + Tồn kho + Tác vụ lỗi)",
  ORDER_VERIFICATION: "Rà soát đơn hàng bị sót thông báo từ sàn",
  INVENTORY_VERIFICATION: "Rà soát chênh lệch tồn kho giữa Kho và Sàn"
}

const ISSUE_TYPE_LABEL: Record<string, string> = {
  MISSED_WEBHOOK_ORDER_RECOVERED:
    "Đã tự động tải bù đơn hàng bị sót thông báo Webhook",
  UNCONFIRMED_ORDER_REF_RECOVERED:
    "Đã khôi phục đơn hàng bị gián đoạn khi đang đồng bộ",
  INVENTORY_PUBLICATION_RECONCILED:
    "Đã tự động cân bằng lại số tồn kho trên sàn khớp với kho nội bộ",
  INVENTORY_PUBLICATION_DISCREPANCY:
    "Phát hiện chênh lệch số lượng tồn kho giữa sàn và kho nội bộ",
  PROVIDER_CREDENTIALS_EXPIRED:
    "Phiên ủy quyền gian hàng đã hết hạn, cần cấp lại quyền",
  DEAD_LETTERED_EVENT_UNRESOLVED:
    "Còn tác vụ đồng bộ bị lỗi trong hàng đợi chưa được xử lý",
  SYNC_JOB_LEASE_EXPIRED: "Tiến trình đồng bộ bị treo quá thời gian quy định"
}

function formatJobResultSummary(job: SyncJob): string {
  const s = job.resultSummary
  if (!s) return "Đang chờ thực thi..."
  if (job.jobType === "ORDER_POLL") {
    const polled = Number(s.polledCount ?? (Number(s.importedOrders ?? 0) + Number(s.updatedOrders ?? 0)))
    const imported = Number(s.importedCount ?? s.importedOrders ?? 0)
    const replayed = Number(s.replayedCount ?? s.updatedOrders ?? 0)
    return `Đã quét ${polled} đơn · Nhập mới ${imported} đơn · Đã đồng bộ/bỏ qua trùng ${replayed} đơn`
  }
  if (job.jobType === "ORDER_IMPORT") {
    return `Mã đơn ${String(s.externalOrderId ?? "")} → ${
      s.statusOutcome === "IMPORTED" ? "Đã nhập thành công" : String(s.statusOutcome ?? "Hoàn tất")
    }`
  }
  if (job.jobType === "INVENTORY_PUBLICATION") {
    if (s.publishedCount !== undefined) {
      return `Đã cập nhật tồn kho ${Number(s.publishedCount)}/${Number(s.totalMappings ?? s.publishedCount)} mã hàng`
    }
    return "Đã đồng bộ tồn kho lên sàn"
  }
  if (
    job.jobType === "PRODUCT_MAPPING_SYNC" ||
    job.jobType === "PRODUCT_PUBLICATION"
  ) {
    return "Đã tải danh mục sản phẩm và tự động khớp mã SKU trùng"
  }
  if (job.jobType === "CONNECTION_TOKEN_REFRESH") {
    return s.refreshed
      ? "Đã gia hạn Access Token mới"
      : "Token vẫn còn hạn sử dụng"
  }
  return JSON.stringify(s)
}

// ============================================================================
// 1. SKU MAPPINGS PANEL
// ============================================================================

export function SkuMappingsPanel({
  connections,
  mappings,
  variants,
  selectedConnectionId,
  onSelectConnection,
  onCreateMapping,
  onUpdateMapping,
  onDeleteMapping,
  onAutoDiscoverProducts,
  onOpenAutoMatch,
  pending
}: {
  connections: ChannelConnection[]
  mappings: SkuMapping[]
  variants: CatalogVariant[]
  selectedConnectionId: string
  onSelectConnection: (id: string) => void
  onCreateMapping: (input: CreateSkuMappingInput) => Promise<void>
  onUpdateMapping: (id: string, input: UpdateSkuMappingInput) => Promise<void>
  onDeleteMapping: (id: string) => Promise<void>
  onAutoDiscoverProducts: (connectionId: string) => Promise<void>
  onOpenAutoMatch?: (connectionId: string) => void
  pending: boolean
}) {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [searchText, setSearchText] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<SkuMapping | null>(null)

  const connMap = new Map(connections.map((c) => [c.id, c]))
  const variantMap = new Map(variants.map((v) => [v.variantId, v]))

  const filtered = mappings.filter((m) => {
    if (selectedConnectionId && m.connectionId !== selectedConnectionId)
      return false
    if (statusFilter !== "ALL" && m.status !== statusFilter) return false
    if (!searchText.trim()) return true
    const q = searchText.toLowerCase()
    return `${m.externalProductName ?? ""} ${m.externalItemId} ${m.externalSkuId} ${m.externalSkuCode ?? ""} ${m.internalSkuCode}`
      .toLowerCase()
      .includes(q)
  })

  const activeConnection =
    connections.find((c) => c.id === selectedConnectionId) ??
    connections.find((c) => c.provider === "LAZADA") ??
    connections[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
            <Search size={15} />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm tên SP, mã Item/SKU Lazada, mã SKU nội bộ..."
              className="w-64 text-slate-700 outline-none"
            />
          </label>
          <select
            aria-label="Lọc gian hàng"
            value={selectedConnectionId}
            onChange={(e) => onSelectConnection(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="">Tất cả gian hàng ({connections.length})</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.provider}] {c.shopName} ({c.externalShopId})
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái ánh xạ"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Tất cả trạng thái liên kết</option>
            <option value="ACTIVE">Đang liên kết</option>
            <option value="NEEDS_REVIEW">Cần rà soát</option>
            <option value="CONFLICT">Trùng / Xung đột</option>
            <option value="INACTIVE">Ngừng đồng bộ</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeConnection && onOpenAutoMatch ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenAutoMatch(activeConnection.id)}
              className="gap-1.5 border-[#16866f]/30 bg-[#f2fbf6] text-xs font-semibold text-[#147853] hover:bg-[#e6f5ee]"
            >
              <Link2 size={14} />
              Gợi ý nối SKU hàng loạt
            </Button>
          ) : null}
          {activeConnection && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onAutoDiscoverProducts(activeConnection.id)}
              className="gap-1.5 text-xs"
            >
              <Sparkles size={14} className="text-[#16866f]" />
              Tải SP từ {activeConnection.provider} & Tự khớp trùng SKU
            </Button>
          )}
          <Button
            type="button"
            disabled={connections.length === 0 || pending}
            onClick={() => setCreateOpen(true)}
            className="gap-1.5 bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
          >
            <Plus size={15} /> Liên kết mã hàng (SKU) mới
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                {[
                  "Gian hàng",
                  "Sản phẩm trên sàn TMĐT",
                  "Mã Item / SKU trên sàn",
                  "Hàng hóa nội bộ (Catalog)",
                  "Giá bán trên sàn vs Giá lẻ",
                  "Đồng bộ tồn kho",
                  "Trạng thái",
                  "Thao tác"
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const conn = connMap.get(item.connectionId)
                const internalVariant = variantMap.get(item.internalVariantId)
                const badge = MAPPING_STATUS_LABEL[item.status] ?? {
                  label: item.status,
                  className: "bg-slate-100 text-slate-600"
                }
                const priceDiff =
                  item.externalPrice !== null && internalVariant
                    ? item.externalPrice - internalVariant.price
                    : 0

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 text-xs">
                      <span className="font-semibold text-[#163d36]">
                        {conn?.shopName ?? item.provider}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {item.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {internalVariant?.imageUrl ? (
                          <img
                            src={internalVariant.imageUrl}
                            alt={item.externalProductName ?? item.internalSkuCode}
                            className="shadow-xs h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef0ff] text-xs font-bold text-[#0f146d]">
                            {(item.externalProductName ?? item.internalSkuCode)
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-[#163d36]">
                            {item.externalProductName ?? "Sản phẩm sàn TMĐT"}
                          </p>
                          <span className="text-xs text-slate-400">
                            SellerSKU: {item.externalSkuCode ?? "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      <div>Item: {item.externalItemId}</div>
                      <div className="text-slate-400">
                        SKU: {item.externalSkuId}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e6f5ee] px-2 py-1 font-mono text-xs font-semibold text-[#147853]">
                        <Link2 size={12} /> {item.internalSkuCode}
                      </span>
                      {internalVariant && (
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          {internalVariant.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-700">
                        {formatCurrency(item.externalPrice)}
                      </div>
                      {internalVariant && (
                        <span
                          className={`text-[11px] ${
                            priceDiff < 0
                              ? "font-medium text-amber-600"
                              : priceDiff > 0
                                ? "text-emerald-600"
                                : "text-slate-400"
                          }`}
                        >
                          {priceDiff === 0
                            ? "Khớp giá bán lẻ"
                            : priceDiff > 0
                              ? `Cao hơn giá lẻ +${priceDiff.toLocaleString("vi-VN")} ₫`
                              : `Thấp hơn giá lẻ ${priceDiff.toLocaleString("vi-VN")} ₫`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <div>
                        {LISTING_SYNC_LABEL[item.listingSyncStatus] ??
                          item.listingSyncStatus}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.mappingMode === "EXACT_SKU_AUTO" ||
                        item.mappingMode === "AUTO_SKU"
                          ? "Tự động khớp SKU"
                          : "Liên kết thủ công"}{" "}
                        (v{item.mappingVersion})
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Chỉnh sửa liên kết SKU"
                          onClick={() => setEditing(item)}
                          className="h-8 px-2 text-slate-500 hover:text-[#163d36]"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Hủy liên kết SKU"
                          disabled={pending}
                          onClick={() => onDeleteMapping(item.id)}
                          className="h-8 px-2 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              Chưa có sản phẩm nào được liên kết theo bộ lọc hiện tại. Hãy nhấn
              &ldquo;Liên kết mã hàng (SKU) mới&rdquo; hoặc &ldquo;Tải SP từ sàn
              & Tự khớp trùng SKU&rdquo;.
            </p>
          )}
        </div>
      </section>

      {createOpen && (
        <SkuMappingFormModal
          connections={connections}
          variants={variants}
          defaultConnectionId={activeConnection?.id ?? ""}
          pending={pending}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (input) => {
            await onCreateMapping(input)
            setCreateOpen(false)
          }}
        />
      )}

      {editing && (
        <SkuMappingEditModal
          mapping={editing}
          variants={variants}
          pending={pending}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await onUpdateMapping(editing.id, input)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function SkuMappingFormModal({
  connections,
  variants,
  defaultConnectionId,
  pending,
  onClose,
  onSubmit
}: {
  connections: ChannelConnection[]
  variants: CatalogVariant[]
  defaultConnectionId: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: CreateSkuMappingInput) => Promise<void>
}) {
  const [connectionId, setConnectionId] = useState(
    defaultConnectionId || connections[0]?.id || ""
  )
  const [shopSkuRaw, setShopSkuRaw] = useState("")
  const [externalItemId, setExternalItemId] = useState("")
  const [externalSkuId, setExternalSkuId] = useState("")
  const [externalSkuCode, setExternalSkuCode] = useState("")
  const [externalProductName, setExternalProductName] = useState("")
  const [internalVariantId, setInternalVariantId] = useState(
    variants[0]?.variantId ?? ""
  )
  const [externalPrice, setExternalPrice] = useState("")

  const handleShopSkuParse = (value: string) => {
    setShopSkuRaw(value)
    const parsed = parseLazadaShopSku(value)
    if (parsed.itemId) setExternalItemId(parsed.itemId)
    if (parsed.skuId) setExternalSkuId(parsed.skuId)
  }

  const handleVariantChange = (variantId: string) => {
    setInternalVariantId(variantId)
    const found = variants.find((v) => v.variantId === variantId)
    if (found) {
      if (!externalSkuCode) setExternalSkuCode(found.skuCode)
      if (!externalProductName) setExternalProductName(found.name)
      if (!externalPrice) setExternalPrice(String(found.price))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      connectionId,
      externalItemId: externalItemId.trim(),
      externalSkuId: externalSkuId.trim(),
      ...(externalSkuCode.trim()
        ? { externalSkuCode: externalSkuCode.trim() }
        : {}),
      ...(externalProductName.trim()
        ? { externalProductName: externalProductName.trim() }
        : {}),
      internalVariantId,
      ...(externalPrice ? { externalPrice: Number(externalPrice) } : {}),
      mappingMode: "MANUAL"
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16866f]">
              Liên kết Hàng hóa Sàn TMĐT ↔ Danh mục Nội bộ
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#163d36]">
              Tạo liên kết mã hàng (SKU) mới
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-xs font-medium text-slate-700">
            Gian hàng áp dụng *
            <select
              required
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.provider}] {c.shopName} ({c.externalShopId})
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-3">
            <label className="block text-xs font-semibold text-[#147853]">
              Dán nhanh mã Lazada ShopSKU (Tự động tách Mã sản phẩm & Mã phân
              loại)
              <input
                value={shopSkuRaw}
                onChange={(e) => handleShopSkuParse(e.target.value)}
                placeholder="VD: 13504402059_VNAMZ-117553898643"
                className="mt-1.5 w-full rounded-lg border border-[#cce8dc] bg-white px-3 py-1.5 font-mono text-xs text-slate-700 outline-none"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Mã sản phẩm trên sàn (`Item ID`) *
              <input
                required
                value={externalItemId}
                onChange={(e) => setExternalItemId(e.target.value)}
                placeholder="VD: 13504402059"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Mã phân loại trên sàn (`SKU ID`) *
              <input
                required
                value={externalSkuId}
                onChange={(e) => setExternalSkuId(e.target.value)}
                placeholder="VD: 117553898643"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-700">
            Hàng hóa / Biến thể nội bộ (Catalog) *
            <select
              required
              value={internalVariantId}
              onChange={(e) => handleVariantChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
            >
              <option value="">Chọn sản phẩm trong kho nội bộ</option>
              {variants.map((v) => (
                <option key={v.variantId} value={v.variantId}>
                  [{v.skuCode}] {v.name} — Giá lẻ:{" "}
                  {v.price.toLocaleString("vi-VN")} ₫
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-slate-700">
              SellerSKU trên sàn
              <input
                value={externalSkuCode}
                onChange={(e) => setExternalSkuCode(e.target.value)}
                placeholder="VD: TER-500-GRN"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
              Tên sản phẩm hiển thị trên sàn
              <input
                value={externalProductName}
                onChange={(e) => setExternalProductName(e.target.value)}
                placeholder="VD: Bình giữ nhiệt Terra 500ml"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-700">
            Giá bán niêm yết trên sàn (VND)
            <input
              type="number"
              min={0}
              value={externalPrice}
              onChange={(e) => setExternalPrice(e.target.value)}
              placeholder="VD: 420000"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
            />
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[#16866f] text-white hover:bg-[#0f705d]"
            >
              {pending ? "Đang lưu..." : "Lưu ánh xạ SKU"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function SkuMappingEditModal({
  mapping,
  variants,
  pending,
  onClose,
  onSubmit
}: {
  mapping: SkuMapping
  variants: CatalogVariant[]
  pending: boolean
  onClose: () => void
  onSubmit: (input: UpdateSkuMappingInput) => Promise<void>
}) {
  const [internalVariantId, setInternalVariantId] = useState(
    mapping.internalVariantId
  )
  const [externalSkuCode, setExternalSkuCode] = useState(
    mapping.externalSkuCode ?? ""
  )
  const [externalProductName, setExternalProductName] = useState(
    mapping.externalProductName ?? ""
  )
  const [status, setStatus] = useState<SkuMappingStatus>(mapping.status)
  const [externalPrice, setExternalPrice] = useState(
    mapping.externalPrice !== null ? String(mapping.externalPrice) : ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      internalVariantId,
      externalSkuCode: externalSkuCode.trim(),
      externalProductName: externalProductName.trim(),
      status,
      ...(externalPrice ? { externalPrice: Number(externalPrice) } : {})
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16866f]">
              Cập nhật Liên kết Hàng hóa (Phiên bản v{mapping.mappingVersion} →
              v{mapping.mappingVersion + 1})
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#163d36]">
              Item {mapping.externalItemId} / SKU {mapping.externalSkuId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-xs font-medium text-slate-700">
            Hàng hóa / Biến thể nội bộ (Catalog)
            <select
              value={internalVariantId}
              onChange={(e) => setInternalVariantId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
            >
              {variants.map((v) => (
                <option key={v.variantId} value={v.variantId}>
                  [{v.skuCode}] {v.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-700">
            Tên sản phẩm trên sàn
            <input
              value={externalProductName}
              onChange={(e) => setExternalProductName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-700">
              SellerSKU
              <input
                value={externalSkuCode}
                onChange={(e) => setExternalSkuCode(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Trạng thái liên kết
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SkuMappingStatus)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              >
                <option value="ACTIVE">Đang liên kết</option>
                <option value="INACTIVE">Ngừng đồng bộ</option>
                <option value="NEEDS_REVIEW">Cần rà soát</option>
                <option value="CONFLICT">Trùng / Xung đột</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-700">
            Giá bán niêm yết trên sàn (VND)
            <input
              type="number"
              min={0}
              value={externalPrice}
              onChange={(e) => setExternalPrice(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
            />
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[#16866f] text-white hover:bg-[#0f705d]"
            >
              {pending ? "Đang cập nhật..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

// ============================================================================
// 2. SYNC JOBS & DEAD-LETTER QUEUE PANEL
// ============================================================================

export function SyncJobsPanel({
  connections,
  jobs,
  selectedConnectionId,
  onSelectConnection,
  onOpenOrderSync,
  onTriggerInventorySync,
  onTriggerProductSync,
  onRetryJob,
  pending
}: {
  connections: ChannelConnection[]
  jobs: SyncJob[]
  selectedConnectionId: string
  onSelectConnection: (id: string) => void
  onOpenOrderSync: (conn: ChannelConnection) => void
  onTriggerInventorySync: (connectionId: string) => Promise<void>
  onTriggerProductSync: (connectionId: string) => Promise<void>
  onRetryJob: (jobId: string) => Promise<void>
  pending: boolean
}) {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [inspectingJob, setInspectingJob] = useState<SyncJob | null>(null)

  const connMap = new Map(connections.map((c) => [c.id, c]))
  const activeConnection =
    connections.find((c) => c.id === selectedConnectionId) ??
    connections.find((c) => c.provider === "LAZADA") ??
    connections[0]

  const filtered = jobs.filter((j) => {
    if (selectedConnectionId && j.connectionId !== selectedConnectionId)
      return false
    if (statusFilter !== "ALL" && j.status !== statusFilter) return false
    if (typeFilter !== "ALL" && j.jobType !== typeFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Lọc gian hàng cho tiến trình"
            value={selectedConnectionId}
            onChange={(e) => onSelectConnection(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="">Tất cả gian hàng</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.provider}] {c.shopName}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc loại tiến trình"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Mọi nghiệp vụ đồng bộ</option>
            <option value="ORDER_POLL">Tải đơn hàng mới từ sàn</option>
            <option value="ORDER_IMPORT">Đồng bộ đơn hàng lẻ</option>
            <option value="INVENTORY_PUBLICATION">
              Đẩy tồn kho khả dụng lên sàn
            </option>
            <option value="PRODUCT_MAPPING_SYNC">
              Tải sản phẩm & Tự khớp SKU
            </option>
            <option value="CONNECTION_TOKEN_REFRESH">
              Gia hạn phiên kết nối gian hàng
            </option>
          </select>

          <select
            aria-label="Lọc trạng thái tiến trình"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="RUNNING">Đang xử lý</option>
            <option value="PENDING">Đang chờ</option>
            <option value="RETRY_SCHEDULED">Chờ tự động thử lại</option>
            <option value="DEAD_LETTERED">Tạm dừng do lỗi (Cần chạy lại)</option>
          </select>
        </div>

        {activeConnection && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenOrderSync(activeConnection)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw size={14} /> Tải đơn hàng mới
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onTriggerInventorySync(activeConnection.id)}
              className="gap-1.5 text-xs"
            >
              <Play size={14} /> Cập nhật tồn kho lên sàn
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => onTriggerProductSync(activeConnection.id)}
              className="gap-1.5 bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
            >
              <Sparkles size={14} /> Tải & Khớp danh mục SP
            </Button>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                {[
                  "Mã tác vụ",
                  "Gian hàng",
                  "Nghiệp vụ đồng bộ",
                  "Trạng thái",
                  "Số lần thử",
                  "Kết quả thực thi",
                  "Thời gian cập nhật",
                  "Thao tác"
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((job) => {
                const conn = job.connectionId
                  ? connMap.get(job.connectionId)
                  : undefined
                const badge = JOB_STATUS_LABEL[job.status] ?? {
                  label: job.status,
                  className: "bg-slate-100 text-slate-600"
                }
                return (
                  <tr key={job.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#163d36]">
                      {job.code}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {conn?.shopName ?? job.provider ?? "Hệ thống"}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-medium text-[#163d36]">
                        {JOB_TYPE_LABEL[job.jobType] ?? job.jobType}
                      </p>
                      <span className="font-mono text-[10px] text-slate-400">
                        {job.jobType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      Lần {job.attemptCount}/{job.maxAttempts}
                    </td>
                    <td className="max-w-sm px-4 py-3.5 text-xs text-slate-600">
                      {job.lastErrorMessage ? (
                        <span className="text-red-600">
                          {job.lastErrorMessage}
                        </span>
                      ) : (
                        <span>{formatJobResultSummary(job)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {formatDateTime(job.completedAt ?? job.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectingJob(job)}
                          className="h-8 gap-1 px-2 text-xs text-slate-500"
                        >
                          <Eye size={14} /> Nhật ký
                        </Button>
                        {job.status !== "RUNNING" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => onRetryJob(job.id)}
                            className="h-8 gap-1 px-2.5 text-xs"
                          >
                            <RotateCcw size={13} /> Chạy lại
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              Chưa có lịch sử tác vụ đồng bộ nào.
            </p>
          )}
        </div>
      </section>

      {inspectingJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[#16866f]">
                  Nhật ký kỹ thuật tác vụ đồng bộ
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[#163d36]">
                  {inspectingJob.code} ·{" "}
                  {JOB_TYPE_LABEL[inspectingJob.jobType] ??
                    inspectingJob.jobType}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingJob(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-600">
                  Khóa chống trùng lặp (Idempotency Key):
                </span>
                <p className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-slate-700">
                  {inspectingJob.idempotencyKey}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-600">
                  Tham số đầu vào:
                </span>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700">
                  {JSON.stringify(inspectingJob.payload, null, 2)}
                </pre>
              </div>
              {inspectingJob.resultSummary && (
                <div>
                  <span className="font-semibold text-slate-600">
                    Kết quả chi tiết:
                  </span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-[#f2fbf6] p-2.5 font-mono text-[11px] text-[#147853]">
                    {JSON.stringify(inspectingJob.resultSummary, null, 2)}
                  </pre>
                </div>
              )}
              {inspectingJob.lastErrorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-600">
                  <strong>[{inspectingJob.lastErrorCode}]</strong>{" "}
                  {inspectingJob.lastErrorMessage}
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                onClick={() => setInspectingJob(null)}
                className="bg-[#16866f] text-white"
              >
                Đóng
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 3. SYNCHRONIZATION CONFLICTS PANEL
// ============================================================================

export function ConflictsPanel({
  connections,
  conflicts,
  variants,
  selectedConnectionId,
  onSelectConnection,
  onResolveConflict,
  onRetryConflict,
  pending
}: {
  connections: ChannelConnection[]
  conflicts: SyncConflict[]
  variants: CatalogVariant[]
  selectedConnectionId: string
  onSelectConnection: (id: string) => void
  onResolveConflict: (
    conflictId: string,
    input: ResolveSyncConflictInput
  ) => Promise<void>
  onRetryConflict: (conflictId: string) => Promise<void>
  pending: boolean
}) {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [resolving, setResolving] = useState<SyncConflict | null>(null)

  const connMap = new Map(connections.map((c) => [c.id, c]))
  const filtered = conflicts.filter((c) => {
    if (selectedConnectionId && c.connectionId !== selectedConnectionId)
      return false
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Lọc gian hàng cho xung đột"
            value={selectedConnectionId}
            onChange={(e) => onSelectConnection(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="">Tất cả gian hàng</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.provider}] {c.shopName}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc trạng thái xung đột"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="ALL">Mọi trạng thái xử lý</option>
            <option value="OPEN">Chờ xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="IGNORED">Đã bỏ qua</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Đơn hàng từ sàn chưa liên kết mã hàng (SKU) hoặc thiếu tồn kho sẽ được
          tạm giữ tại đây để bạn liên kết bù và tạo đơn mà không bị thất lạc.
        </span>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                {[
                  "Mã cảnh báo",
                  "Gian hàng",
                  "Nguyên nhân cần xử lý",
                  "Mã đơn hàng trên sàn",
                  "Sản phẩm / SKU trên sàn",
                  "Trạng thái",
                  "Thời gian phát hiện",
                  "Thao tác"
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const conn = connMap.get(item.connectionId)
                const sev = SEVERITY_BADGE[item.severity]
                const buyerName =
                  typeof item.details?.buyerName === "string"
                    ? item.details.buyerName
                    : null
                const extSkuCode =
                  typeof item.details?.externalSkuCode === "string"
                    ? item.details.externalSkuCode
                    : null

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#163d36]">
                      {item.code}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {conn?.shopName ?? item.provider}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {CONFLICT_TYPE_LABEL[item.conflictType] ??
                            item.conflictType}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${sev.className}`}
                        >
                          {sev.label}
                        </span>
                      </div>
                      {buyerName && (
                        <span className="mt-0.5 block text-[11px] text-slate-400">
                          Khách mua: {buyerName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#163d36]">
                      {item.externalOrderId ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {item.externalItemId ? (
                        <>
                          <div className="font-mono">
                            {item.externalItemId} / {item.externalSkuId ?? "—"}
                          </div>
                          {extSkuCode && (
                            <span className="text-[11px] text-slate-400">
                              SellerSKU: {extSkuCode}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          item.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "IGNORED"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {item.status === "RESOLVED"
                          ? "Đã xử lý"
                          : item.status === "IGNORED"
                            ? "Đã bỏ qua"
                            : "Chờ xử lý"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {item.status === "OPEN" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setResolving(item)}
                            className="h-8 bg-[#16866f] px-2.5 text-xs text-white hover:bg-[#0f705d]"
                          >
                            Xử lý & Ánh xạ
                          </Button>
                        )}
                        {item.externalOrderId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => onRetryConflict(item.id)}
                            className="h-8 gap-1 px-2.5 text-xs"
                          >
                            <RotateCcw size={13} /> Đồng bộ lại đơn
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              Không có đơn hàng hay mã hàng nào bị gián đoạn đồng bộ.
            </p>
          )}
        </div>
      </section>

      {resolving && (
        <ResolveConflictModal
          conflict={resolving}
          variants={variants}
          pending={pending}
          onClose={() => setResolving(null)}
          onSubmit={async (input) => {
            await onResolveConflict(resolving.id, input)
            setResolving(null)
          }}
        />
      )}
    </div>
  )
}

function ResolveConflictModal({
  conflict,
  variants,
  pending,
  onClose,
  onSubmit
}: {
  conflict: SyncConflict
  variants: CatalogVariant[]
  pending: boolean
  onClose: () => void
  onSubmit: (input: ResolveSyncConflictInput) => Promise<void>
}) {
  const [resolutionStatus, setResolutionStatus] = useState<
    "RESOLVED" | "IGNORED"
  >("RESOLVED")
  const [resolutionAction, setResolutionAction] = useState(
    conflict.conflictType === "SKU_UNMAPPED"
      ? "MAP_SKU_AND_IMPORT"
      : "OPERATOR_RESOLVED"
  )
  const [internalVariantId, setInternalVariantId] = useState(
    variants[0]?.variantId ?? ""
  )
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [retryAfterResolve, setRetryAfterResolve] = useState(true)

  const canMapSku = Boolean(conflict.externalItemId && conflict.externalSkuId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      resolutionStatus,
      resolutionAction,
      ...(resolutionNotes.trim()
        ? { resolutionNotes: resolutionNotes.trim() }
        : {}),
      ...(canMapSku && resolutionStatus === "RESOLVED" && internalVariantId
        ? { internalVariantId }
        : {}),
      retryAfterResolve
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              <AlertTriangle size={12} />{" "}
              {CONFLICT_TYPE_LABEL[conflict.conflictType] ??
                conflict.conflictType}
            </span>
            <h2 className="mt-1.5 text-lg font-semibold text-[#163d36]">
              Xử lý đơn hàng bị giữ ({conflict.code})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <div>
              <strong>Mã đơn hàng trên sàn:</strong>{" "}
              <code>{conflict.externalOrderId ?? "—"}</code>
            </div>
            {canMapSku && (
              <div className="mt-1">
                <strong>Mã Item / SKU trên sàn:</strong>{" "}
                <code>
                  {conflict.externalItemId} / {conflict.externalSkuId}
                </code>
              </div>
            )}
          </div>

          {canMapSku && resolutionStatus === "RESOLVED" && (
            <label className="block text-xs font-medium text-slate-700">
              Chọn sản phẩm nội bộ (Catalog) để liên kết tự động *
              <select
                required
                value={internalVariantId}
                onChange={(e) => setInternalVariantId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              >
                {variants.map((v) => (
                  <option key={v.variantId} value={v.variantId}>
                    [{v.skuCode}] {v.name} — {v.price.toLocaleString("vi-VN")} ₫
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-700">
              Hướng xử lý
              <select
                value={resolutionStatus}
                onChange={(e) =>
                  setResolutionStatus(
                    e.target.value as "RESOLVED" | "IGNORED"
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="RESOLVED">Liên kết & Giải quyết</option>
                <option value="IGNORED">Bỏ qua cảnh báo này</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Phương thức xử lý
              <select
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="MAP_SKU_AND_IMPORT">
                  Liên kết SKU & Tạo đơn ngay
                </option>
                <option value="RESTOCK_AND_IMPORT">
                  Đã bổ sung tồn kho & Tạo đơn
                </option>
                <option value="OPERATOR_RESOLVED">
                  Xác nhận xử lý thủ công
                </option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-700">
            Ghi chú nội bộ
            <input
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="VD: Đã liên kết đúng biến thể và nhập bổ sung tồn kho"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
            />
          </label>

          {conflict.externalOrderId && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={retryAfterResolve}
                onChange={(e) => setRetryAfterResolve(e.target.checked)}
                className="accent-[#16866f]"
              />
              Tự động đồng bộ lại đơn hàng này sang danh sách Đơn hàng ngay sau
              khi lưu
            </label>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[#16866f] text-white hover:bg-[#0f705d]"
            >
              {pending ? "Đang xử lý..." : "Xác nhận xử lý"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

// ============================================================================
// 4. OPERATIONAL RECONCILIATION PANEL
// ============================================================================

export function ReconciliationPanel({
  connections,
  runs,
  selectedRunDetail,
  selectedConnectionId,
  onSelectConnection,
  onExecuteRun,
  onInspectRun,
  pending
}: {
  connections: ChannelConnection[]
  runs: ReconciliationRun[]
  selectedRunDetail: ReconciliationRunDetail | null
  selectedConnectionId: string
  onSelectConnection: (id: string) => void
  onExecuteRun: (input: TriggerReconciliationRunInput) => Promise<void>
  onInspectRun: (runId: string) => Promise<void>
  pending: boolean
}) {
  const [runType, setRunType] = useState<ReconciliationRunType>("INCREMENTAL")
  const [autoRecoverSafeItems, setAutoRecoverSafeItems] = useState(true)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Chọn gian hàng đối soát"
            value={selectedConnectionId}
            onChange={(e) => onSelectConnection(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="">Tất cả gian hàng trên toàn hệ thống</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.provider}] {c.shopName}
              </option>
            ))}
          </select>

          <select
            aria-label="Chọn loại đối soát"
            value={runType}
            onChange={(e) =>
              setRunType(e.target.value as ReconciliationRunType)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="INCREMENTAL">
              Đối soát nhanh (24 giờ gần nhất)
            </option>
            <option value="FULL">
              Đối soát toàn diện (Đơn hàng + Tồn kho + Tác vụ lỗi)
            </option>
            <option value="ORDER_VERIFICATION">
              Rà soát đơn hàng bị sót thông báo từ sàn
            </option>
            <option value="INVENTORY_VERIFICATION">
              Rà soát chênh lệch tồn kho giữa Kho và Sàn
            </option>
          </select>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={autoRecoverSafeItems}
              onChange={(e) => setAutoRecoverSafeItems(e.target.checked)}
              className="accent-[#16866f]"
            />
            Tự động tải bù đơn sót & cân bằng lại tồn kho lệch
          </label>
        </div>

        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            onExecuteRun({
              ...(selectedConnectionId
                ? { connectionId: selectedConnectionId }
                : {}),
              runType,
              autoRecoverSafeItems
            })
          }
          className="gap-1.5 bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
        >
          <ShieldAlert size={15} />
          {pending ? "Đang chạy đối soát..." : "Chạy đối soát đa kênh ngay"}
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                {[
                  "Mã phiên",
                  "Phạm vi đối soát",
                  "Trạng thái",
                  "Bản ghi kiểm tra",
                  "Trùng khớp",
                  "Đã tự động khắc phục",
                  "Còn lệch",
                  "Thời gian hoàn tất",
                  "Báo cáo"
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#163d36]">
                    {run.code}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-700">
                    {RUN_TYPE_LABEL[run.runType] ?? run.runType}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      {run.status === "COMPLETED" ? "Hoàn tất" : run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    {run.recordsExamined}
                  </td>
                  <td className="px-4 py-3.5 text-emerald-700">
                    {run.matchedCount}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#16866f]">
                    {run.autoRecoveredCount}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-amber-700">
                    {run.mismatchCount}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {formatDateTime(run.completedAt ?? run.startedAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onInspectRun(run.id)}
                      className="h-8 gap-1 text-xs text-[#16866f]"
                    >
                      <Eye size={14} /> Xem kết quả
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {runs.length === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              Chưa có phiên đối soát nào được thực hiện.
            </p>
          )}
        </div>
      </section>

      {selectedRunDetail && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-[#163d36]">
                Báo cáo chi tiết phiên đối soát {selectedRunDetail.run.code}
              </h3>
              <p className="text-xs text-slate-500">
                Ghi nhận {selectedRunDetail.issues.length} mục chênh lệch hoặc
                đã được hệ thống tự động khắc phục
              </p>
            </div>
          </div>

          {selectedRunDetail.issues.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#f2fbf6] p-4 text-xs text-[#147853]">
              <CheckCircle2 size={16} /> Dữ liệu đơn hàng và tồn kho trên sàn
              khớp 100% với kho trung tâm.
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {selectedRunDetail.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#163d36]">
                        {ISSUE_TYPE_LABEL[issue.issueType] ?? issue.issueType}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          issue.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {issue.status === "RESOLVED"
                          ? "Đã tự động khắc phục"
                          : "Cần kiểm tra"}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Mã đối chiếu trên sàn:{" "}
                      <code>{issue.externalRef ?? "—"}</code>
                    </p>
                    {issue.resolutionNotes && (
                      <p className="mt-1 text-[#147853]">
                        {issue.resolutionNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
