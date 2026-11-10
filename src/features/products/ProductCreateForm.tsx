import { X } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { CatalogBrand, CatalogCategory, CreateCatalogProductInput } from "@/api/catalog/products"

type Props = {
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  onClose: () => void
  onCreated: (input: CreateCatalogProductInput) => Promise<void>
}

const inputClass = "mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const labelClass = "text-xs font-medium text-slate-600"

export function ProductCreateForm({ categories, brands, onClose, onCreated }: Props) {
  const [draft, setDraft] = useState({
    name: "", categoryId: "", brandId: "", description: "",
    unit: "piece",
    status: "ACTIVE" as "DRAFT" | "ACTIVE" | "INACTIVE"
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
      await onCreated({
        name: draft.name.trim(),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
        ...(draft.brandId ? { brandId: draft.brandId } : {}),
        baseUnit: draft.unit.trim() || "piece",
        status: draft.status
      })
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo sản phẩm.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
      <form onSubmit={submit} className="my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div><h2 id="create-product-title" className="text-lg font-semibold text-[#163d36]">Thêm sản phẩm</h2><p className="mt-1 text-xs text-slate-400">Chỉ tạo thông tin sản phẩm. Bạn có thể thêm biến thể sau.</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className={labelClass}>Tên sản phẩm *<input className={inputClass} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label className={labelClass}>Danh mục<select className={inputClass} value={draft.categoryId} onChange={(event) => update("categoryId", event.target.value)}><option value="">Không chọn</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className={labelClass}>Thương hiệu<select className={inputClass} value={draft.brandId} onChange={(event) => update("brandId", event.target.value)}><option value="">Không chọn</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
          <label className={labelClass}>Đơn vị cơ bản<input className={inputClass} value={draft.unit} onChange={(event) => update("unit", event.target.value)} /></label>
          <label className={labelClass}>Trạng thái<select className={inputClass} value={draft.status} onChange={(event) => update("status", event.target.value)}><option value="ACTIVE">Đang bán</option><option value="DRAFT">Bản nháp</option><option value="INACTIVE">Ngừng kinh doanh</option></select></label>
          <label className={`${labelClass} md:col-span-2`}>Mô tả<textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10" value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
        </div>
        {error && <p className="px-6 pb-2 text-sm text-red-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button disabled={saving} type="submit" className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang lưu..." : "Lưu sản phẩm"}</Button></div>
      </form>
    </div>
  )
}
