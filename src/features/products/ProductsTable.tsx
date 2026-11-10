import { useMemo, useState } from "react"
import { List, Pencil, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { products as defaultProducts } from "@/shared/dashboard/dashboard.mock"
import type { Product } from "@/shared/dashboard/dashboard.types"

const formatPrice = (value?: number, fallback = "—") =>
  value === undefined ? fallback : `${value.toLocaleString("vi-VN")} ₫`

export function ProductsTable({
  section,
  products,
  onEdit,
  onViewVariants,
  onDelete
}: {
  section: "products" | "inventory"
  products?: Product[]
  onEdit?: (product: Product) => void
  onViewVariants?: (product: Product) => void
  onDelete?: (product: Product) => Promise<void>
}) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const rows = products ?? defaultProducts
  const filtered = useMemo(
    () => rows.filter((product) => {
        const matchesQuery = `${product.name} ${product.brand ?? ""} ${product.category}`
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesStatus = statusFilter === "all" || product.state === statusFilter
        return matchesQuery && matchesStatus
      }),
    [query, rows, statusFilter]
  )

  const handleDelete = async (product: Product) => {
    if (!product.id || !onDelete || !window.confirm(`Xóa sản phẩm ${product.name}? Các biến thể liên quan cũng sẽ được lưu trữ.`)) return
    setDeletingId(product.id)
    try {
      await onDelete(product)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên sản phẩm..."
            className="w-52 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
            <span className="whitespace-nowrap">Trạng thái</span>
            <select
              aria-label="Lọc theo trạng thái sản phẩm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="Đang bán">Đang bán</option>
              <option value="Lưu nháp">Lưu nháp</option>
              <option value="Ngừng kinh doanh">Ngừng kinh doanh</option>
              <option value="Đã lưu trữ">Đã lưu trữ</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
            <tr>
              {[
                "Sản phẩm",
                "Danh mục / Thương hiệu",
                "Đơn vị",
                ...(section === "inventory" ? ["Giá vốn", "Giá bán (VND)", "Tồn kho"] : []),
                "Trạng thái",
                ""
              ].map((heading) => (
                <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {product.imageUrls?.[0] ? (
                      <img src={product.imageUrls[0]} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e6f5ee] text-xs font-semibold text-[#16866f]">
                        {product.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="min-w-0">
                      <b className="block max-w-[190px] truncate font-medium text-[#163d36]">{product.name}</b>
                      <span className="block max-w-[190px] truncate text-xs text-slate-400">{product.description || "Chưa có mô tả"}</span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="block text-slate-600">{product.category}</span>
                  <span className="text-xs text-slate-400">{product.brand || "Chưa có thương hiệu"}</span>
                </td>
                <td className="px-5 py-4 text-slate-500">{product.unit || "Cái"}</td>
                {section === "inventory" && (
                  <>
                    <td className="px-5 py-4 text-slate-400">{formatPrice(product.costPrice)}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">{product.retailPrice === undefined ? product.price : formatPrice(product.retailPrice)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{product.stock ?? 0}</td>
                  </>
                )}
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    product.state === "Đang bán"
                      ? "bg-[#e6f5ee] text-[#147853]"
                      : product.state === "Hết hàng"
                        ? "bg-[#ffe8e5] text-[#b23b32]"
                        : product.state === "Ngừng kinh doanh"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-[#fff4df] text-[#a66a0b]"
                  }`}>{product.state}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Xem biến thể của ${product.name}`}
                    title="Xem biến thể"
                    onClick={() => onViewVariants?.(product)}
                    className="text-slate-400 hover:bg-[#e6f5ee] hover:text-[#16866f]"
                  >
                    <List size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Chỉnh sửa ${product.name}`}
                    title="Chỉnh sửa sản phẩm"
                    onClick={() => onEdit?.(product)}
                    className="text-slate-400 hover:bg-[#e6f5ee] hover:text-[#16866f]"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Xóa ${product.name}`}
                    title="Xóa sản phẩm"
                    disabled={deletingId === product.id}
                    onClick={() => void handleDelete(product)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy sản phẩm phù hợp.</p>}
      </div>
    </section>
  )
}
