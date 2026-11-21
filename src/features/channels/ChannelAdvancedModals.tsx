import { type FormEvent, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Boxes,
  Calculator,
  CheckCircle2,
  Link2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Warehouse,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedSwitch, CopyCodeBadge } from "@/components/ui/micro-ux"
import type { CatalogVariant } from "@/api/catalog/variants"
import type { InventoryWarehouse } from "@/api/inventory/warehouses"
import type {
  AutoMatchCandidate,
  AutoMatchConfidence,
  AutoMatchPreviewResponse,
  AutoMatchSelectedPair,
  ChannelConnection,
  SkuMapping,
  SyncConflict,
  UpdateChannelConnectionInput
} from "@/api/integration"

const formatVnd = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : `${Math.round(n).toLocaleString("vi-VN")}đ`

function normalizeSkuToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[-_\s]+(LZD|LAZADA|SHP|SHOPEE)$/i, "")
    .replace(/[^A-Z0-9]/g, "")
}

export function buildDemoAutoMatchPreview(
  connectionId: string,
  existingMappings: SkuMapping[],
  variants: CatalogVariant[],
  conflicts: SyncConflict[]
): AutoMatchPreviewResponse {
  const mappedKeys = new Set(
    existingMappings
      .filter((m) => m.connectionId === connectionId)
      .map((m) => `${m.externalItemId}:${m.externalSkuId}`)
  )

  const demoMarketplaceCatalog = [
    {
      externalItemId: "13504402059",
      externalSkuId: "117553898643",
      externalSkuCode: "TER-500-GRN",
      externalProductName: "Bình giữ nhiệt Terra 500ml Chính Hãng",
      externalPrice: 420000
    },
    {
      externalItemId: "13504409981",
      externalSkuId: "117553911220",
      externalSkuCode: "TOT-DAILY-01",
      externalProductName: "Túi tote canvas Daily chống thấm nhẹ",
      externalPrice: 185000
    },
    {
      externalItemId: "13504881101",
      externalSkuId: "11758800101",
      externalSkuCode: "TEA-OOLONG-250",
      externalProductName:
        "[Lazada Mall] Trà Ô Long Thượng Hạng Mộc Châu Hộp Thiếc 250g",
      externalPrice: 295000
    },
    {
      externalItemId: "13504881102",
      externalSkuId: "11758800102",
      externalSkuCode: "8938501234005",
      externalProductName: "Khay trà tre ép thủ công chống nước cao cấp Cỡ L",
      externalPrice: 360000
    },
    {
      externalItemId: "13504889999",
      externalSkuId: "11758809999",
      externalSkuCode: "GIFT-LIMITED-XMAS",
      externalProductName: "Set Quà Giáng Sinh Phiên Bản Sàn Độc Quyền",
      externalPrice: 550000
    }
  ]

  const exactBySku = new Map<string, CatalogVariant>()
  const normBySku = new Map<string, CatalogVariant>()
  const exactByBarcode = new Map<string, CatalogVariant>()

  for (const v of variants) {
    exactBySku.set(v.skuCode.trim().toUpperCase(), v)
    const norm = normalizeSkuToken(v.skuCode)
    if (norm && !normBySku.has(norm)) {
      normBySku.set(norm, v)
    }
    if (v.barcode?.trim()) {
      exactByBarcode.set(v.barcode.trim().toUpperCase(), v)
    }
  }

  let alreadyMappedCount = 0
  const candidates: AutoMatchCandidate[] = []
  const seenKeys = new Set<string>()

  const pushCandidate = (raw: {
    externalItemId: string
    externalSkuId: string
    externalSkuCode: string | null
    externalProductName: string
    externalPrice: number | null
    source: "MARKETPLACE_LISTING" | "OPEN_CONFLICT"
    conflictId: string | null
  }) => {
    const key = `${raw.externalItemId}:${raw.externalSkuId}`
    if (mappedKeys.has(key)) {
      alreadyMappedCount += 1
      return
    }
    if (seenKeys.has(key)) return
    seenKeys.add(key)

    const token = (raw.externalSkuCode ?? raw.externalSkuId).trim()
    const upper = token.toUpperCase()
    const norm = normalizeSkuToken(token)

    let matchedVariant: CatalogVariant | undefined
    let confidence: AutoMatchConfidence = "UNMATCHED"

    if (upper && exactBySku.has(upper)) {
      matchedVariant = exactBySku.get(upper)
      confidence = "EXACT_SKU"
    } else if (upper && exactByBarcode.has(upper)) {
      matchedVariant = exactByBarcode.get(upper)
      confidence = "BARCODE"
    } else if (norm && normBySku.has(norm)) {
      matchedVariant = normBySku.get(norm)
      confidence = "NORMALIZED_SKU"
    }

    candidates.push({
      externalItemId: raw.externalItemId,
      externalSkuId: raw.externalSkuId,
      externalSkuCode: raw.externalSkuCode,
      externalProductName: raw.externalProductName,
      externalPrice: raw.externalPrice,
      source: raw.source,
      conflictId: raw.conflictId,
      matched: Boolean(matchedVariant),
      confidence,
      internalVariantId: matchedVariant?.variantId ?? null,
      internalProductId: matchedVariant?.productId ?? null,
      internalSkuCode: matchedVariant?.skuCode ?? null,
      internalVariantName: matchedVariant
        ? `${matchedVariant.name} (${matchedVariant.label})`
        : null,
      internalBasePrice: matchedVariant?.price ?? null,
      priceDelta:
        matchedVariant && raw.externalPrice !== null
          ? raw.externalPrice - matchedVariant.price
          : null
    })
  }

  for (const item of demoMarketplaceCatalog) {
    pushCandidate({
      ...item,
      source: "MARKETPLACE_LISTING",
      conflictId: null
    })
  }

  for (const c of conflicts) {
    if (
      c.connectionId !== connectionId ||
      c.conflictType !== "SKU_UNMAPPED" ||
      c.status !== "OPEN"
    ) {
      continue
    }
    const details = (c.details ?? {}) as Record<string, unknown>
    const sellerSku =
      typeof details.externalSkuCode === "string"
        ? details.externalSkuCode
        : c.externalSkuId ?? "UNKNOWN_SKU"
    pushCandidate({
      externalItemId: c.externalItemId ?? "UNKNOWN_ITEM",
      externalSkuId: c.externalSkuId ?? "UNKNOWN_SKU",
      externalSkuCode: sellerSku,
      externalProductName: `Sản phẩm từ đơn xung đột #${c.externalOrderId ?? c.code}`,
      externalPrice: 260000,
      source: "OPEN_CONFLICT",
      conflictId: c.id
    })
  }

  candidates.sort((a, b) => Number(b.matched) - Number(a.matched))
  const matchedCount = candidates.filter((c) => c.matched).length

  return {
    dryRun: true,
    connectionId,
    totalScanned: candidates.length + alreadyMappedCount,
    alreadyMappedCount,
    matchedCount,
    unmatchedCount: candidates.length - matchedCount,
    suggestions: candidates
  }
}

