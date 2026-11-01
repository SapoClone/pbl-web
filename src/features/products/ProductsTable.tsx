import { useMemo, useState } from "react"
import { Pencil, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { products as defaultProducts } from "@/shared/dashboard/dashboard.mock"
import type { Product } from "@/shared/dashboard/dashboard.types"

const formatPrice = (value?: number, fallback = "—") =>
  value === undefined ? fallback : `${value.toLocaleString("vi-VN")} ₫`

export function ProductsTable({
  section,
  products,
  onEdit
}: {
  section: "products" | "inventory"
  products?: Product[]
  onEdit?: (product: Product) => void
}) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("default")
  const rows = products ?? defaultProducts
  const filtered = useMemo(
    () => {
      const result = rows.filter((product) => {
        const matchesQuery = `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.brand ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesStatus = statusFilter === "all" || product.state === statusFilter
        return matchesQuery && matchesStatus
      })

      if (sortBy === "default") return result

      return [...result].sort((first, second) => {
        const firstValue = sortBy === "costPrice" ? first.costPrice ?? 0 : sortBy === "retailPrice" ? first.retailPrice ?? 0 : first.stock
        const secondValue = sortBy === "costPrice" ? second.costPrice ?? 0 : sortBy === "retailPrice" ? second.retailPrice ?? 0 : second.stock
        return secondValue - firstValue
      })
    },
    [query, rows, sortBy, statusFilter]
  )

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên, SKU, mã vạch..."
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
              <option value="Hết hàng">Hết hàng</option>
              <option value="Sắp hết hàng">Sắp hết hàng</option>
              <option value="Ngừng kinh doanh">Ngừng kinh doanh</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
            <span className="whitespace-nowrap">Sắp xếp theo</span>
            <select
              aria-label="Sắp xếp sản phẩm theo"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none"
            >
              <option value="default">Mặc định</option>
              <option value="costPrice">Giá vốn</option>
              <option value="retailPrice">Giá bán lẻ</option>
              <option value="stock">Số lượng tồn kho</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
            <tr>
              {["Sản phẩm", "SKU / Mã vạch", "Danh mục / Thương hiệu", "Đơn vị", "Giá vốn", "Giá bán lẻ", "Tồn kho", "Trạng thái", ""].map((heading) => (
                <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((product) => (
              <tr key={product.sku} className="hover:bg-slate-50">
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
                  <span className="block font-medium text-slate-600">{product.sku}</span>
                  <span className="text-xs text-slate-400">{product.barcode || "Chưa có mã vạch"}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="block text-slate-600">{product.category}</span>
                  <span className="text-xs text-slate-400">{product.brand || "Chưa có thương hiệu"}</span>
                </td>
                <td className="px-5 py-4 text-slate-500">{product.unit || "Cái"}</td>
                <td className="px-5 py-4 text-slate-600">{formatPrice(product.costPrice)}</td>
                <td className="px-5 py-4 font-medium text-slate-700">{product.retailPrice === undefined ? product.price : formatPrice(product.retailPrice)}</td>
                <td className="px-5 py-4 font-semibold text-slate-700">
                  {product.stock}
                  {section === "inventory" && product.stock < 10 && <span className="ml-2 text-xs font-normal text-[#c44a42]">Cần nhập</span>}
                </td>
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
                    aria-label={`Chỉnh sửa ${product.name}`}
                    title="Chỉnh sửa sản phẩm"
                    onClick={() => onEdit?.(product)}
                    className="text-slate-400 hover:bg-[#e6f5ee] hover:text-[#16866f]"
                  >
                    <Pencil size={16} />
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
