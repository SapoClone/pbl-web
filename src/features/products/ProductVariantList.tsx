import { Pencil, Plus, Trash2, X } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { CatalogVariant } from "@/api/catalog/products"
import type { Product } from "@/shared/dashboard/dashboard.types"

const displayVariantName = (variant: CatalogVariant) => {
  const attributeSummary = variant.attributes.map((attribute) => attribute.value).join(" / ")
  const generatedSuffix = attributeSummary ? ` (${attributeSummary})` : ""

  return generatedSuffix && variant.name.endsWith(generatedSuffix)
    ? variant.name.slice(0, -generatedSuffix.length)
    : variant.name
}

const statusLabel = (status: CatalogVariant["status"]) => (
  status === "ACTIVE" ? "Đang bán" : status === "INACTIVE" ? "Ngừng kinh doanh" : "Đã lưu trữ"
)

const trimTrailingWeightZeros = (weight: string) => weight.includes(".")
  ? weight.replace(/0+$/, "").replace(/\.$/, "")
  : weight

const displayWeight = (weight: string | null) => weight ? trimTrailingWeightZeros(weight) : "—"

type VariantDraft = {
  name: string
  skuCode: string
  barcode: string
  basePrice: string
  weight: string
  status: CatalogVariant["status"]
}

const toDraft = (variant: CatalogVariant): VariantDraft => ({
  name: variant.name,
  skuCode: variant.skuCode,
  barcode: variant.barcode ?? "",
  basePrice: String(variant.basePrice),
  weight: variant.weight ? trimTrailingWeightZeros(variant.weight) : "",
  status: variant.status
})

export function ProductVariantList({
  product,
  variants,
  onClose,
  onAddVariant,
  onUpdateVariant,
  onDeleteVariant
}: {
  product: Product
  variants: CatalogVariant[] | null
  onClose: () => void
  onAddVariant: () => void
  onUpdateVariant: (variant: CatalogVariant, input: Omit<VariantDraft, "basePrice"> & { basePrice: number }) => Promise<void>
  onDeleteVariant: (variant: CatalogVariant) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<VariantDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState("")

  const openEditor = (variant: CatalogVariant) => {
    setEditingId(variant.id)
    setDraft(toDraft(variant))
    setActionError("")
  }

  const saveVariant = async (event: FormEvent<HTMLFormElement>, variant: CatalogVariant) => {
    event.preventDefault()
    if (!draft) return
    const basePrice = Number(draft.basePrice)
    if (!draft.name.trim() || !draft.skuCode.trim()) {
      setActionError("Vui lòng nhập tên và SKU.")
      return
    }
    if (!Number.isInteger(basePrice) || basePrice < 0) {
      setActionError("Giá bán phải là số nguyên không âm.")
      return
    }
    setSaving(true)
    setActionError("")
    try {
      await onUpdateVariant(variant, { ...draft, basePrice })
      setEditingId(null)
      setDraft(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể cập nhật biến thể.")
    } finally {
      setSaving(false)
    }
  }

  const removeVariant = async (variant: CatalogVariant) => {
    if (!window.confirm(`Xóa biến thể ${variant.skuCode}?`)) return
    setSaving(true)
    setActionError("")
    try {
      await onDeleteVariant(variant)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể xóa biến thể.")
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="product-variants-title">
      <section className="my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="product-variants-title" className="text-lg font-semibold text-[#163d36]">Biến thể của {product.name}</h2>
            <p className="mt-1 text-xs text-slate-400">{variants === null ? "Đang tải..." : `${variants.length} biến thể`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={onAddVariant} className="gap-1.5 bg-[#16866f] text-white hover:bg-[#0f705d]"><Plus size={15} />Thêm biến thể</Button>
            <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
        </header>
        {actionError && editingId === null && <p className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{actionError}</p>}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {variants === null ? <p className="py-8 text-center text-sm text-slate-500">Đang tải danh sách biến thể...</p> : variants.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Sản phẩm chưa có biến thể.</p> : (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {variants.map((variant) => (
                <div key={variant.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#163d36]">{displayVariantName(variant)}</p>
                      <p className="mt-1 text-xs text-slate-500">SKU: {variant.skuCode} · {variant.basePrice.toLocaleString("vi-VN")} ₫</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        {variant.isDefault && <span className="rounded-full bg-[#fff4df] px-2.5 py-1 font-medium text-[#a66a0b]">Mặc định</span>}
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">{statusLabel(variant.status)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {variant.attributes.length === 0 ? <span className="text-xs text-slate-400">Chưa gắn thuộc tính</span> : variant.attributes.map((attribute) => <span key={attribute.attributeId} className="rounded-full bg-[#e6f5ee] px-2.5 py-1 text-xs text-[#147853]">{attribute.attributeName}: {attribute.value}</span>)}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" title="Sửa biến thể" aria-label={`Sửa biến thể ${variant.skuCode}`} disabled={saving} onClick={() => openEditor(variant)} className="h-8 w-8 text-slate-500 hover:bg-[#e6f5ee] hover:text-[#16866f]"><Pencil size={15} /></Button>
                      <Button type="button" variant="ghost" size="icon" title="Xóa biến thể" aria-label={`Xóa biến thể ${variant.skuCode}`} disabled={saving} onClick={() => void removeVariant(variant)} className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></Button>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-x-5 gap-y-2 border-t border-slate-200 pt-3 text-xs sm:grid-cols-2">
                    <div><dt className="text-slate-400">Mã vạch</dt><dd className="mt-0.5 text-slate-600">{variant.barcode ?? "—"}</dd></div>
                    <div><dt className="text-slate-400">Khối lượng (kg)</dt><dd className="mt-0.5 text-slate-600">{displayWeight(variant.weight)}</dd></div>
                  </dl>
                  {editingId === variant.id && draft && <form onSubmit={(event) => void saveVariant(event, variant)} className="mt-4 grid gap-3 rounded-lg border border-[#16866f]/20 bg-[#f6fbf9] p-4 md:grid-cols-2">
                    <label className="text-xs font-medium text-slate-600">Tên biến thể<input required className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#16866f]" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                    <label className="text-xs font-medium text-slate-600">SKU<input required className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#16866f]" value={draft.skuCode} onChange={(event) => setDraft({ ...draft, skuCode: event.target.value })} /></label>
                    <label className="text-xs font-medium text-slate-600">Mã vạch<input className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#16866f]" value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} /></label>
                    <label className="text-xs font-medium text-slate-600">Giá bán (VND)<input required min="0" step="1" type="number" className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#16866f]" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })} /></label>
                    <label className="text-xs font-medium text-slate-600">Khối lượng (kg)<input className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#16866f]" value={draft.weight} onChange={(event) => setDraft({ ...draft, weight: event.target.value })} /></label>
                    <label className="text-xs font-medium text-slate-600">Trạng thái<select className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-[#16866f]" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CatalogVariant["status"] })}><option value="ACTIVE">Đang bán</option><option value="INACTIVE">Ngừng kinh doanh</option><option value="ARCHIVED">Đã lưu trữ</option></select></label>
                    {actionError && <p className="text-sm text-red-600 md:col-span-2">{actionError}</p>}
                    <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="outline" disabled={saving} onClick={() => { setEditingId(null); setDraft(null); setActionError("") }}>Hủy</Button><Button type="submit" disabled={saving} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
                  </form>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Đóng</Button></div>
      </section>
    </div>
  )
}
