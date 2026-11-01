import { ImagePlus, X } from "lucide-react"
import { useState, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/shared/dashboard/dashboard.types"

type ProductDraft = {
  name: string
  sku: string
  category: string
  brand: string
  description: string
  unit: string
  barcode: string
  costPrice: string
  retailPrice: string
  stock: string
  status: "Đang bán" | "Ngừng kinh doanh"
  imageUrls: string[]
}

const initialDraft: ProductDraft = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  description: "",
  unit: "Cái",
  barcode: "",
  costPrice: "",
  retailPrice: "",
  stock: "0",
  status: "Đang bán",
  imageUrls: []
}

const inputClass = "mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const labelClass = "text-xs font-medium text-slate-600"

export function ProductCreateForm({ onClose, onCreated, product }: { onClose: () => void; onCreated: (product: Product) => void; product?: Product }) {
  const [draft, setDraft] = useState<ProductDraft>(() => product ? {
    name: product.name,
    sku: product.sku,
    category: product.category,
    brand: product.brand ?? "",
    description: product.description ?? "",
    unit: product.unit ?? "Cái",
    barcode: product.barcode ?? "",
    costPrice: String(product.costPrice ?? ""),
    retailPrice: String(product.retailPrice ?? 0),
    stock: String(product.stock),
    status: product.state === "Ngừng kinh doanh" ? "Ngừng kinh doanh" : "Đang bán",
    imageUrls: product.imageUrls ?? []
  } : initialDraft)
  const [error, setError] = useState("")

  const update = (field: keyof ProductDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }))

  const handleImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (draft.imageUrls.length + files.length > 5) {
      setError("Sản phẩm chỉ được tối đa 5 hình ảnh.")
      return
    }

    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("Không thể đọc hình ảnh"))
      reader.readAsDataURL(file)
    }))).then((images) => {
      setDraft((current) => ({ ...current, imageUrls: [...current.imageUrls, ...images] }))
      setError("")
    }).catch(() => setError("Không thể đọc hình ảnh đã chọn."))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const retailPrice = Number(draft.retailPrice)
    const costPrice = Number(draft.costPrice || 0)
    const stock = Number(draft.stock || 0)
    if (!draft.name.trim() || !draft.sku.trim() || !draft.category.trim() || !draft.retailPrice || retailPrice < 0 || costPrice < 0 || stock < 0) {
      setError("Vui lòng nhập tên, SKU, danh mục, giá bán hợp lệ và số lượng không âm.")
      return
    }

    onCreated({
      name: draft.name.trim(),
      sku: draft.sku.trim(),
      category: draft.category.trim(),
      brand: draft.brand.trim() || undefined,
      description: draft.description.trim() || undefined,
      unit: draft.unit.trim() || "Cái",
      barcode: draft.barcode.trim() || undefined,
      costPrice,
      retailPrice,
      imageUrls: draft.imageUrls,
      stock,
      price: `${retailPrice.toLocaleString("vi-VN")} ₫`,
      state: draft.status
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
      <form onSubmit={submit} className="my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div><h2 id="create-product-title" className="text-lg font-semibold text-[#163d36]">{product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}</h2><p className="mt-1 text-xs text-slate-400">Khai báo sản phẩm, giá bán và thông tin tồn kho ban đầu.</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <label className={labelClass}>Tên sản phẩm *<input className={inputClass} value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Ví dụ: Bình giữ nhiệt Mộc" /></label>
          <label className={labelClass}>Mã sản phẩm / SKU *<input className={inputClass} value={draft.sku} onChange={(event) => update("sku", event.target.value)} placeholder="Ví dụ: MOC-500-01" /></label>
          <label className={labelClass}>Danh mục *<input className={inputClass} value={draft.category} onChange={(event) => update("category", event.target.value)} placeholder="Ví dụ: Đồ gia dụng" /></label>
          <label className={labelClass}>Thương hiệu<input className={inputClass} value={draft.brand} onChange={(event) => update("brand", event.target.value)} placeholder="Ví dụ: Mộc" /></label>
          <label className={labelClass}>Đơn vị tính<input className={inputClass} value={draft.unit} onChange={(event) => update("unit", event.target.value)} placeholder="Cái, hộp, kg..." /></label>
          <label className={labelClass}>Mã vạch<input className={inputClass} value={draft.barcode} onChange={(event) => update("barcode", event.target.value)} placeholder="Nhập tay hoặc để trống để bổ sung sau" /></label>
          <label className={labelClass}>Giá vốn<input type="number" min="0" step="1" className={inputClass} value={draft.costPrice} onChange={(event) => update("costPrice", event.target.value)} placeholder="0" /></label>
          <label className={labelClass}>Giá bán lẻ *<input required type="number" min="0" step="1" className={inputClass} value={draft.retailPrice} onChange={(event) => update("retailPrice", event.target.value)} placeholder="0" /></label>
          <label className={labelClass}>Tồn kho ban đầu<input type="number" min="0" step="1" className={inputClass} value={draft.stock} onChange={(event) => update("stock", event.target.value)} /></label>
          <label className={labelClass}>Trạng thái<select className={inputClass} value={draft.status} onChange={(event) => update("status", event.target.value)}><option>Đang bán</option><option>Ngừng kinh doanh</option></select></label>
          <label className={`${labelClass} md:col-span-2`}>Mô tả<textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10" value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="Mô tả ngắn về sản phẩm..." /></label>
          <div className="md:col-span-2"><p className={labelClass}>Hình ảnh <span className="font-normal text-slate-400">({draft.imageUrls.length}/5)</span></p><div className="mt-2 flex flex-wrap gap-3">{draft.imageUrls.map((image, index) => <div key={image} className="relative h-20 w-20 overflow-hidden rounded-md border border-slate-200"><img src={image} alt={`Ảnh sản phẩm ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setDraft((current) => ({ ...current, imageUrls: current.imageUrls.filter((_, imageIndex) => imageIndex !== index) }))} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-600"><X size={12} /></button></div>)}{draft.imageUrls.length < 5 && <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-[#16866f] hover:text-[#16866f]"><ImagePlus size={19} /><span className="mt-1 text-[10px]">Thêm ảnh</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} /></label>}</div></div>
        </div>
        {error && <p className="px-6 pb-2 text-sm text-red-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button type="submit" className="bg-[#16866f] text-white hover:bg-[#0f705d]">{product ? "Lưu thay đổi" : "Lưu sản phẩm"}</Button></div>
      </form>
    </div>
  )
}
