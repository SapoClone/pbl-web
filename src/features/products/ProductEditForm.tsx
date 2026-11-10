import { X } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { CatalogBrand, CatalogCategory, UpdateCatalogProductInput } from "@/api/catalog/products"
import type { Product } from "@/shared/dashboard/dashboard.types"

type Props = {
  product: Product
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  onClose: () => void
  onUpdated: (id: string, input: UpdateCatalogProductInput, status: Product["catalogStatus"]) => Promise<void>
}

const inputClass = "mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const labelClass = "text-xs font-medium text-slate-600"

export function ProductEditForm({ product, categories, brands, onClose, onUpdated }: Props) {
  const isArchived = product.catalogStatus === "ARCHIVED"
  const canRemainDraft = product.catalogStatus === "DRAFT"
  const [draft, setDraft] = useState({
    name: product.name,
    categoryId: product.categoryId ?? "",
    brandId: product.brandId ?? "",
    description: product.description ?? "",
    unit: product.unit ?? "piece",
    status: product.catalogStatus ?? "ACTIVE" as NonNullable<Product["catalogStatus"]>
  })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const update = (field: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [field]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError("Vui lòng nhập tên sản phẩm.")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (!product.id) {
        throw new Error("Không xác định được sản phẩm cần cập nhật.")
      }
      await onUpdated(product.id, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        categoryId: draft.categoryId || null,
        brandId: draft.brandId || null,
        baseUnit: draft.unit.trim() || "piece",
        version: product.version
      }, draft.status)
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật sản phẩm.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
      <form onSubmit={submit} className="my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div><h2 id="edit-product-title" className="text-lg font-semibold text-[#163d36]">Sửa sản phẩm</h2><p className="mt-1 text-xs text-slate-400">Chỉ cập nhật thông tin product, không thay đổi biến thể.</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className={labelClass}>Tên sản phẩm *<input className={inputClass} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label className={labelClass}>Danh mục<select className={inputClass} value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)}><option value="">Không chọn</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className={labelClass}>Thương hiệu<select className={inputClass} value={draft.brandId} onChange={(event) => update("brandId", event.target.value)}><option value="">Không chọn</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
          <label className={labelClass}>Đơn vị cơ bản<input className={inputClass} value={draft.unit} onChange={(event) => update("unit", event.target.value)} /></label>
          <label className={labelClass}>Trạng thái<select disabled={isArchived} className={inputClass} value={draft.status} onChange={(event) => update("status", event.target.value)}>{isArchived ? <option value="ARCHIVED">Đã lưu trữ</option> : <><option value="ACTIVE">Đang bán</option>{canRemainDraft && <option value="DRAFT">Bản nháp</option>}<option value="INACTIVE">Ngừng kinh doanh</option><option value="ARCHIVED">Đã lưu trữ</option></>}</select></label>
          <label className={`${labelClass} md:col-span-2`}>Mô tả<textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10" value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
        </div>
        {error && <p className="px-6 pb-2 text-sm text-red-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button disabled={saving} type="submit" className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
      </form>
    </div>
  )
}
