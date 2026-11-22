import { useMemo, useState, type FormEvent } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CatalogVariant } from "@/api/catalog/variants"
import type { Stocktake, Warehouse } from "@/api/inventory/stock"
import type { Branch } from "@/api/platform/branches"

export type InventoryFormMode =
  | "receipt"
  | "issue"
  | "transfer"
  | "stocktake"
  | "warehouse"

export type InventoryFormLineInput = {
  skuId: string
  qty: string
  unitCost?: number
}

export type InventorySubmitValue = {
  warehouseId?: string
  fromWarehouseId?: string
  toWarehouseId?: string
  branchId?: string | null
  skuId?: string
  skuIds?: string[]
  qty?: string
  unitCost?: number
  autoPost?: boolean
  items?: InventoryFormLineInput[]
  reasonCode?:
    | "MANUAL_WITHDRAWAL"
    | "DAMAGED"
    | "DISPOSAL"
    | "SAMPLE"
    | "SUPPLIER_RETURN"
  code?: string
  name?: string
  kind?: Warehouse["kind"]
  isDefault?: boolean
  address?: string
  note?: string
}

const titles: Record<InventoryFormMode, { title: string; description: string }> =
  {
    receipt: {
      title: "Tạo phiếu nhập kho",
      description:
        "Thêm một hoặc nhiều dòng SKU. Có thể lưu nháp hoặc ghi sổ tăng tồn ngay."
    },
    issue: {
      title: "Tạo phiếu xuất kho",
      description:
        "Xuất kho nhiều mặt hàng cùng lúc và tự động ghi nhận vào sổ cái tồn kho."
    },
    transfer: {
      title: "Tạo phiếu chuyển kho",
      description:
        "Điều chuyển một hoặc nhiều SKU từ kho nguồn sang kho đích (theo dõi hàng đang chuyển)."
    },
    stocktake: {
      title: "Tạo phiếu kiểm kho",
      description:
        "Hệ thống chụp tồn kho tức thời (snapshot) để đối chiếu với số đếm thực tế."
    },
    warehouse: {
      title: "Thêm kho mới",
      description: "Tạo kho chi nhánh, kho trung tâm hoặc kho cách ly hàng lỗi."
    }
  }

const inputClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const labelClass = "text-xs font-medium text-slate-600"
const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`

type DraftLine = {
  id: string
  skuId: string
  qty: string
  unitCost: string
}

export function InventoryForm({
  mode,
  warehouses,
  variants,
  branches,
  isPending,
  error,
  onClose,
  onSubmit
}: {
  mode: InventoryFormMode
  warehouses: Warehouse[]
  variants: CatalogVariant[]
  branches: Branch[]
  isPending: boolean
  error?: string
  onClose: () => void
  onSubmit: (value: InventorySubmitValue) => Promise<void>
}) {
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((item) => item.isDefault)?.id ?? warehouses[0]?.id ?? ""
  )
  const [toWarehouseId, setToWarehouseId] = useState("")
  const [lines, setLines] = useState<DraftLine[]>([
    { id: "line-1", skuId: "", qty: "1", unitCost: "" }
  ])
  const [stocktakeSkuIds, setStocktakeSkuIds] = useState<string[]>([])
  const [autoPost, setAutoPost] = useState(false)
  const [reasonCode, setReasonCode] =
    useState<InventorySubmitValue["reasonCode"]>("MANUAL_WITHDRAWAL")
  const [note, setNote] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [kind, setKind] = useState<Warehouse["kind"]>("BRANCH")
  const [branchId, setBranchId] = useState("")
  const [address, setAddress] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [localError, setLocalError] = useState("")

  const destinationWarehouses = useMemo(
    () =>
      warehouses.filter(
        (item) => item.id !== warehouseId && item.status === "ACTIVE"
      ),
    [warehouseId, warehouses]
  )

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length}`,
        skuId: "",
        qty: "1",
        unitCost: ""
      }
    ])
  }

  const updateLine = (
    id: string,
    field: keyof Omit<DraftLine, "id">,
    value: string
  ) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line
        if (field === "skuId") {
          const found = variants.find((v) => v.variantId === value)
          return {
            ...line,
            skuId: value,
            unitCost:
              !line.unitCost && found?.price
                ? String(Math.round(found.price * 0.65))
                : line.unitCost
          }
        }
        return { ...line, [field]: value }
      })
    )
  }

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev))
  }

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        const q = Number(l.qty) || 0
        const c = Number(l.unitCost) || 0
        return {
          qty: acc.qty + q,
          amount: acc.amount + q * c
        }
      },
      { qty: 0, amount: 0 }
    )
  }, [lines])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError("")

    if (mode === "warehouse") {
      if (!code.trim() || !name.trim() || (kind === "BRANCH" && !branchId))
        return setLocalError("Vui lòng nhập mã, tên kho và chi nhánh.")
      await onSubmit({
        code: code.trim(),
        name: name.trim(),
        kind,
        branchId: kind === "BRANCH" ? branchId : null,
        isDefault,
        address: address.trim() || undefined
      })
      return
    }

    if (!warehouseId) return setLocalError("Vui lòng chọn kho thao tác.")

    if (mode === "stocktake") {
      await onSubmit({
        warehouseId,
        skuId: stocktakeSkuIds[0] || undefined,
        skuIds: stocktakeSkuIds.length > 0 ? stocktakeSkuIds : undefined,
        note: note.trim() || undefined
      })
      return
    }

    if (mode === "transfer" && !toWarehouseId)
      return setLocalError("Vui lòng chọn kho nhận.")

    const validLines: InventoryFormLineInput[] = []
    const seenSkus = new Set<string>()
    for (const line of lines) {
      if (!line.skuId || !line.qty || Number(line.qty) <= 0) {
        return setLocalError(
          "Vui lòng chọn sản phẩm và nhập số lượng dương cho tất cả các dòng."
        )
      }
      if (seenSkus.has(line.skuId)) {
        return setLocalError(
          "Một sản phẩm đang bị chọn trùng trên nhiều dòng. Hãy gộp số lượng."
        )
      }
      seenSkus.add(line.skuId)
      if (
        mode === "receipt" &&
        line.unitCost &&
        (!Number.isInteger(Number(line.unitCost)) || Number(line.unitCost) < 0)
      ) {
        return setLocalError("Giá vốn phải là số nguyên không âm (VND).")
      }
      validLines.push({
        skuId: line.skuId,
        qty: Number(line.qty).toFixed(3),
        unitCost: line.unitCost ? Number(line.unitCost) : undefined
      })
    }

    const first = validLines[0]
    await onSubmit({
      warehouseId,
      fromWarehouseId: warehouseId,
      toWarehouseId,
      skuId: first.skuId,
      qty: first.qty,
      unitCost: first.unitCost,
      items: validLines,
      autoPost,
      reasonCode,
      note: note.trim() || undefined
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/35 p-4 pt-12 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#163d36]">
              {titles[mode].title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {titles[mode].description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {mode === "warehouse" ? (
            <>
              <label className={labelClass}>
                Mã kho *
                <input
                  className={inputClass}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  placeholder="WH-HCM-01"
                />
              </label>
              <label className={labelClass}>
                Tên kho *
                <input
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Kho chi nhánh HCM"
                />
              </label>
              <label className={labelClass}>
                Loại kho
                <select
                  className={inputClass}
                  value={kind}
                  onChange={(event) =>
                    setKind(event.target.value as Warehouse["kind"])
                  }
                >
                  <option value="BRANCH">Kho chi nhánh</option>
                  <option value="CENTRAL">Kho trung tâm</option>
                  <option value="QUARANTINE">Kho cách ly</option>
                </select>
              </label>
              {kind === "BRANCH" && (
                <label className={labelClass}>
                  Chi nhánh *
                  <select
                    className={inputClass}
                    value={branchId}
                    onChange={(event) => setBranchId(event.target.value)}
                  >
                    <option value="">Chọn chi nhánh</option>
                    {branches.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className={`${labelClass} sm:col-span-2`}>
                Địa chỉ
                <input
                  className={inputClass}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) => setIsDefault(event.target.checked)}
                />{" "}
                Đặt làm kho mặc định
              </label>
            </>
          ) : (
            <>
              <label className={labelClass}>
                {mode === "transfer" ? "Kho xuất *" : "Kho *"}
                <select
                  className={inputClass}
                  value={warehouseId}
                  onChange={(event) => setWarehouseId(event.target.value)}
                >
                  <option value="">Chọn kho</option>
                  {warehouses
                    .filter((item) => item.status === "ACTIVE")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                </select>
              </label>

              {mode === "transfer" && (
                <label className={labelClass}>
                  Kho nhận *
                  <select
                    className={inputClass}
                    value={toWarehouseId}
                    onChange={(event) => setToWarehouseId(event.target.value)}
                  >
                    <option value="">Chọn kho nhận</option>
                    {destinationWarehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {mode === "issue" && (
                <label className={labelClass}>
                  Lý do xuất
                  <select
                    className={inputClass}
                    value={reasonCode}
                    onChange={(event) =>
                      setReasonCode(
                        event.target.value as InventorySubmitValue["reasonCode"]
                      )
                    }
                  >
                    <option value="MANUAL_WITHDRAWAL">Xuất thủ công</option>
                    <option value="DAMAGED">Hàng hỏng</option>
                    <option value="DISPOSAL">Tiêu hủy</option>
                    <option value="SAMPLE">Hàng mẫu</option>
                    <option value="SUPPLIER_RETURN">Trả nhà cung cấp</option>
                  </select>
                </label>
              )}

              {mode === "stocktake" ? (
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className={labelClass}>
                      Phạm vi sản phẩm kiểm kho{" "}
                      <span className="font-normal text-slate-400">
                        (Không chọn = Kiểm toàn bộ kho)
                      </span>
                    </span>
                    {stocktakeSkuIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStocktakeSkuIds([])}
                        className="text-xs font-medium text-[#16866f] hover:underline"
                      >
                        Chọn kiểm toàn kho ({stocktakeSkuIds.length} đã chọn)
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-2">
                    {variants.map((item) => {
                      const checked = stocktakeSkuIds.includes(item.variantId)
                      return (
                        <label
                          key={item.variantId}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                            checked
                              ? "border-[#16866f] bg-[#e6f5ee]/60 font-medium text-[#163d36]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setStocktakeSkuIds((prev) =>
                                e.target.checked
                                  ? [...prev, item.variantId]
                                  : prev.filter((id) => id !== item.variantId)
                              )
                            }
                            className="accent-[#16866f]"
                          />
                          <span className="truncate">
                            {item.name}
                            {item.label ? ` - ${item.label}` : ""} (
                            {item.skuCode})
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={labelClass}>
                      Danh sách hàng hóa ({lines.length} dòng) *
                    </span>
                    <button
                      type="button"
                      onClick={addLine}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#e6f5ee] px-2.5 py-1 text-xs font-semibold text-[#16866f] transition hover:bg-[#d4ede2]"
                    >
                      <Plus size={13} /> Thêm dòng SKU
                    </button>
                  </div>

                  <div className="max-h-64 space-y-2.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    {lines.map((line, index) => (
                      <div
                        key={line.id}
                        className={`grid items-end gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 ${
                          mode === "receipt"
                            ? "sm:grid-cols-[1fr_110px_140px_36px]"
                            : "sm:grid-cols-[1fr_130px_36px]"
                        }`}
                      >
                        <label className="text-[11px] font-medium text-slate-600">
                          Sản phẩm #{index + 1} *
                          <select
                            className={inputClass}
                            value={line.skuId}
                            onChange={(e) =>
                              updateLine(line.id, "skuId", e.target.value)
                            }
                          >
                            <option value="">Chọn sản phẩm</option>
                            {variants.map((item) => (
                              <option
                                key={item.variantId}
                                value={item.variantId}
                              >
                                {item.name}
                                {item.label ? ` - ${item.label}` : ""} (
                                {item.skuCode})
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-[11px] font-medium text-slate-600">
                          Số lượng *
                          <input
                            className={inputClass}
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(line.id, "qty", e.target.value)
                            }
                          />
                        </label>

                        {mode === "receipt" && (
                          <label className="text-[11px] font-medium text-slate-600">
                            Giá vốn / ĐV (₫)
                            <input
                              className={inputClass}
                              type="number"
                              min="0"
                              step="1"
                              placeholder="Tùy chọn"
                              value={line.unitCost}
                              onChange={(e) =>
                                updateLine(line.id, "unitCost", e.target.value)
                              }
                            />
                          </label>
                        )}

                        <button
                          type="button"
                          disabled={lines.length === 1}
                          onClick={() => removeLine(line.id)}
                          title="Xóa dòng"
                          className="flex h-10 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f4fbf8] px-3.5 py-2 text-xs text-slate-600">
                    <span>
                      Tổng số lượng:{" "}
                      <b className="text-[#163d36]">
                        {totals.qty.toLocaleString("vi-VN", {
                          maximumFractionDigits: 3
                        })}
                      </b>
                    </span>
                    {mode === "receipt" && (
                      <span>
                        Tổng giá trị nhập dự kiến:{" "}
                        <b className="text-[#16866f]">{money(totals.amount)}</b>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <label className={`${labelClass} sm:col-span-2`}>
                Ghi chú chứng từ
                <input
                  className={inputClass}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Nhập số hóa đơn gốc, người giao nhận hoặc ghi chú nội bộ..."
                />
              </label>

              {(mode === "receipt" || mode === "issue") && (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={autoPost}
                    onChange={(e) => setAutoPost(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#16866f]"
                  />
                  <span>
                    Ghi sổ ngay sau khi tạo phiếu (cập nhật tồn kho tức thì)
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        {(localError || error) && (
          <p className="mx-6 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {localError || error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            {isPending
              ? "Đang lưu..."
              : mode === "warehouse"
                ? "Tạo kho"
                : autoPost
                  ? "Tạo & Ghi sổ ngay"
                  : "Tạo phiếu"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function StocktakeCountForm({
  stocktake,
  variants,
  isPending,
  error,
  onClose,
  onSubmit
}: {
  stocktake: Stocktake
  variants: CatalogVariant[]
  isPending: boolean
  error?: string
  onClose: () => void
  onSubmit: (
    counts: Array<{ skuId: string; countedQty: string; reason?: string }>
  ) => Promise<void>
}) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      stocktake.items.map((item) => [
        item.skuId,
        item.countedQty ?? item.snapshotOnHandQty ?? "0.000"
      ])
    )
  )
  const names = new Map(
    variants.map((item) => [
      item.variantId,
      `${item.name}${item.label ? ` - ${item.label}` : ""} (${item.skuCode})`
    ])
  )
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit(
      stocktake.items.map((item) => ({
        skuId: item.skuId,
        countedQty: Number(values[item.skuId] ?? 0).toFixed(3)
      }))
    )
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/35 p-4 pt-12 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#163d36]">
              Ghi nhận kiểm kho {stocktake.code}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Nhập số lượng đếm thực tế của từng sản phẩm.
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">
          {stocktake.items.map((item) => {
            const snap = Number(item.snapshotOnHandQty ?? 0)
            const cur = Number(values[item.skuId] ?? 0)
            const diff = cur - snap
            return (
              <label
                key={item.skuId}
                className="grid items-center gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1fr_140px]"
              >
                <span>
                  <b className="block text-sm text-slate-700">
                    {names.get(item.skuId) ?? item.skuId}
                  </b>
                  <small className="text-slate-400">
                    Hệ thống: {item.snapshotOnHandQty}{" "}
                    {diff !== 0 && (
                      <span
                        className={`ml-2 font-semibold ${
                          diff > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        ({diff > 0 ? "+" : ""}
                        {diff.toLocaleString("vi-VN", {
                          maximumFractionDigits: 3
                        })}
                        )
                      </span>
                    )}
                  </small>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className={inputClass}
                  value={values[item.skuId]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [item.skuId]: event.target.value
                    }))
                  }
                />
              </label>
            )
          })}
        </div>
        {error && (
          <p className="mx-6 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-[#16866f] text-white"
          >
            {isPending ? "Đang lưu..." : "Lưu số đếm"}
          </Button>
        </div>
      </form>
    </div>
  )
}
