import { useMemo, useState, type FormEvent } from "react"
import { ClipboardList, PackagePlus, Pencil, Plus, Search, Truck, X } from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { receiveStock } from "@/api/inventory/stock"
import { listWarehouses } from "@/api/inventory/warehouses"
import { listCatalogProducts, listCatalogProductVariants, type CatalogVariant } from "@/api/catalog/products"
import { listBranches } from "@/api/platform/branches"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type Supplier = {
  id: string
  name: string
  phone: string
  email: string
  address: string
  note: string
}

type Purchase = {
  id: string
  supplier: string
  date: string
  status: "Nháp" | "Đã nhập kho"
  items: number
  total: number
}

const initialSuppliers: Supplier[] = [
  { id: "sup-1", name: "Công ty Terra Việt Nam", phone: "0909888777", email: "contact@terra.vn", address: "Hà Nội", note: "" },
  { id: "sup-2", name: "Nhà cung cấp Mộc", phone: "0911222333", email: "moc@example.com", address: "TP. Hồ Chí Minh", note: "Giao hàng trong 2 ngày" }
]

const initialPurchases: Purchase[] = [
  { id: "PN-0001", supplier: "Công ty Terra Việt Nam", date: "2026-10-28", status: "Đã nhập kho", items: 12, total: 3360000 }
]