// ============================================================================
// 1. CONNECTION SYNC CONFIGURATION MODAL
// ============================================================================

export function ConnectionSyncConfigModal({
  connection,
  warehouses,
  pending,
  onClose,
  onSave
}: {
  connection: ChannelConnection
  warehouses: InventoryWarehouse[]
  pending: boolean
  onClose: () => void
  onSave: (
    connectionId: string,
    input: UpdateChannelConnectionInput
  ) => Promise<void>
}) {
  const [shopName, setShopName] = useState(connection.shopName)
  const [warehouseId, setWarehouseId] = useState(connection.warehouseId ?? "")
  const [safetyBuffer, setSafetyBuffer] = useState(
    String(connection.safetyStockBuffer ?? 2)
  )
  const [allocationPct, setAllocationPct] = useState(
    String(connection.stockAllocationPercent ?? 100)
  )
  const [autoSyncInventory, setAutoSyncInventory] = useState(
    connection.autoSyncInventory !== false
  )
  const [sampleAvailableStock, setSampleAvailableStock] = useState("50")

  const branchWarehouses = useMemo(() => {
    const scoped = warehouses.filter((w) => w.branchId === connection.branchId)
    return scoped.length > 0 ? scoped : warehouses
  }, [warehouses, connection.branchId])

  const formulaPreview = useMemo(() => {
    const avail = Math.max(0, Math.floor(Number(sampleAvailableStock) || 0))
    const pct = Math.min(100, Math.max(0, Math.round(Number(allocationPct) || 0)))
    const buffer = Math.max(0, Math.floor(Number(safetyBuffer) || 0))
    const allocated = Math.floor((avail * pct) / 100)
    const publishable = Math.max(0, allocated - buffer)
    return { avail, pct, buffer, allocated, publishable }
  }, [sampleAvailableStock, allocationPct, safetyBuffer])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSave(connection.id, {
      shopName: shopName.trim() || connection.shopName,
      warehouseId: warehouseId || null,
      safetyStockBuffer: Math.max(0, Math.floor(Number(safetyBuffer) || 0)),
      stockAllocationPercent: Math.min(
        100,
        Math.max(0, Math.round(Number(allocationPct) || 0))
      ),
      autoSyncInventory
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#163d36]/35 p-4 backdrop-blur-sm">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f5ee] text-[#16866f]">
              <SlidersHorizontal size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[#163d36]">
                Cấu hình Đồng bộ Tồn kho — {connection.shopName}
              </h3>
              <p className="text-xs text-slate-400">
                Gian hàng [{connection.provider}] #{connection.externalShopId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Auto-Push Toggle Banner */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-[#16866f]/25 bg-[#f2fbf6] p-4">
            <div>
              <p className="text-sm font-semibold text-[#163d36]">
                Tự động đẩy tồn kho khả dụng lên sàn (Real-time Push)
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Khi phát sinh đơn POS, nhập kho hoặc trả hàng, hệ thống tự động
                tính lại và cập nhật số lượng bán trên {connection.provider}.
              </p>
            </div>
            <AnimatedSwitch
              checked={autoSyncInventory}
              onChange={setAutoSyncInventory}
              label="Bật tự động đẩy tồn kho"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              Tên hiển thị gian hàng
              <input
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="block text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Warehouse size={13} className="text-slate-400" />
                Kho nguồn cung cấp tồn cho sàn
              </span>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#16866f]"
              >
                <option value="">Tổng hợp tất cả kho thuộc chi nhánh</option>
                {branchWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-600">
              Tồn kho an toàn giữ lại (safetyStockBuffer)
              <input
                type="number"
                min={0}
                max={10000}
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold tabular-nums text-slate-800 outline-none focus:border-[#16866f]"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Ngăn chặn bán vượt tồn (Overselling) khi Flash Sale diễn ra.
              </span>
            </label>

            <div className="block text-xs font-medium text-slate-600">
              <div className="flex items-center justify-between">
                <span>Tỷ lệ phân bổ tồn lên sàn (%)</span>
                <b className="tabular-nums text-[#147853]">
                  {formulaPreview.pct}%
                </b>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={formulaPreview.pct}
                  onChange={(e) => setAllocationPct(e.target.value)}
                  className="h-2 flex-1 cursor-pointer accent-[#16866f]"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={allocationPct}
                  onChange={(e) => setAllocationPct(e.target.value)}
                  className="h-9 w-16 rounded-lg border border-slate-200 px-2 text-center text-xs font-semibold tabular-nums outline-none focus:border-[#16866f]"
                />
              </div>
              <span className="mt-1 block text-[11px] text-slate-400">
                VD: Đặt 80% để dành 20% hàng ưu tiên cho khách mua tại quầy POS.
              </span>
            </div>
          </div>

          {/* Live Publishable Stock Formula Simulator */}
          <div className="rounded-xl border border-slate-200 bg-[#fbfcfc] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#163d36]">
                <Calculator size={14} className="text-[#16866f]" />
                Mô phỏng số tồn thực tế đẩy lên {connection.provider}
              </span>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                Giả sử kho đang có:
                <input
                  type="number"
                  min={0}
                  value={sampleAvailableStock}
                  onChange={(e) => setSampleAvailableStock(e.target.value)}
                  className="h-7 w-20 rounded-md border border-slate-200 bg-white px-2 text-right text-xs font-semibold tabular-nums"
                />
                <span>SP</span>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-4 py-3 text-xs">
              <div className="font-mono text-slate-600">
                max(0, ⌊{formulaPreview.avail} × {formulaPreview.pct}%⌋ −{" "}
                {formulaPreview.buffer}) = max(0, {formulaPreview.allocated} −{" "}
                {formulaPreview.buffer})
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Số tồn hiển thị trên sàn:</span>
                <span className="rounded-lg bg-[#e6f5ee] px-2.5 py-1 text-sm font-bold tabular-nums text-[#147853]">
                  {formulaPreview.publishable} SP
                </span>
              </div>
            </div>

            {!autoSyncInventory ? (
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                <AlertTriangle size={13} />
                Chế độ tự động đẩy tồn đang TẮT — Hệ thống chỉ đẩy tồn khi bạn
                bấm nút &quot;Đẩy tồn kho&quot; thủ công.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="gap-1.5 bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            <Boxes size={15} />
            {pending ? "Đang lưu..." : "Lưu cấu hình đồng bộ"}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ============================================================================
// 2. BULK AUTO-MATCH SKU MODAL
// ============================================================================

const CONFIDENCE_META: Record<
  AutoMatchConfidence,
  { label: string; cls: string }
> = {
  EXACT_SKU: {
    label: "Trùng mã SKU 100%",
    cls: "bg-[#e6f5ee] text-[#147853] border-emerald-200"
  },
  BARCODE: {
    label: "Khớp mã vạch Barcode",
    cls: "bg-sky-50 text-sky-700 border-sky-200"
  },
  NORMALIZED_SKU: {
    label: "Khớp mã chuẩn hóa",
    cls: "bg-indigo-50 text-indigo-700 border-indigo-200"
  },
  UNMATCHED: {
    label: "Chưa tìm thấy mã trùng",
    cls: "bg-amber-50 text-amber-800 border-amber-200"
  }
}

export function BulkAutoMatchSkuModal({
  connections,
  initialConnectionId,
  variants,
  scanning,
  committing,
  preview,
  onScanConnection,
  onCommitSelected,
  onClose
}: {
  connections: ChannelConnection[]
  initialConnectionId: string
  variants: CatalogVariant[]
  scanning: boolean
  committing: boolean
  preview: AutoMatchPreviewResponse | null
  onScanConnection: (connectionId: string) => Promise<void>
  onCommitSelected: (
    connectionId: string,
    pairs: AutoMatchSelectedPair[]
  ) => Promise<void>
  onClose: () => void
}) {
  const [connectionId, setConnectionId] = useState(
    initialConnectionId || connections[0]?.id || ""
  )
  const [filterMode, setFilterMode] = useState<"ALL" | "MATCHED" | "UNMATCHED">(
    "ALL"
  )
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({})
  const [variantOverrides, setVariantOverrides] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    if (connectionId) {
      void onScanConnection(connectionId)
    }
  }, [connectionId])

  useEffect(() => {
    if (!preview) return
    const nextSel: Record<string, boolean> = {}
    const nextOverrides: Record<string, string> = {}
    for (const s of preview.suggestions) {
      const k = `${s.externalItemId}:${s.externalSkuId}`
      if (s.internalVariantId) {
        nextSel[k] = true
        nextOverrides[k] = s.internalVariantId
      }
    }
    setSelectedKeys(nextSel)
    setVariantOverrides(nextOverrides)
  }, [preview])

  const filteredSuggestions = useMemo(() => {
    const list = preview?.suggestions ?? []
    if (filterMode === "MATCHED") return list.filter((s) => s.matched)
    if (filterMode === "UNMATCHED") return list.filter((s) => !s.matched)
    return list
  }, [preview, filterMode])

  const readyPairs = useMemo(() => {
    const list = preview?.suggestions ?? []
    const out: AutoMatchSelectedPair[] = []
    for (const s of list) {
      const k = `${s.externalItemId}:${s.externalSkuId}`
      const chosenVariantId = variantOverrides[k] || s.internalVariantId
      if (selectedKeys[k] && chosenVariantId) {
        out.push({
          externalItemId: s.externalItemId,
          externalSkuId: s.externalSkuId,
          externalSkuCode: s.externalSkuCode ?? undefined,
          externalProductName: s.externalProductName,
          externalPrice: s.externalPrice ?? undefined,
          internalVariantId: chosenVariantId
        })
      }
    }
    return out
  }, [preview, selectedKeys, variantOverrides])

  const toggleAllVisible = (checked: boolean) => {
    const next = { ...selectedKeys }
    for (const s of filteredSuggestions) {
      const k = `${s.externalItemId}:${s.externalSkuId}`
      const hasVariant = Boolean(variantOverrides[k] || s.internalVariantId)
      if (hasVariant) {
        next[k] = checked
      }
    }
    setSelectedKeys(next)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#163d36]/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f5ee] text-[#16866f]">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[#163d36]">
                Gợi ý Nối SKU Hàng loạt (Auto-Match Catalog & Sàn TMĐT)
              </h3>
              <p className="text-xs text-slate-400">
                Tự động đối chiếu SellerSKU, Mã vạch Barcode và mã chuẩn hóa để
                liên kết hàng loạt chỉ với 1 cú nhấp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scan Bar & KPIs */}
        <div className="border-b border-slate-100 bg-[#f7faf9] px-6 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-600">
                Gian hàng quét:
              </span>
              <select
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#163d36] outline-none"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.provider}] {c.shopName} ({c.externalShopId})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={scanning || !connectionId}
                onClick={() => void onScanConnection(connectionId)}
                className="h-9 gap-1.5 bg-white text-xs"
              >
                <RefreshCw
                  size={13}
                  className={scanning ? "animate-spin" : ""}
                />
                Quét lại danh mục sàn
              </Button>
            </div>

            {preview ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-white px-2.5 py-1 font-medium text-slate-600 shadow-2xs">
                  Đã quét: <b>{preview.totalScanned}</b> SP
                </span>
                <span className="rounded-lg bg-[#e6f5ee] px-2.5 py-1 font-semibold text-[#147853]">
                  Gợi ý khớp: <b>{preview.matchedCount}</b> mã
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
                  Đã liên kết sẵn: <b>{preview.alreadyMappedCount}</b>
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  {
                    id: "ALL",
                    label: `Tất cả chưa nối (${preview?.suggestions.length ?? 0})`
                  },
                  {
                    id: "MATCHED",
                    label: `Đã tìm thấy SKU khớp (${preview?.matchedCount ?? 0})`
                  },
                  {
                    id: "UNMATCHED",
                    label: `Cần chọn thủ công (${preview?.unmatchedCount ?? 0})`
                  }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    filterMode === tab.id
                      ? "bg-[#16866f] text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => toggleAllVisible(true)}
                className="font-semibold text-[#16866f] hover:underline"
              >
                Chọn tất cả mã khớp
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => toggleAllVisible(false)}
                className="text-slate-500 hover:underline"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions Table */}
        <div className="flex-1 overflow-y-auto">
          {scanning ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2
                size={32}
                className="mx-auto text-[#16866f] opacity-80"
              />
              <p className="mt-2 text-sm font-semibold text-[#163d36]">
                Tất cả sản phẩm trong bộ lọc này đã được liên kết hoàn tất!
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Không còn mã hàng mới chưa ánh xạ trên gian hàng.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="sticky top-0 bg-[#fbfcfc] text-[10px] uppercase tracking-wider text-slate-400 shadow-2xs">
                <tr>
                  <th className="w-10 px-4 py-3">Chọn</th>
                  <th className="px-4 py-3">Sản phẩm & SellerSKU trên sàn</th>
                  <th className="px-4 py-3">Độ tin cậy gợi ý</th>
                  <th className="px-4 py-3">Biến thể Catalog nội bộ nối vào</th>
                  <th className="px-4 py-3 text-right">Đối chiếu giá bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuggestions.map((cand) => {
                  const key = `${cand.externalItemId}:${cand.externalSkuId}`
                  const chosenVariantId =
                    variantOverrides[key] ?? cand.internalVariantId ?? ""
                  const chosenVariant = variants.find(
                    (v) => v.variantId === chosenVariantId
                  )
                  const checked = Boolean(selectedKeys[key] && chosenVariantId)
                  const confMeta = CONFIDENCE_META[cand.confidence]
                  const delta =
                    chosenVariant && cand.externalPrice !== null
                      ? cand.externalPrice - chosenVariant.price
                      : cand.priceDelta

                  return (
                    <tr
                      key={key}
                      className={
                        checked ? "bg-[#f2fbf6]/50" : "hover:bg-slate-50"
                      }
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          disabled={!chosenVariantId}
                          checked={checked}
                          onChange={(e) =>
                            setSelectedKeys({
                              ...selectedKeys,
                              [key]: e.target.checked
                            })
                          }
                          aria-label={`Chọn nối ${cand.externalSkuCode ?? cand.externalSkuId}`}
                          className="h-4 w-4 rounded border-slate-300 text-[#16866f]"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CopyCodeBadge
                            code={cand.externalSkuCode || cand.externalSkuId}
                            variant="mono"
                          />
                          {cand.source === "OPEN_CONFLICT" ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                              Đang kẹt đơn xung đột
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 font-semibold text-[#163d36]">
                          {cand.externalProductName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          ItemID: {cand.externalItemId} · SkuID:{" "}
                          {cand.externalSkuId}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${confMeta.cls}`}
                        >
                          {confMeta.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <select
                          value={chosenVariantId}
                          onChange={(e) => {
                            const val = e.target.value
                            setVariantOverrides({
                              ...variantOverrides,
                              [key]: val
                            })
                            setSelectedKeys({
                              ...selectedKeys,
                              [key]: Boolean(val)
                            })
                          }}
                          className="h-9 w-full max-w-[290px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-[#163d36] outline-none focus:border-[#16866f]"
                        >
                          <option value="">-- Chọn SKU nội bộ để nối --</option>
                          {variants.map((v) => (
                            <option key={v.variantId} value={v.variantId}>
                              [{v.skuCode}] {v.name} ({v.label})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <p className="font-semibold text-slate-800">
                          Sàn: {formatVnd(cand.externalPrice)}
                        </p>
                        {chosenVariant ? (
                          <p
                            className={`text-[11px] font-medium ${
                              delta === 0
                                ? "text-emerald-600"
                                : "text-amber-700"
                            }`}
                          >
                            POS: {formatVnd(chosenVariant.price)}{" "}
                            {delta !== null && delta !== 0
                              ? `(${delta > 0 ? "+" : ""}${formatVnd(delta)})`
                              : "(Khớp giá)"}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            Đã chọn{" "}
            <b className="tabular-nums text-[#163d36]">{readyPairs.length}</b>{" "}
            cặp SKU sẵn sàng tạo liên kết & giải phóng đơn hàng bị chặn.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="button"
              disabled={committing || readyPairs.length === 0 || !connectionId}
              onClick={() => void onCommitSelected(connectionId, readyPairs)}
              className="gap-1.5 bg-[#16866f] text-white hover:bg-[#0f705d]"
            >
              <Link2 size={15} />
              {committing
                ? "Đang liên kết..."
                : `Xác nhận nối ${readyPairs.length} SKU đã chọn`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
