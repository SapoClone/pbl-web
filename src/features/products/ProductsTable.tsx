import { useMemo, useState } from "react"
import { ImageOff, Link2, List, Pencil, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { products as defaultProducts } from "@/shared/dashboard/dashboard.mock"
import type { Product } from "@/shared/dashboard/dashboard.types"

const formatPrice = (value?: number, fallback = "—") =>
  value === undefined ? fallback : `${value.toLocaleString("vi-VN")} ₫`

function ProductThumbnail({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  const imageUrl = product.imageUrls?.[0] ?? product.images?.[0]?.url

  if (!imageUrl || failed) {
    return (
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]"
        title={
          failed ? "Không thể tải ảnh sản phẩm" : "Sản phẩm chưa có ảnh"
        }
      >
        {failed ? (
          <ImageOff size={16} aria-hidden="true" />
        ) : (
          <span className="text-xs font-semibold">
            {product.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={`Ảnh bìa của ${product.name}`}
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover shadow-xs"
    />
  )
}

export function ProductsTable({
  section,
  products,
  loading = false,
  onEdit,
  onViewVariants,
  onDelete
}: {
  section: "products" | "inventory"
  products?: Product[]
  loading?: boolean
  onEdit?: (product: Product) => void
  onViewVariants?: (product: Product) => void
  onDelete?: (product: Product) => Promise<void>
}) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [comboFilter, setComboFilter] = useState<"all" | "single" | "combo">(
    "all"
  )
  const [channelFilter, setChannelFilter] = useState<"all" | "lazada" | "shopee">(
    "all"
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const rows = products ?? defaultProducts

  const filtered = useMemo(
    () =>
      rows.filter((product) => {
        const matchesQuery =
          `${product.name} ${product.sku ?? ""} ${product.brand ?? ""} ${product.category}`
            .toLowerCase()
            .includes(query.toLowerCase())
        const matchesStatus =
          statusFilter === "all" || product.state === statusFilter
        const matchesCombo =
          comboFilter === "all" ||
          (comboFilter === "combo" && Boolean(product.isCombo)) ||
          (comboFilter === "single" && !product.isCombo)
        const matchesChannel =
          channelFilter === "all" ||
          (channelFilter === "lazada" && (product.lazadaSkuCount ?? 0) > 0) ||
          (channelFilter === "shopee" && (product.shopeeSkuCount ?? 0) > 0)
        return matchesQuery && matchesStatus && matchesCombo && matchesChannel
      }),
    [channelFilter, comboFilter, query, rows, statusFilter]
  )

  const handleDelete = async (product: Product) => {
    if (
      !product.id ||
      !onDelete ||
      !window.confirm(
        `Xóa sản phẩm ${product.name}? Các biến thể liên quan cũng sẽ được lưu trữ.`
      )
    )
      return
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
            placeholder="Tìm tên sản phẩm, mã SKU..."
            className="w-60 text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {section === "products" && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1 text-xs">
              <button
                type="button"
                onClick={() => setChannelFilter("all")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  channelFilter === "all"
                    ? "bg-[#16866f] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Tất cả kênh
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("lazada")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  channelFilter === "lazada"
                    ? "bg-[#0f146d] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Đã đồng bộ Lazada
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("shopee")}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  channelFilter === "shopee"
                    ? "bg-[#ee4d2d] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Đã đồng bộ Shopee
              </button>
            </div>
          )}
          {section === "products" && (
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
              <span className="whitespace-nowrap">Loại SP</span>
              <select
                aria-label="Lọc theo loại sản phẩm"
                value={comboFilter}
                onChange={(event) =>
                  setComboFilter(event.target.value as typeof comboFilter)
                }
                className="bg-transparent font-medium text-slate-700 outline-none"
              >
                <option value="all">Tất cả</option>
                <option value="single">SP đơn lẻ</option>
                <option value="combo">Gói Combo</option>
              </select>
            </label>
          )}
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
                "Mã SKU / Biến thể",
                "Danh mục / Thương hiệu",
                "Giá bán (VND)",
                ...(section === "inventory"
                  ? ["Giá vốn", "Tồn kho"]
                  : ["Đồng bộ sàn TMĐT"]),
                "Trạng thái",
                ""
              ].map((heading) => (
                <th key={heading} className="px-5 py-3 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((product) => (
              <tr key={product.id ?? product.sku} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ProductThumbnail product={product} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <b className="block max-w-[210px] truncate font-medium text-[#163d36]">
                          {product.name}
                        </b>
                        {product.isCombo && (
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                            Combo
                          </span>
                        )}
                      </span>
                      <span className="block max-w-[230px] truncate text-xs text-slate-400">
                        {product.description || "Chưa có mô tả"}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    {product.sku || "—"}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {product.variantCount
                      ? `${product.variantCount} biến thể · ${product.unit || "Cái"}`
                      : `Đơn vị: ${product.unit || "Cái"}`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="block text-slate-600">{product.category}</span>
                  <span className="text-xs text-slate-400">
                    {product.brand || "Chưa có thương hiệu"}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-800">
                  {product.retailPrice === undefined
                    ? product.price
                    : formatPrice(product.retailPrice)}
                </td>
                {section === "inventory" ? (
                  <>
                    <td className="px-5 py-4 text-slate-400">
                      {formatPrice(product.costPrice)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {product.stock ?? 0}
                    </td>
                  </>
                ) : (
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(product.lazadaSkuCount ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#0f146d]/15 bg-[#eef0ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#0f146d]">
                          <Link2 size={11} />
                          Lazada ({product.lazadaSkuCount} SKU)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Chưa liên kết sàn
                        </span>
                      )}
                      {(product.shopeeSkuCount ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#ee4d2d]/15 bg-[#fff1ee] px-2.5 py-0.5 text-[11px] font-semibold text-[#ee4d2d]">
                          <Link2 size={11} />
                          Shopee ({product.shopeeSkuCount} SKU)
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      product.state === "Đang bán"
                        ? "bg-[#e6f5ee] text-[#147853]"
                        : product.state === "Hết hàng"
                          ? "bg-[#ffe8e5] text-[#b23b32]"
                          : product.state === "Ngừng kinh doanh"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-[#fff4df] text-[#a66a0b]"
                    }`}
                  >
                    {product.state}
                  </span>
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
        {loading && filtered.length === 0 && (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-500">
            Không tìm thấy sản phẩm phù hợp.
          </p>
        )}
      </div>
    </section>
  )
}
