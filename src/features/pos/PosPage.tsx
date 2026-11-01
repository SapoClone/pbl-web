import { useMemo, useState, type FormEvent } from "react"
import { CheckCircle2, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { createOrder, type CreateOrderInput } from "@/api/sales/orders"
import { listBranches } from "@/api/platform/branches"
import { listStock } from "@/api/inventory/stock"
import { products as catalogProducts } from "@/shared/dashboard/dashboard.mock"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type CartLine = {
  sku: string
  name: string
  quantity: number
  unitPrice: number
  available: number
}

const DEMO_BRANCH_ID = "demo-branch"
const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`

export function PosPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [query, setQuery] = useState("")
  const [branchId, setBranchId] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<CreateOrderInput["paymentMethod"]>("cash")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches, enabled: !isDemo })
  const selectedBranchId = branchId || (isDemo ? DEMO_BRANCH_ID : branchesQuery.data?.data[0]?.id)
  const stockQuery = useQuery({
    queryKey: ["inventory-stock", selectedBranchId],
    queryFn: () => listStock(selectedBranchId),
    enabled: Boolean(selectedBranchId) && !isDemo
  })
  const availability = useMemo(
    () => Object.fromEntries((stockQuery.data?.data ?? []).map((item) => [item.sku, item.available])),
    [stockQuery.data?.data]
  )
  const products = catalogProducts.map((product) => ({
    ...product,
    available: isDemo ? product.stock : availability[product.sku] ?? 0,
    unitPrice: product.retailPrice !== undefined
      ? product.retailPrice
      : Number(product.price.replace(/[^\d]/g, ""))
  }))
  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.sku} ${product.barcode ?? ""}`.toLowerCase().includes(query.toLowerCase())
  )
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      setCart([])
      setCustomerName("")
      setError("")
      setSuccess(`Đã tạo đơn ${order.code}.`)
    },
    onError: () => setError("Không thể tạo đơn. Hãy kiểm tra tồn khả dụng, chi nhánh và quyền tài khoản.")
  })

  const addToCart = (sku: string) => {
    setError("")
    const product = products.find((item) => item.sku === sku)
    if (!product || product.available < 1) {
      setError("Sản phẩm đã hết tồn khả dụng.")
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.sku === sku)
      if (existing) {
        if (existing.quantity >= product.available) return current
        return current.map((item) => item.sku === sku ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { sku, name: product.name, quantity: 1, unitPrice: product.unitPrice, available: product.available }]
    })
  }

  const changeQuantity = (sku: string, delta: number) => {
    setCart((current) => current.flatMap((item) => {
      if (item.sku !== sku) return [item]
      const quantity = Math.min(item.available, item.quantity + delta)
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    if (!selectedBranchId) return setError("Vui lòng chọn chi nhánh.")
    if (!cart.length) return setError("Vui lòng thêm ít nhất một sản phẩm vào giỏ hàng.")
    if (isDemo) {
      setCart([])
      setSuccess("Đã tạo đơn demo thành công.")
      return
    }
    orderMutation.mutate({
      branchId: selectedBranchId,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      items: cart.map(({ sku, name, quantity, unitPrice }) => ({ sku, name, quantity, unitPrice }))
    })
  }

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Bán hàng / Tại quầy</p><h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Bán tại quầy</h1><p className="mt-2 text-sm text-slate-500">Tạo đơn bán trực tiếp và trừ tồn kho theo tồn khả dụng.</p></div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="text-slate-400">Chi nhánh</span>
          {isDemo ? <b className="text-[#163d36]">Demo</b> : <select value={selectedBranchId ?? ""} onChange={(event) => setBranchId(event.target.value)} className="bg-transparent font-medium text-[#163d36] outline-none"><option value="">Chọn chi nhánh</option>{(branchesQuery.data?.data ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, SKU hoặc mã vạch..." className="w-full outline-none placeholder:text-slate-400" /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => <button type="button" key={product.sku} onClick={() => addToCart(product.sku)} disabled={product.available < 1} className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-[#16866f] hover:bg-[#f5fbf8] disabled:cursor-not-allowed disabled:opacity-50"><div className="flex items-start justify-between gap-2"><span className="font-medium text-[#163d36]">{product.name}</span><Plus size={16} className="shrink-0 text-[#16866f]" /></div><p className="mt-1 text-xs text-slate-400">{product.sku}</p><div className="mt-3 flex justify-between text-xs"><span className="font-semibold text-slate-700">{money(product.unitPrice)}</span><span className={product.available < 10 ? "text-amber-600" : "text-slate-400"}>Tồn: {product.available}</span></div></button>)}
          </div>
          {visibleProducts.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Không tìm thấy sản phẩm.</p>}
        </section>

        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4"><ShoppingCart size={19} className="text-[#16866f]" /><h2 className="font-semibold text-[#163d36]">Giỏ hàng ({cart.length})</h2></div>
          <div className="min-h-52 divide-y divide-slate-100">{cart.map((item) => <div key={item.sku} className="py-3"><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{item.name}</span><button type="button" aria-label={`Xóa ${item.name}`} onClick={() => setCart((current) => current.filter((line) => line.sku !== item.sku))} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button></div><div className="mt-2 flex items-center justify-between"><span className="text-xs text-slate-500">{money(item.unitPrice)}</span><span className="flex items-center gap-2"><button type="button" onClick={() => changeQuantity(item.sku, -1)} className="rounded border border-slate-200 p-1"><Minus size={13} /></button><b className="w-5 text-center text-sm">{item.quantity}</b><button type="button" onClick={() => changeQuantity(item.sku, 1)} className="rounded border border-slate-200 p-1"><Plus size={13} /></button></span></div></div>)}</div>
          {!cart.length && <div className="flex min-h-52 flex-col items-center justify-center text-slate-400"><ShoppingCart size={27} /><p className="mt-2 text-sm">Chưa có sản phẩm</p></div>}
          <div className="border-t border-slate-100 pt-4"><label className="text-xs font-medium text-slate-600">Tên khách hàng (không bắt buộc)<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#16866f]" placeholder="Khách lẻ" /></label><label className="mt-3 block text-xs font-medium text-slate-600">Thanh toán<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as CreateOrderInput["paymentMethod"])} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none"><option value="cash">Tiền mặt</option><option value="card">Thẻ</option><option value="transfer">Chuyển khoản</option><option value="cod">COD</option></select></label><div className="mt-4 flex justify-between text-lg font-semibold text-[#163d36]"><span>Tổng cộng</span><span>{money(total)}</span></div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}{success && <p className="mt-3 flex items-center gap-1 text-sm text-[#147853]"><CheckCircle2 size={15} />{success}</p>}<Button type="submit" disabled={orderMutation.isPending || !cart.length} className="mt-4 w-full bg-[#16866f] text-white hover:bg-[#0f705d]">{orderMutation.isPending ? "Đang tạo đơn..." : "Thanh toán và tạo đơn"}</Button></div>
        </form>
      </div>
    </main>
  )
}
