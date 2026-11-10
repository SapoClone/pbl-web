import { useMemo, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CatalogVariant } from "@/api/catalog/variants"
import type { Stocktake, Warehouse } from "@/api/inventory/stock"
import type { Branch } from "@/api/platform/branches"

export type InventoryFormMode = "receipt" | "issue" | "transfer" | "stocktake" | "warehouse"

export type InventorySubmitValue = {
  warehouseId?: string
  fromWarehouseId?: string
  toWarehouseId?: string
  branchId?: string | null
  skuId?: string
  qty?: string
  unitCost?: number
  reasonCode?: "MANUAL_WITHDRAWAL" | "DAMAGED" | "DISPOSAL" | "SAMPLE" | "SUPPLIER_RETURN"
  code?: string
  name?: string
  kind?: Warehouse["kind"]
  isDefault?: boolean
  address?: string
  note?: string
}

const titles: Record<InventoryFormMode, { title: string; description: string }> = {
  receipt: { title: "Tạo phiếu nhập kho", description: "Phiếu được tạo ở trạng thái nháp và chỉ làm tăng tồn khi ghi sổ." },
  issue: { title: "Tạo phiếu xuất kho", description: "Phiếu xuất chỉ làm giảm tồn khả dụng sau khi được ghi sổ." },
  transfer: { title: "Tạo phiếu chuyển kho", description: "Hàng sẽ rời kho nguồn khi xuất chuyển và vào kho đích khi nhận hàng." },
  stocktake: { title: "Tạo phiếu kiểm kho", description: "Hệ thống chụp số lượng hiện tại để đối chiếu với số đếm thực tế." },
  warehouse: { title: "Thêm kho", description: "Tạo kho chi nhánh, kho trung tâm hoặc kho cách ly." }
}

const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const labelClass = "text-xs font-medium text-slate-600"

export function InventoryForm({ mode, warehouses, variants, branches, isPending, error, onClose, onSubmit }: {
  mode: InventoryFormMode
  warehouses: Warehouse[]
  variants: CatalogVariant[]
  branches: Branch[]
  isPending: boolean
  error?: string
  onClose: () => void
  onSubmit: (value: InventorySubmitValue) => Promise<void>
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses.find((item) => item.isDefault)?.id ?? warehouses[0]?.id ?? "")
  const [toWarehouseId, setToWarehouseId] = useState("")
  const [skuId, setSkuId] = useState("")
  const [qty, setQty] = useState("")
  const [unitCost, setUnitCost] = useState("")
  const [reasonCode, setReasonCode] = useState<InventorySubmitValue["reasonCode"]>("MANUAL_WITHDRAWAL")
  const [note, setNote] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [kind, setKind] = useState<Warehouse["kind"]>("BRANCH")
  const [branchId, setBranchId] = useState("")
  const [address, setAddress] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [localError, setLocalError] = useState("")
  const destinationWarehouses = useMemo(() => warehouses.filter((item) => item.id !== warehouseId && item.status === "ACTIVE"), [warehouseId, warehouses])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === "warehouse") {
      if (!code.trim() || !name.trim() || (kind === "BRANCH" && !branchId)) return setLocalError("Vui lòng nhập mã, tên kho và chi nhánh.")
      await onSubmit({ code: code.trim(), name: name.trim(), kind, branchId: kind === "BRANCH" ? branchId : null, isDefault, address: address.trim() || undefined })
      return
    }
    if (!warehouseId) return setLocalError("Vui lòng chọn kho.")
    if (mode === "stocktake") {
      await onSubmit({ warehouseId, skuId: skuId || undefined, note: note.trim() || undefined })
      return
    }
    if (!skuId || !qty || Number(qty) <= 0) return setLocalError("Vui lòng chọn sản phẩm và nhập số lượng dương.")
    if (mode === "transfer" && !toWarehouseId) return setLocalError("Vui lòng chọn kho nhận.")
    if (mode === "receipt" && unitCost && (!Number.isInteger(Number(unitCost)) || Number(unitCost) < 0)) return setLocalError("Giá vốn phải là số nguyên không âm.")
    await onSubmit({ warehouseId, fromWarehouseId: warehouseId, toWarehouseId, skuId, qty: Number(qty).toFixed(3), unitCost: unitCost ? Number(unitCost) : undefined, reasonCode, note: note.trim() || undefined })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/35 p-4 pt-16 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-semibold text-[#163d36]">{titles[mode].title}</h2><p className="mt-1 text-sm text-slate-500">{titles[mode].description}</p></div><button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {mode === "warehouse" ? <>
            <label className={labelClass}>Mã kho *<input className={inputClass} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WH-HCM-01" /></label>
            <label className={labelClass}>Tên kho *<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Kho chi nhánh HCM" /></label>
            <label className={labelClass}>Loại kho<select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as Warehouse["kind"])}><option value="BRANCH">Kho chi nhánh</option><option value="CENTRAL">Kho trung tâm</option><option value="QUARANTINE">Kho cách ly</option></select></label>
            {kind === "BRANCH" && <label className={labelClass}>Chi nhánh *<select className={inputClass} value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Chọn chi nhánh</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            <label className={`${labelClass} sm:col-span-2`}>Địa chỉ<input className={inputClass} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Đặt làm kho mặc định</label>
          </> : <>
            <label className={labelClass}>{mode === "transfer" ? "Kho xuất *" : "Kho *"}<select className={inputClass} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="">Chọn kho</option>{warehouses.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
            {mode === "transfer" && <label className={labelClass}>Kho nhận *<select className={inputClass} value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)}><option value="">Chọn kho nhận</option>{destinationWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>}
            <label className={`${labelClass} ${mode === "transfer" ? "sm:col-span-2" : ""}`}>Sản phẩm {mode === "stocktake" ? "(để trống để kiểm toàn kho)" : "*"}<select className={inputClass} value={skuId} onChange={(event) => setSkuId(event.target.value)}><option value="">{mode === "stocktake" ? "Toàn bộ sản phẩm trong kho" : "Chọn sản phẩm"}</option>{variants.map((item) => <option key={item.variantId} value={item.variantId}>{item.name}{item.label ? ` - ${item.label}` : ""} ({item.skuCode})</option>)}</select></label>
            {mode !== "stocktake" && <label className={labelClass}>Số lượng *<input className={inputClass} type="number" min="0.001" step="0.001" value={qty} onChange={(event) => setQty(event.target.value)} /></label>}
            {mode === "receipt" && <label className={labelClass}>Giá vốn / đơn vị<input className={inputClass} type="number" min="0" step="1" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></label>}
            {mode === "issue" && <label className={labelClass}>Lý do xuất<select className={inputClass} value={reasonCode} onChange={(event) => setReasonCode(event.target.value as InventorySubmitValue["reasonCode"])}><option value="MANUAL_WITHDRAWAL">Xuất thủ công</option><option value="DAMAGED">Hàng hỏng</option><option value="DISPOSAL">Tiêu hủy</option><option value="SAMPLE">Hàng mẫu</option><option value="SUPPLIER_RETURN">Trả nhà cung cấp</option></select></label>}
            <label className={`${labelClass} sm:col-span-2`}>Ghi chú<input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          </>}
        </div>
        {(localError || error) && <p className="mx-6 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{localError || error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button><Button type="submit" disabled={isPending} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{isPending ? "Đang lưu..." : mode === "warehouse" ? "Tạo kho" : "Tạo phiếu"}</Button></div>
      </form>
    </div>
  )
}