const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`

export function SuppliersPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches, enabled: !isDemo })
  const branchId = branchesQuery.data?.data[0]?.id
  const warehousesQuery = useQuery({
    queryKey: ["inventory-warehouses", branchId],
    queryFn: () => listWarehouses(branchId),
    enabled: Boolean(branchId) && !isDemo
  })
  const variantsQuery = useQuery({
    queryKey: ["catalog-product-variants"],
    queryFn: async () => {
      const catalogProducts = await listCatalogProducts({ limit: 100 })
      const groups = await Promise.all(catalogProducts.items.map((product) => listCatalogProductVariants(product.id)))
      return groups.flat()
    },
    enabled: !isDemo
  })
  const [tab, setTab] = useState<"purchases" | "suppliers">("purchases")
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [purchases, setPurchases] = useState(initialPurchases)
  const [query, setQuery] = useState("")
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [supplierDraft, setSupplierDraft] = useState({ name: "", phone: "", email: "", address: "", note: "" })
  const [purchaseDraft, setPurchaseDraft] = useState({ supplier: "", sku: "", quantity: "", costPrice: "" })
  const [error, setError] = useState("")
  const receiveMutation = useMutation({
    mutationFn: receiveStock,
    onSuccess: () => finishPurchase(),
    onError: () => setError("Không thể cập nhật tồn kho. Hãy kiểm tra chi nhánh và quyền tài khoản.")
  })

  const filteredSuppliers = useMemo(() => suppliers.filter((item) => `${item.name} ${item.phone} ${item.email}`.toLowerCase().includes(query.toLowerCase())), [query, suppliers])
  const filteredPurchases = useMemo(() => purchases.filter((item) => `${item.id} ${item.supplier}`.toLowerCase().includes(query.toLowerCase())), [purchases, query])

  const saveSupplier = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supplierDraft.name.trim() || !/^\+?[0-9]{8,15}$/.test(supplierDraft.phone)) return setError("Vui lòng nhập tên và số điện thoại hợp lệ.")
    setSuppliers((current) => [...current, { ...supplierDraft, id: `sup-${Date.now()}` }])
    setSupplierDraft({ name: "", phone: "", email: "", address: "", note: "" })
    setShowSupplierForm(false)
    setError("")
  }

  const savePurchase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const quantity = Number(purchaseDraft.quantity)
    const costPrice = Number(purchaseDraft.costPrice)
    if (!purchaseDraft.supplier || !purchaseDraft.sku || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(costPrice) || costPrice < 0) return setError("Vui lòng nhập đủ nhà cung cấp, sản phẩm, số lượng và giá nhập hợp lệ.")
    setError("")
    const total = quantity * costPrice
    if (isDemo) {
      finishPurchase(total)
      return
    }
    if (!branchId) {
      setError("Chưa có chi nhánh hoạt động để nhập kho.")
      return
    }
    const warehouseId = warehousesQuery.data?.find((warehouse) => warehouse.isDefault && warehouse.status === "ACTIVE")?.id
      ?? warehousesQuery.data?.find((warehouse) => warehouse.status === "ACTIVE")?.id
    if (!warehouseId) {
      setError("Chưa có kho hoạt động để nhập kho.")
      return
    }
    receiveMutation.mutate({ warehouseId, items: [{ skuId: purchaseDraft.sku, qty: String(quantity), unitCost: costPrice }] })
  }

  const finishPurchase = (total = Number(purchaseDraft.quantity) * Number(purchaseDraft.costPrice)) => {
    setPurchases((current) => [{ id: `PN-${String(current.length + 1).padStart(4, "0")}`, supplier: purchaseDraft.supplier, date: new Date().toISOString().slice(0, 10), status: "Đã nhập kho", items: Number(purchaseDraft.quantity), total }, ...current])
    setPurchaseDraft({ supplier: "", sku: "", quantity: "", costPrice: "" })
    setShowPurchaseForm(false)
    setError("")
  }

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Vận hành / Nhập hàng</p><h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Nhập hàng & nhà cung cấp</h1><p className="mt-2 text-sm text-slate-500">Theo dõi nhà cung cấp, giá nhập và các phiếu nhập kho.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => { setShowSupplierForm(true); setError("") }} className="gap-2 border-slate-200 text-slate-600"><Plus size={16} /> Nhà cung cấp</Button><Button onClick={() => { setShowPurchaseForm(true); setError("") }} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"><PackagePlus size={17} /> Tạo đơn nhập</Button></div></header>
      <div className="mb-5 grid gap-4 md:grid-cols-3"><SummaryCard label="Nhà cung cấp" value={suppliers.length} /><SummaryCard label="Phiếu nhập" value={purchases.length} /><SummaryCard label="Tổng giá trị nhập" value={money(purchases.reduce((sum, item) => sum + item.total, 0))} /></div>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div className="flex gap-1"><button type="button" onClick={() => setTab("purchases")} className={`rounded-lg px-4 py-2 text-sm ${tab === "purchases" ? "bg-[#e6f5ee] font-semibold text-[#16866f]" : "text-slate-500"}`}><ClipboardList className="mr-2 inline" size={15} />Đơn nhập</button><button type="button" onClick={() => setTab("suppliers")} className={`rounded-lg px-4 py-2 text-sm ${tab === "suppliers" ? "bg-[#e6f5ee] font-semibold text-[#16866f]" : "text-slate-500"}`}><Truck className="mr-2 inline" size={15} />Nhà cung cấp</button></div><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm..." className="w-48 outline-none" /></label></div>
        {tab === "purchases" ? <PurchaseTable rows={filteredPurchases} /> : <SupplierTable rows={filteredSuppliers} />}
      </section>
      {showSupplierForm && <SupplierForm draft={supplierDraft} onChange={setSupplierDraft} onSubmit={saveSupplier} onClose={() => setShowSupplierForm(false)} error={error} />}
      {showPurchaseForm && <PurchaseForm draft={purchaseDraft} suppliers={suppliers} variants={variantsQuery.data ?? []} onChange={setPurchaseDraft} onSubmit={savePurchase} onClose={() => setShowPurchaseForm(false)} error={error} />}
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: string | number }) { return <section className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section> }
function SupplierTable({ rows }: { rows: Supplier[] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#fbfcfc] text-xs uppercase tracking-wide text-slate-400"><tr>{["Nhà cung cấp", "Liên hệ", "Địa chỉ", "Ghi chú", ""].map((item) => <th key={item} className="px-5 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-medium text-[#163d36]">{row.name}</td><td className="px-5 py-4 text-slate-600">{row.phone}<span className="block text-xs text-slate-400">{row.email}</span></td><td className="px-5 py-4 text-slate-500">{row.address || "—"}</td><td className="px-5 py-4 text-slate-500">{row.note || "—"}</td><td className="px-5 py-4 text-right"><Pencil size={16} className="text-slate-400" /></td></tr>)}</tbody></table>{!rows.length && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy nhà cung cấp.</p>}</div> }
function PurchaseTable({ rows }: { rows: Purchase[] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#fbfcfc] text-xs uppercase tracking-wide text-slate-400"><tr>{["Mã phiếu", "Nhà cung cấp", "Ngày nhập", "Số lượng", "Tổng tiền", "Trạng thái"].map((item) => <th key={item} className="px-5 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-semibold text-[#163d36]">{row.id}</td><td className="px-5 py-4 text-slate-600">{row.supplier}</td><td className="px-5 py-4 text-slate-500">{row.date}</td><td className="px-5 py-4 text-slate-600">{row.items}</td><td className="px-5 py-4 font-medium text-slate-700">{money(row.total)}</td><td className="px-5 py-4"><span className="rounded-full bg-[#e6f5ee] px-2.5 py-1 text-xs text-[#147853]">{row.status}</span></td></tr>)}</tbody></table>{!rows.length && <p className="p-10 text-center text-sm text-slate-500">Chưa có đơn nhập.</p>}</div> }
function SupplierForm({ draft, onChange, onSubmit, onClose, error }: { draft: Omit<Supplier, "id">; onChange: (value: Omit<Supplier, "id">) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void; error: string }) { const update = (key: keyof Omit<Supplier, "id">, value: string) => onChange({ ...draft, [key]: value }); return <Modal title="Thêm nhà cung cấp" onClose={onClose}><form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">{(["name", "phone", "email", "address"] as const).map((key) => <label key={key} className="text-xs font-medium text-slate-600">{({ name: "Tên nhà cung cấp *", phone: "Số điện thoại *", email: "Email", address: "Địa chỉ" } as Record<string, string>)[key]}<input required={key === "name" || key === "phone"} type={key === "email" ? "email" : "text"} className={inputClass} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></label>)}<label className="text-xs font-medium text-slate-600 md:col-span-2">Ghi chú<textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" value={draft.note} onChange={(event) => update("note", event.target.value)} /></label>{error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}<ModalActions onClose={onClose} submit="Lưu nhà cung cấp" /></form></Modal> }
function PurchaseForm({ draft, suppliers, variants, onChange, onSubmit, onClose, error }: { draft: { supplier: string; sku: string; quantity: string; costPrice: string }; suppliers: Supplier[]; variants: CatalogVariant[]; onChange: (value: { supplier: string; sku: string; quantity: string; costPrice: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void; error: string }) { const update = (key: keyof typeof draft, value: string) => onChange({ ...draft, [key]: value }); return <Modal title="Tạo đơn nhập hàng" onClose={onClose}><form onSubmit={onSubmit} className="grid gap-4"><label className="text-xs font-medium text-slate-600">Nhà cung cấp<select required className={inputClass} value={draft.supplier} onChange={(event) => update("supplier", event.target.value)}><option value="">Chọn nhà cung cấp</option>{suppliers.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Biến thể / SKU<select required className={inputClass} value={draft.sku} onChange={(event) => update("sku", event.target.value)}><option value="">Chọn biến thể</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.skuCode})</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">Số lượng<input required min="1" type="number" className={inputClass} value={draft.quantity} onChange={(event) => update("quantity", event.target.value)} /></label><label className="text-xs font-medium text-slate-600">Giá nhập / đơn vị<input required min="0" type="number" className={inputClass} value={draft.costPrice} onChange={(event) => update("costPrice", event.target.value)} /></label></div><p className="text-xs text-slate-400">Khi xác nhận, số lượng sẽ được ghi nhận vào tồn kho thông qua phiếu nhập.</p>{error && <p className="text-sm text-red-600">{error}</p>}<ModalActions onClose={onClose} submit="Xác nhận nhập kho" /></form></Modal> }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#163d36]/30 p-4 pt-16 backdrop-blur-sm"><section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#163d36]">{title}</h2><button type="button" onClick={onClose} aria-label="Đóng"><X size={19} className="text-slate-400" /></button></div>{children}</section></div> }
function ModalActions({ onClose, submit }: { onClose: () => void; submit: string }) { return <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 md:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Hủy</Button><Button type="submit" className="bg-[#16866f] text-white hover:bg-[#0f705d]">{submit}</Button></div> }
