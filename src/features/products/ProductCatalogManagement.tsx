import { useState } from "react"
import { Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  CatalogBrand,
  CatalogCategory,
  CreateCatalogBrandInput,
  CreateCatalogCategoryInput
} from "@/api/catalog/products"

type Props = {
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  onClose: () => void
  onCreateCategory: (input: CreateCatalogCategoryInput) => Promise<CatalogCategory>
  onCreateBrand: (input: CreateCatalogBrandInput) => Promise<CatalogBrand>
  onUpdateCategory: (id: string, name: string) => Promise<CatalogCategory>
  onDeleteCategory: (id: string) => Promise<void>
  onUpdateBrand: (id: string, input: { name: string; description?: string }) => Promise<CatalogBrand>
  onDeleteBrand: (id: string) => Promise<void>
}

const isBrand = (item: CatalogCategory | CatalogBrand): item is CatalogBrand =>
  "description" in item

export function ProductCatalogManagement({
  categories,
  brands,
  onClose,
  onCreateCategory,
  onCreateBrand,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateBrand,
  onDeleteBrand
}: Props) {
  const [tab, setTab] = useState<"categories" | "brands">("categories")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [editingBrand, setEditingBrand] = useState<CatalogBrand | null>(null)
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const submit = async () => {
    if (!name.trim()) {
      setError(`Vui lòng nhập tên ${tab === "categories" ? "danh mục" : "thương hiệu"}.`)
      return
    }
    setSaving(true)
    setError("")
    try {
      if (tab === "categories") await onCreateCategory({ name: name.trim() })
      else await onCreateBrand({ name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) })
      setName("")
      setDescription("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo dữ liệu.")
    } finally {
      setSaving(false)
    }
  }

  const submitCategoryEdit = async () => {
    if (!editingCategory?.name.trim()) {
      setError("Vui lòng nhập tên danh mục.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onUpdateCategory(editingCategory.id, editingCategory.name.trim())
      setEditingCategory(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể sửa danh mục.")
    } finally {
      setSaving(false)
    }
  }

  const removeCategory = async (id: string, currentName: string) => {
    if (!window.confirm(`Xóa danh mục "${currentName}"?`)) return
    setSaving(true)
    setEditingId(id)
    setError("")
    try {
      await onDeleteCategory(id)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa danh mục.")
    } finally {
      setEditingId(null)
      setSaving(false)
    }
  }

  const submitBrandEdit = async () => {
    if (!editingBrand?.name.trim()) {
      setError("Vui lòng nhập tên thương hiệu.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onUpdateBrand(editingBrand.id, {
        name: editingBrand.name.trim(),
        description: editingBrand.description?.trim() ?? ""
      })
      setEditingBrand(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể sửa thương hiệu.")
    } finally {
      setSaving(false)
    }
  }

  const removeBrand = async (id: string, currentName: string) => {
    if (!window.confirm(`Xóa thương hiệu "${currentName}"?`)) return
    setSaving(true)
    setEditingId(id)
    setError("")
    try {
      await onDeleteBrand(id)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa thương hiệu.")
    } finally {
      setEditingId(null)
      setSaving(false)
    }
  }

  const items = tab === "categories" ? categories : brands

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="catalog-management-title">
      <section className="my-4 w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div><h2 id="catalog-management-title" className="text-lg font-semibold text-[#163d36]">Quản lý danh mục & thương hiệu</h2><p className="mt-1 text-xs text-slate-400">Dữ liệu dùng chung cho các sản phẩm trong tenant.</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </header>
        <div className="flex gap-2 border-b border-slate-100 px-6 pt-4">
          <button type="button" onClick={() => { setTab("categories"); setError("") }} className={`border-b-2 px-2 pb-3 text-sm font-medium ${tab === "categories" ? "border-[#16866f] text-[#16866f]" : "border-transparent text-slate-400"}`}>Danh mục ({categories.length})</button>
          <button type="button" onClick={() => { setTab("brands"); setError("") }} className={`border-b-2 px-2 pb-3 text-sm font-medium ${tab === "brands" ? "border-[#16866f] text-[#16866f]" : "border-transparent text-slate-400"}`}>Thương hiệu ({brands.length})</button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">Tên {tab === "categories" ? "danh mục" : "thương hiệu"}<input autoFocus className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#16866f]" value={name} onChange={(event) => setName(event.target.value)} /></label>
            {tab === "brands" && <label className="text-xs font-medium text-slate-600">Mô tả thương hiệu<input className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#16866f]" value={description} onChange={(event) => setDescription(event.target.value)} /></label>}
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <Button type="button" disabled={saving} onClick={() => void submit()} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang tạo..." : `Thêm ${tab === "categories" ? "danh mục" : "thương hiệu"}`}</Button>
          <div className="max-h-64 overflow-y-auto rounded-md border border-slate-100">
            {items.length === 0 ? <p className="p-5 text-sm text-slate-400">Chưa có dữ liệu.</p> : items.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"><div className="min-w-0"><span className="block text-sm text-slate-700">{item.name}</span>{tab === "brands" && isBrand(item) && item.description && <span className="mt-1 block max-w-[360px] truncate text-xs text-slate-400" title={item.description}>{item.description}</span>}</div><div className="flex items-center gap-2">{tab === "categories" ? <><button type="button" disabled={editingId === item.id} onClick={() => setEditingCategory(item)} aria-label={`Sửa ${item.name}`} className="text-slate-400 hover:text-[#16866f]"><Pencil size={15} /></button><button type="button" disabled={editingId === item.id} onClick={() => void removeCategory(item.id, item.name)} aria-label={`Xóa ${item.name}`} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button></> : isBrand(item) ? <><button type="button" onClick={() => setEditingBrand(item)} aria-label={`Sửa ${item.name}`} className="text-slate-400 hover:text-[#16866f]"><Pencil size={15} /></button><button type="button" disabled={editingId === item.id} onClick={() => void removeBrand(item.id, item.name)} aria-label={`Xóa ${item.name}`} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button></> : null}</div></div>)}
          </div>
        </div>
      </section>
      {editingBrand && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#163d36]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-brand-title">
        <form className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); void submitBrandEdit() }}>
          <div className="mb-5 flex items-start justify-between">
            <h2 id="edit-brand-title" className="text-lg font-semibold text-[#163d36]">Sửa thương hiệu</h2>
            <button type="button" onClick={() => setEditingBrand(null)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-medium text-slate-600">Tên thương hiệu<input autoFocus className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#16866f]" value={editingBrand.name} onChange={(event) => setEditingBrand({ ...editingBrand, name: event.target.value })} /></label>
            <label className="block text-xs font-medium text-slate-600">Mô tả thương hiệu<textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-[#16866f]" value={editingBrand.description ?? ""} onChange={(event) => setEditingBrand({ ...editingBrand, description: event.target.value })} /></label>
          </div>
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditingBrand(null)}>Hủy</Button><Button type="submit" disabled={saving} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
        </form>
      </div>}
      {editingCategory && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#163d36]/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-category-title">
        <form className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl" onSubmit={(event) => { event.preventDefault(); void submitCategoryEdit() }}>
          <div className="mb-5 flex items-start justify-between">
            <h2 id="edit-category-title" className="text-lg font-semibold text-[#163d36]">Sửa danh mục</h2>
            <button type="button" onClick={() => setEditingCategory(null)} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
          <label className="block text-xs font-medium text-slate-600">Tên danh mục<input autoFocus className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#16866f]" value={editingCategory.name} onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })} /></label>
          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
          <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>Hủy</Button><Button type="submit" disabled={saving} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
        </form>
      </div>}
    </div>
  )
}
