import { useMemo, useState, type FormEvent } from "react"
import { AlertTriangle, ArrowDownToLine, Boxes, PackageCheck } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { listBranches } from "@/api/platform/branches"
import { listStock, receiveStock } from "@/api/inventory/stock"
import { listWarehouses } from "@/api/inventory/warehouses"
import { listCatalogProducts, listCatalogProductVariants, type CatalogVariant } from "@/api/catalog/products"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import type { Product } from "@/shared/dashboard/dashboard.types"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { ProductsTable } from "@/features/products/ProductsTable"

const DEMO_BRANCH_ID = "demo-branch"

type ReceiptForm = {
  skuId: string
  qty: string
}

const initialReceipt: ReceiptForm = { skuId: "", qty: "" }

export function InventoryPage() {
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [branchId, setBranchId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const [receipt, setReceipt] = useState(initialReceipt)
  const [receiptError, setReceiptError] = useState("")

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: !isDemo
  })
  const selectedBranchId = branchId || (isDemo ? DEMO_BRANCH_ID : branchesQuery.data?.data[0]?.id)
  const warehousesQuery = useQuery({
    queryKey: ["inventory-warehouses", selectedBranchId],
    queryFn: () => listWarehouses(selectedBranchId),
    enabled: Boolean(selectedBranchId) && !isDemo
  })
  const warehouses = warehousesQuery.data ?? []
  const selectedWarehouseId = warehouseId || warehousesQuery.data?.find((warehouse) => warehouse.isDefault && warehouse.status === "ACTIVE")?.id || warehousesQuery.data?.find((warehouse) => warehouse.status === "ACTIVE")?.id
  const catalogQuery = useQuery({
    queryKey: ["catalog-product-variants"],
    queryFn: async () => {
      const products = await listCatalogProducts({ limit: 100 })
      const groups = await Promise.all(products.items.map(async (product) => listCatalogProductVariants(product.id)))
      return groups.flat()
    },
    enabled: !isDemo
  })
  const loadedVariants = isDemo ? [] : catalogQuery.data ?? []
  const stockQuery = useQuery({
    queryKey: ["inventory-stock", selectedBranchId],
    queryFn: () => listStock(selectedBranchId),
    enabled: Boolean(selectedBranchId) && !isDemo
  })

  const stockBySku = useMemo(() => {
    return Object.fromEntries(
      (stockQuery.data?.data ?? []).map((item) => [item.sku, item])
    )
  }, [stockQuery.data?.data])

  const inventoryProducts: Product[] = loadedVariants.map((variant) => {
    const stock = stockBySku[variant.skuCode]
    return {
      id: variant.id,
      variantId: variant.id,
      name: variant.name,
      sku: variant.skuCode,
      category: "—",
      barcode: variant.barcode ?? undefined,
      stock: stock?.onHand ?? 0,
      price: `${variant.basePrice.toLocaleString("vi-VN")} ₫`,
      state: variant.status !== "ACTIVE"
        ? variant.status === "ARCHIVED" ? "Đã lưu trữ" : "Ngừng kinh doanh"
        : stock?.onHand === 0
          ? "Hết hàng"
          : stock?.onHand < 10
            ? "Sắp hết hàng"
            : "Đang bán"
    }
  })

  const totalOnHand = Object.values(stockBySku).reduce((sum, item) => sum + item.onHand, 0)
  const totalReserved = Object.values(stockBySku).reduce((sum, item) => sum + item.reserved, 0)
  const lowStockCount = inventoryProducts.filter((product) => product.stock < 10).length

  const receiveMutation = useMutation({
    mutationFn: receiveStock,
    onSuccess: async () => {
      setReceipt(initialReceipt)
      setReceiptError("")
      setShowReceipt(false)
      await queryClient.invalidateQueries({ queryKey: ["inventory-stock", selectedBranchId] })
    },
    onError: () => setReceiptError("Không thể nhập kho. Hãy kiểm tra chi nhánh, SKU và quyền tài khoản.")
  })

  const submitReceipt = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const quantity = Number(receipt.qty)
    if (!receipt.skuId || !Number.isInteger(quantity) || quantity <= 0) {
      setReceiptError("Vui lòng chọn sản phẩm và nhập số lượng nguyên dương.")
      return
    }
    if (!selectedBranchId) {
      setReceiptError("Chưa có chi nhánh hoạt động để nhập kho.")
      return
    }
    if (!selectedWarehouseId) {
      setReceiptError("Chưa có kho hoạt động để nhập kho.")
      return
    }

    setReceiptError("")
    if (isDemo) {
      setReceipt(initialReceipt)
      setShowReceipt(false)
      return
    }
    receiveMutation.mutate({
      warehouseId: selectedWarehouseId,
      items: [{ skuId: receipt.skuId, qty: String(quantity) }]
    })
  }

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader section="inventory" onCreate={() => setShowReceipt(true)} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chi nhánh đang xem</p>
          {isDemo ? (
            <p className="mt-1 text-sm font-medium text-[#163d36]">Chi nhánh demo</p>
          ) : branchesQuery.isLoading ? (
            <p className="mt-1 text-sm text-slate-400">Đang tải chi nhánh...</p>
          ) : (
            <select
              value={selectedBranchId ?? ""}
              onChange={(event) => setBranchId(event.target.value)}
              className="mt-1 min-w-56 bg-transparent text-sm font-medium text-[#163d36] outline-none"
            >
              <option value="" disabled>Chọn chi nhánh</option>
              {(branchesQuery.data?.data ?? []).map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
              ))}
            </select>
          )}
        </div>
        {!isDemo && warehouses.length > 0 && <label className="text-xs font-medium text-slate-500">Kho<select value={selectedWarehouseId ?? ""} onChange={(event) => setWarehouseId(event.target.value)} className="ml-2 rounded border border-slate-200 px-2 py-1 text-sm text-[#163d36]"><option value="" disabled>Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}</select></label>}
        {isDemo && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">Dữ liệu demo</span>}
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InventoryMetric label="Tồn thực tế" value={totalOnHand} icon={Boxes} />
        <InventoryMetric label="Đang giữ cho đơn" value={totalReserved} icon={PackageCheck} />
        <InventoryMetric label="Tồn khả dụng" value={totalOnHand - totalReserved} icon={ArrowDownToLine} />
        <InventoryMetric label="Sản phẩm sắp hết" value={lowStockCount} icon={AlertTriangle} warning />
      </div>

      {stockQuery.isError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải tồn kho từ pbl-api.</p>}
      {!isDemo && !selectedBranchId && !branchesQuery.isLoading && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Chưa có chi nhánh hoạt động để xem tồn kho.</p>}
      {catalogQuery.isError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải product variant từ pbl-api.</p>}

      <ProductsTable section="inventory" products={inventoryProducts} />

      {showReceipt && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#163d36]/30 p-4 pt-20 backdrop-blur-sm">
          <form onSubmit={submitReceipt} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[#163d36]">Nhập kho</h2>
            <p className="mt-1 text-sm text-slate-500">Tồn kho chỉ thay đổi thông qua phiếu nhập.</p>
            <label className="mt-5 block text-xs font-medium text-slate-600">Biến thể / SKU
              <select value={receipt.skuId} onChange={(event) => setReceipt({ ...receipt, skuId: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" required>
                <option value="">Chọn biến thể</option>
                {loadedVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} ({variant.skuCode})</option>)}
              </select>
            </label>
            <label className="mt-4 block text-xs font-medium text-slate-600">Số lượng nhập
              <input type="number" min="1" step="1" value={receipt.qty} onChange={(event) => setReceipt({ ...receipt, qty: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm" required />
            </label>
            {receiptError && <p className="mt-3 text-sm text-red-600">{receiptError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowReceipt(false); setReceiptError("") }}>Hủy</Button>
              <Button type="submit" disabled={receiveMutation.isPending} className="bg-[#16866f] text-white hover:bg-[#0f705d]">{receiveMutation.isPending ? "Đang nhập..." : "Xác nhận nhập kho"}</Button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

function InventoryMetric({
  label,
  value,
  icon: Icon,
  warning = false
}: {
  label: string
  value: number
  icon: typeof Boxes
  warning?: boolean
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${warning ? "bg-amber-50 text-amber-600" : "bg-[#e6f5ee] text-[#16866f]"}`}><Icon size={18} /></div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#163d36]">{value.toLocaleString("vi-VN")}</p>
    </section>
  )
}