export function StocktakeCountForm({ stocktake, variants, isPending, error, onClose, onSubmit }: { stocktake: Stocktake; variants: CatalogVariant[]; isPending: boolean; error?: string; onClose: () => void; onSubmit: (counts: Array<{ skuId: string; countedQty: string; reason?: string }>) => Promise<void> }) {
  const [values, setValues] = useState(() => Object.fromEntries(stocktake.items.map((item) => [item.skuId, item.countedQty ?? item.snapshotOnHandQty ?? "0.000"])))
  const names = new Map(variants.map((item) => [item.variantId, `${item.name}${item.label ? ` - ${item.label}` : ""} (${item.skuCode})`]))
  const submit = async (event: FormEvent) => { event.preventDefault(); await onSubmit(stocktake.items.map((item) => ({ skuId: item.skuId, countedQty: Number(values[item.skuId] ?? 0).toFixed(3) }))) }
  return <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/35 p-4 pt-12 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex justify-between border-b px-6 py-5"><div><h2 className="text-lg font-semibold text-[#163d36]">Ghi nhận kiểm kho {stocktake.code}</h2><p className="mt-1 text-sm text-slate-500">Nhập số lượng đếm thực tế của từng sản phẩm.</p></div><button type="button" onClick={onClose}><X size={20} /></button></div><div className="max-h-[60vh] space-y-3 overflow-y-auto p-6">{stocktake.items.map((item) => <label key={item.skuId} className="grid items-center gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-[1fr_130px]"><span><b className="block text-sm text-slate-700">{names.get(item.skuId) ?? item.skuId}</b><small className="text-slate-400">Hệ thống: {item.snapshotOnHandQty}</small></span><input type="number" min="0" step="0.001" className={inputClass} value={values[item.skuId]} onChange={(event) => setValues((current) => ({ ...current, [item.skuId]: event.target.value }))} /></label>)}</div>{error && <p className="mx-6 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 border-t px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button type="submit" disabled={isPending} className="bg-[#16866f] text-white">{isPending ? "Đang lưu..." : "Lưu số đếm"}</Button></div></form></div>
}
