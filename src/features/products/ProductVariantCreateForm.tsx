import { X } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { CatalogProductAttribute, CreateCatalogVariantInput } from "@/api/catalog/products"
import type { Product } from "@/shared/dashboard/dashboard.types"

type Props = {
  product: Product
  attributes: CatalogProductAttribute[]
  onClose: () => void
  onCreated: (productId: string, input: CreateCatalogVariantInput) => Promise<void>
  onCreateAttribute: (productId: string, name: string) => Promise<CatalogProductAttribute>
  onCreateAttributeValue: (attributeId: string, value: string) => Promise<void>
}

const inputClass = "mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const labelClass = "text-xs font-medium text-slate-600"

const normalizeWeight = (weight: string) => {
  const trimmedWeight = weight.trim()
  return trimmedWeight.includes(".")
    ? trimmedWeight.replace(/0+$/, "").replace(/\.$/, "")
    : trimmedWeight
}

export function ProductVariantCreateForm({ product, attributes, onClose, onCreated, onCreateAttribute, onCreateAttributeValue }: Props) {
  const [draft, setDraft] = useState({
    skuCode: "",
    barcode: "",
    name: "",
    basePrice: "",
    weight: "",
    imageUrl: "",
    attributeValues: {} as Record<string, string>
  })
  const [newAttributeName, setNewAttributeName] = useState("")
  const [newValue, setNewValue] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const update = (field: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [field]: value }))
  const setAttributeValue = (attributeId: string, valueId: string) => setDraft((current) => ({ ...current, attributeValues: { ...current.attributeValues, [attributeId]: valueId } }))

  const addAttribute = async () => {
    if (!newAttributeName.trim()) return
    if (!product.id) {
      setError("Không xác định được sản phẩm.")
      return
    }
    try {
      await onCreateAttribute(product.id, newAttributeName.trim())
      setNewAttributeName("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo thuộc tính.")
    }
  }

  const addValue = async (attributeId: string) => {
    const value = newValue[attributeId]?.trim()
    if (!value) return
    try {
      await onCreateAttributeValue(attributeId, value)
      setNewValue((current) => ({ ...current, [attributeId]: "" }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo giá trị thuộc tính.")
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const basePrice = Number(draft.basePrice)
    if (!draft.skuCode.trim()) {
      setError("Vui lòng nhập SKU cho biến thể.")
      return
    }
    if (!Number.isInteger(basePrice) || basePrice < 0) {
      setError("Giá bán phải là số nguyên không âm.")
      return
    }
    if (!product.id) {
      setError("Không xác định được sản phẩm.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onCreated(product.id, {
        skuCode: draft.skuCode.trim(),
        ...(draft.barcode.trim() ? { barcode: draft.barcode.trim() } : {}),
        ...(draft.name.trim() ? { name: draft.name.trim() } : {}),
        basePrice,
        ...(draft.weight.trim() ? { weight: normalizeWeight(draft.weight) } : {}),
        ...(draft.imageUrl.trim() ? { imageUrl: draft.imageUrl.trim() } : {}),
        ...(Object.entries(draft.attributeValues).filter(([, valueId]) => valueId).length > 0
          ? {
              attributes: Object.entries(draft.attributeValues)
                .filter(([, valueId]) => valueId)
                .map(([attributeId, attributeValueId]) => ({ attributeId, attributeValueId }))
            }
          : {})
      })
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo biến thể.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-variant-title">
      <form onSubmit={submit} className="my-4 w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="create-variant-title" className="text-lg font-semibold text-[#163d36]">Thêm biến thể</h2>
            <p className="mt-1 text-xs text-slate-400">Sản phẩm: {product.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className={labelClass}>SKU *<input required className={inputClass} value={draft.skuCode} onChange={(event) => update("skuCode", event.target.value)} /></label>
          <label className={labelClass}>Mã vạch<input className={inputClass} value={draft.barcode} onChange={(event) => update("barcode", event.target.value)} /></label>
          <label className={labelClass}>Tên biến thể<input className={inputClass} placeholder={product.name} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label className={labelClass}>Giá bán (VND) *<input required type="number" min="0" step="1" className={inputClass} value={draft.basePrice} onChange={(event) => update("basePrice", event.target.value)} /></label>
          <label className={labelClass}>Khối lượng (kg)<input className={inputClass} placeholder="Ví dụ: 0.250" value={draft.weight} onChange={(event) => update("weight", event.target.value)} /></label>
          <label className={labelClass}>URL ảnh<input type="url" className={inputClass} value={draft.imageUrl} onChange={(event) => update("imageUrl", event.target.value)} /></label>
          <div className="md:col-span-2 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700">Thuộc tính biến thể</p>
            <p className="mt-1 text-xs text-slate-400">Chọn tối đa một giá trị cho mỗi thuộc tính.</p>
            <div className="mt-3 space-y-3">
              {attributes.map((attribute) => (
                <div key={attribute.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className={labelClass}>{attribute.name}<select className={inputClass} value={draft.attributeValues[attribute.id] ?? ""} onChange={(event) => setAttributeValue(attribute.id, event.target.value)}><option value="">Không chọn</option>{attribute.values.map((value) => <option key={value.id} value={value.id}>{value.value}</option>)}</select></label>
                  <label className={labelClass}>Thêm giá trị<input className={inputClass} value={newValue[attribute.id] ?? ""} onChange={(event) => setNewValue((current) => ({ ...current, [attribute.id]: event.target.value }))} /></label>
                  <Button type="button" variant="outline" onClick={() => void addValue(attribute.id)}>Thêm</Button>
                </div>
              ))}
              {attributes.length === 0 && <p className="text-xs text-slate-500">Chưa có thuộc tính nào.</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className={inputClass} placeholder="Ví dụ: Màu sắc, Kích cỡ, Thể tích" value={newAttributeName} onChange={(event) => setNewAttributeName(event.target.value)} />
                <Button type="button" variant="outline" onClick={() => void addAttribute()}>Thêm thuộc tính</Button>
              </div>
            </div>
          </div>
        </div>
        {error && <p className="px-6 pb-2 text-sm text-red-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button disabled={saving} type="submit" className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang lưu..." : "Tạo biến thể"}</Button></div>
      </form>
    </div>
  )
}
