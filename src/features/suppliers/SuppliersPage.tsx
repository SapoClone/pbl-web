import { useMemo, useState } from "react"
import axios from "axios"
import {
  Check,
  Download,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { listActiveVariants, type CatalogVariant } from "@/api/catalog/variants"
import { listWarehouses, type Warehouse } from "@/api/inventory/stock"
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  deleteSupplier,
  exportPurchaseOrders,
  getPurchaseOrder,
  getPurchaseOrderSummary,
  getSupplier,
  listPurchaseOrderDirectory,
  listPurchaseOrders,
  listSupplierDirectory,
  listSuppliers,
  receivePurchaseOrder,
  updateSupplier,
  type PurchaseOrder,
  type Supplier
} from "@/api/inventory/procurement"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const input =
  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
const money = (v: number) => `${v.toLocaleString("vi-VN")} ₫`
const date = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—"

const labels: Record<string, string> = {
  DRAFT: "Nháp",
  APPROVED: "Đã duyệt",
  PARTIALLY_RECEIVED: "Nhận một phần",
  RECEIVED: "Đã nhận đủ",
  CANCELLED: "Đã hủy",
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động"
}

const statusBadgeClass: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  APPROVED: "bg-sky-50 text-sky-700",
  PARTIALLY_RECEIVED: "bg-amber-50 text-amber-700",
  RECEIVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-500"
}

export function SuppliersPage() {
  const qc = useQueryClient()
  const demo = Boolean(useStoreAuth((s) => s.tokens?.isDemo))
  const [tab, setTab] = useState<"purchases" | "suppliers">("purchases")
  const [search, setSearch] = useState("")
  const [poStatusFilter, setPoStatusFilter] = useState("ALL")
  const [supplierForm, setSupplierForm] = useState<"new" | Supplier | null>(
    null
  )
  const [purchaseForm, setPurchaseForm] = useState(false)
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null)
  const [detail, setDetail] = useState<{
    type: "supplier" | "purchase"
    id: string
  } | null>(null)
  const [error, setError] = useState("")

  const suppliers = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => listSuppliers(tab === "suppliers" && search ? search : undefined),
    enabled: !demo
  })
  const supplierDirectory = useQuery({
    queryKey: ["supplier-directory", search],
    queryFn: () =>
      listSupplierDirectory(tab === "suppliers" && search ? search : undefined),
    enabled: !demo
  })
  const purchases = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => listPurchaseOrders(),
    enabled: !demo
  })
  const purchaseDirectory = useQuery({
    queryKey: ["purchase-order-directory"],
    queryFn: () => listPurchaseOrderDirectory(),
    enabled: !demo
  })
  const purchaseSummary = useQuery({
    queryKey: ["purchase-order-summary"],
    queryFn: () => getPurchaseOrderSummary(),
    enabled: !demo
  })
  const warehouses = useQuery({
    queryKey: ["inventory-warehouses"],
    queryFn: () => listWarehouses(),
    enabled: !demo
  })
  const variants = useQuery({
    queryKey: ["catalog-variants"],
    queryFn: listActiveVariants,
    enabled: !demo
  })
  const supplierDetail = useQuery({
    queryKey: ["supplier-detail", detail?.id],
    queryFn: () => getSupplier(detail!.id),
    enabled: detail?.type === "supplier"
  })
  const poDetail = useQuery({
    queryKey: ["purchase-detail", detail?.id],
    queryFn: () => getPurchaseOrder(detail!.id),
    enabled: detail?.type === "purchase"
  })

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["suppliers"] }),
      qc.invalidateQueries({ queryKey: ["supplier-directory"] }),
      qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
      qc.invalidateQueries({ queryKey: ["purchase-order-directory"] }),
      qc.invalidateQueries({ queryKey: ["purchase-order-summary"] }),
      qc.invalidateQueries({ queryKey: ["purchase-detail"] }),
      qc.invalidateQueries({ queryKey: ["inventory-stock"] }),
      qc.invalidateQueries({ queryKey: ["inventory-summary"] })
    ])

  const action = useMutation({
    mutationFn: async ({
      kind,
      row
    }: {
      kind: string
      row: Supplier | PurchaseOrder
    }) => {
      if ("supplierId" in row) {
        if (kind === "approve") return approvePurchaseOrder(row.id)
        if (kind === "receive") return receivePurchaseOrder(row.id)
        return cancelPurchaseOrder(
          row.id,
          window.prompt("Lý do hủy đơn mua:") ?? undefined
        )
      }
      if (kind === "delete") return deleteSupplier(row.id)
      return updateSupplier(row.id, {
        status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      })
    },
    onSuccess: async () => {
      setError("")
      await refresh()
    },
    onError: (e) => setError(apiError(e))
  })

  const pos = useMemo(() => {
    const raw = purchases.data ?? []
    const supplierMap = new Map(
      (suppliers.data ?? []).map((s) => [s.id, s.name])
    )
    return raw.filter((po) => {
      const matchesStatus =
        poStatusFilter === "ALL" || po.status === poStatusFilter
      const supplierName = supplierMap.get(po.supplierId) ?? ""
      const matchesSearch =
        !search ||
        tab !== "purchases" ||
        `${po.code} ${supplierName}`
          .toLowerCase()
          .includes(search.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [poStatusFilter, purchases.data, search, suppliers.data, tab])

  const exportOrders = async () => {
    try {
      downloadBlob(
        await exportPurchaseOrders(),
        `don-mua-${new Date().toISOString().slice(0, 10)}.csv`
      )
    } catch (e) {
      setError(apiError(e))
    }
  }

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <DashboardHeader section="suppliers" />
      {demo && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Tài khoản demo không gọi API mua hàng. Đăng nhập tài khoản hệ thống để
          tạo đơn mua & nhập kho.
        </p>
      )}
      <div className="mb-5 flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={demo} onClick={exportOrders}>
          <Download size={16} /> Xuất đơn mua
        </Button>
        <Button
          variant="outline"
          disabled={demo}
          onClick={() => setSupplierForm("new")}
        >
          <Plus size={16} /> Nhà cung cấp
        </Button>
        <Button
          disabled={demo}
          onClick={() => setPurchaseForm(true)}
          className="bg-[#16866f] text-white hover:bg-[#0f705d]"
        >
          <PackagePlus size={16} /> Tạo đơn mua
        </Button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card
          label="Nhà cung cấp"
          value={
            supplierDirectory.data?.pagination.totalRecords ??
            (suppliers.data?.length ?? 0)
          }
        />
        <Card
          label="Đơn đang mở"
          value={
            purchaseSummary.data?.openCount ??
            purchaseDirectory.data?.pagination.totalRecords ??
            0
          }
        />
        <Card
          label="Chờ giao"
          value={purchaseSummary.data?.awaitingDeliveryCount ?? 0}
        />
        <Card
          label="Nhận một phần"
          value={purchaseSummary.data?.partiallyReceivedCount ?? 0}
        />
        <Card
          label="Giá trị phải trả"
          value={money(purchaseSummary.data?.payableAmount ?? 0)}
        />
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex gap-1">
            <Tab
              active={tab === "purchases"}
              onClick={() => setTab("purchases")}
            >
              <PackagePlus size={15} /> Đơn mua hàng
            </Tab>
            <Tab
              active={tab === "suppliers"}
              onClick={() => setTab("suppliers")}
            >
              <Truck size={15} /> Nhà cung cấp
            </Tab>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tab === "purchases" && (
              <select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Nháp</option>
                <option value="APPROVED">Đã duyệt (Chờ nhận)</option>
                <option value="PARTIALLY_RECEIVED">Nhận một phần</option>
                <option value="RECEIVED">Đã nhận đủ</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            )}
            <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-400 focus-within:border-[#16866f]">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === "suppliers"
                    ? "Tên hoặc mã NCC..."
                    : "Mã đơn mua, tên NCC..."
                }
                className="w-48 text-slate-700 outline-none"
              />
            </label>
          </div>
        </div>

        {tab === "suppliers" ? (
          <SupplierRows
            rows={suppliers.data ?? []}
            pending={action.isPending}
            detail={(x) => setDetail({ type: "supplier", id: x.id })}
            edit={setSupplierForm}
            act={(kind, row) => action.mutate({ kind, row })}
          />
        ) : (
          <PurchaseRows
            rows={pos}
            suppliers={suppliers.data ?? []}
            warehouses={warehouses.data ?? []}
            pending={action.isPending}
            detail={(x) => setDetail({ type: "purchase", id: x.id })}
            onOpenReceive={(x) => setReceivingPo(x)}
            act={(kind, row) => action.mutate({ kind, row })}
          />
        )}
      </section>

      {supplierForm && (
        <SupplierForm
          initial={supplierForm === "new" ? null : supplierForm}
          close={() => setSupplierForm(null)}
          saved={async () => {
            setSupplierForm(null)
            await refresh()
          }}
        />
      )}

      {purchaseForm && (
        <PurchaseForm
          suppliers={suppliers.data ?? []}
          warehouses={warehouses.data ?? []}
          variants={variants.data ?? []}
          close={() => setPurchaseForm(false)}
          saved={async () => {
            setPurchaseForm(false)
            await refresh()
          }}
        />
      )}

      {receivingPo && (
        <ReceivePurchaseModal
          po={receivingPo}
          variants={variants.data ?? []}
          close={() => setReceivingPo(null)}
          saved={async () => {
            setReceivingPo(null)
            await refresh()
          }}
        />
      )}

      {detail && (
        <Detail
          supplier={
            detail.type === "supplier" ? supplierDetail.data : undefined
          }
          po={detail.type === "purchase" ? poDetail.data : undefined}
          variants={variants.data ?? []}
          close={() => setDetail(null)}
        />
      )}
    </main>
  )
}

function SupplierRows({
  rows,
  pending,
  detail,
  edit,
  act
}: {
  rows: Supplier[]
  pending: boolean
  detail: (x: Supplier) => void
  edit: (x: Supplier) => void
  act: (k: string, x: Supplier) => void
}) {
  return (
    <Table empty={!rows.length}>
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Nhà cung cấp</th>
            <th>Liên hệ</th>
            <th>Địa chỉ</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="font-mono font-semibold text-slate-700">
                {x.code}
              </td>
              <td>
                <button
                  className="font-semibold text-[#16866f] hover:underline"
                  onClick={() => detail(x)}
                >
                  {x.name}
                </button>
              </td>
              <td>
                {x.phone ?? "—"}
                <small>{x.email ?? ""}</small>
              </td>
              <td>{x.address ?? "—"}</td>
              <td>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    statusBadgeClass[x.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {labels[x.status]}
                </span>
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => edit(x)}>
                    <Pencil size={14} /> Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => act("toggle", x)}
                  >
                    {x.status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => act("delete", x)}
                    className="text-red-600"
                  >
                    Xóa
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  )
}

function PurchaseRows({
  rows,
  suppliers,
  warehouses,
  pending,
  detail,
  onOpenReceive,
  act
}: {
  rows: PurchaseOrder[]
  suppliers: Supplier[]
  warehouses: Warehouse[]
  pending: boolean
  detail: (x: PurchaseOrder) => void
  onOpenReceive: (x: PurchaseOrder) => void
  act: (k: string, x: PurchaseOrder) => void
}) {
  const sn = new Map(suppliers.map((x) => [x.id, x.name]))
  const wn = new Map(warehouses.map((x) => [x.id, x.name]))
  return (
    <Table empty={!rows.length}>
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Nhà cung cấp</th>
            <th>Kho nhận</th>
            <th>Dự kiến</th>
            <th>Giá trị</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}>
              <td>
                <button
                  onClick={() => detail(x)}
                  className="font-mono font-semibold text-[#16866f] hover:underline"
                >
                  {x.code}
                </button>
                <small>{x.items.length} dòng hàng</small>
              </td>
              <td className="font-medium text-slate-700">
                {sn.get(x.supplierId) ?? x.supplierId}
              </td>
              <td>{wn.get(x.warehouseId) ?? x.warehouseId}</td>
              <td>{date(x.expectedDate)}</td>
              <td className="font-semibold text-slate-800">
                {money(x.totalAmount)}
              </td>
              <td>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    statusBadgeClass[x.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {labels[x.status] ?? x.status}
                </span>
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  {x.status === "DRAFT" && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => act("approve", x)}
                      className="gap-1 bg-[#16866f] text-white hover:bg-[#0f705d]"
                    >
                      <Check size={14} /> Duyệt
                    </Button>
                  )}
                  {["APPROVED", "PARTIALLY_RECEIVED"].includes(x.status) && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => onOpenReceive(x)}
                      className="gap-1 bg-[#16866f] text-white hover:bg-[#0f705d]"
                    >
                      <PackageCheck size={14} /> Nhận hàng
                    </Button>
                  )}
                  {["DRAFT", "APPROVED"].includes(x.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => act("cancel", x)}
                    >
                      Hủy
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  )
}

function SupplierForm({
  initial,
  close,
  saved
}: {
  initial: Supplier | null
  close: () => void
  saved: () => Promise<void>
}) {
  const [v, setV] = useState({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    taxCode: initial?.taxCode ?? "",
    note: initial?.note ?? ""
  })
  const [error, setError] = useState("")
  const m = useMutation({
    mutationFn: () =>
      initial ? updateSupplier(initial.id, v) : createSupplier(v),
    onSuccess: saved,
    onError: (e) => setError(apiError(e))
  })
  return (
    <Modal
      title={initial ? "Cập nhật nhà cung cấp" : "Thêm nhà cung cấp"}
      close={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          m.mutate()
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {(
          ["code", "name", "phone", "email", "address", "taxCode"] as const
        ).map((k) => (
          <Field
            key={k}
            label={
              {
                code: "Mã NCC *",
                name: "Tên NCC *",
                phone: "Điện thoại",
                email: "Email",
                address: "Địa chỉ",
                taxCode: "Mã số thuế"
              }[k]
            }
          >
            <input
              className={input}
              required={k === "code" || k === "name"}
              disabled={Boolean(initial && k === "code")}
              value={v[k]}
              onChange={(e) => setV((old) => ({ ...old, [k]: e.target.value }))}
            />
          </Field>
        ))}
        <label className="text-xs text-slate-600 sm:col-span-2">
          Ghi chú
          <textarea
            className="mt-1 min-h-20 w-full rounded-lg border p-3 text-sm"
            value={v.note}
            onChange={(e) => setV((old) => ({ ...old, note: e.target.value }))}
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
        )}
        <Actions pending={m.isPending} close={close} label="Lưu nhà cung cấp" />
      </form>
    </Modal>
  )
}

type PoDraftLine = {
  id: string
  skuId: string
  qty: string
  cost: string
}

function PurchaseForm({
  suppliers,
  warehouses,
  variants,
  close,
  saved
}: {
  suppliers: Supplier[]
  warehouses: Warehouse[]
  variants: CatalogVariant[]
  close: () => void
  saved: () => Promise<void>
}) {
  const [supplierId, setSupplierId] = useState("")
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((x) => x.isDefault)?.id ?? warehouses[0]?.id ?? ""
  )
  const [expectedDate, setExpectedDate] = useState("")
  const [note, setNote] = useState("")
  const [lines, setLines] = useState<PoDraftLine[]>([
    { id: "po-line-1", skuId: "", qty: "10", cost: "" }
  ])
  const [error, setError] = useState("")

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `po-line-${Date.now()}-${prev.length}`,
        skuId: "",
        qty: "1",
        cost: ""
      }
    ])
  }

  const updateLine = (
    id: string,
    field: keyof Omit<PoDraftLine, "id">,
    val: string
  ) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        if (field === "skuId") {
          const found = variants.find((v) => v.variantId === val)
          return {
            ...l,
            skuId: val,
            cost:
              !l.cost && found?.price
                ? String(Math.round(found.price * 0.65))
                : l.cost
          }
        }
        return { ...l, [field]: val }
      })
    )
  }

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev))
  }

  const totalAmount = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + (Number(l.qty) || 0) * (Number(l.cost) || 0),
        0
      ),
    [lines]
  )

  const m = useMutation({
    mutationFn: async () => {
      const seen = new Set<string>()
      const validItems = lines.map((l) => {
        if (!l.skuId || !l.qty || Number(l.qty) <= 0 || Number(l.cost) < 0) {
          throw new Error(
            "Vui lòng chọn sản phẩm, số lượng (>0) và đơn giá hợp lệ cho mọi dòng."
          )
        }
        if (seen.has(l.skuId)) {
          throw new Error(
            "Một sản phẩm đang bị chọn lặp lại trên nhiều dòng. Hãy gộp số lượng."
          )
        }
        seen.add(l.skuId)
        return {
          skuId: l.skuId,
          orderedQty: Number(l.qty).toFixed(3),
          unitCost: Number(l.cost)
        }
      })

      return createPurchaseOrder({
        supplierId,
        warehouseId,
        expectedDate: expectedDate || undefined,
        note: note || undefined,
        items: validItems
      })
    },
    onSuccess: saved,
    onError: (e) =>
      setError(e instanceof Error && !axios.isAxiosError(e) ? e.message : apiError(e))
  })

  return (
    <Modal title="Tạo đơn mua hàng (PO)" close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          m.mutate()
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Nhà cung cấp *">
          <select
            className={input}
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Chọn NCC</option>
            {suppliers
              .filter((x) => x.status === "ACTIVE")
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code})
                </option>
              ))}
          </select>
        </Field>

        <Field label="Kho nhận *">
          <select
            className={input}
            required
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">Chọn kho</option>
            {warehouses
              .filter((x) => x.status === "ACTIVE")
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code})
                </option>
              ))}
          </select>
        </Field>

        <Field label="Ngày giao dự kiến">
          <input
            className={input}
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </Field>

        <Field label="Ghi chú đơn mua">
          <input
            className={input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Điều khoản giao hàng, chiết khấu..."
          />
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">
              Danh sách sản phẩm đặt mua ({lines.length} dòng) *
            </span>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 rounded-lg bg-[#e6f5ee] px-2.5 py-1 text-xs font-semibold text-[#16866f] transition hover:bg-[#d4ede2]"
            >
              <Plus size={13} /> Thêm dòng sản phẩm
            </button>
          </div>

          <div className="max-h-60 space-y-2.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            {lines.map((line, index) => (
              <div
                key={line.id}
                className="grid items-end gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 sm:grid-cols-[1fr_100px_140px_36px]"
              >
                <label className="text-[11px] font-medium text-slate-600">
                  Sản phẩm #{index + 1} *
                  <select
                    className={input}
                    required
                    value={line.skuId}
                    onChange={(e) =>
                      updateLine(line.id, "skuId", e.target.value)
                    }
                  >
                    <option value="">Chọn sản phẩm</option>
                    {variants.map((x) => (
                      <option key={x.variantId} value={x.variantId}>
                        {x.name}
                        {x.label ? ` - ${x.label}` : ""} ({x.skuCode})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[11px] font-medium text-slate-600">
                  Số lượng *
                  <input
                    className={input}
                    required
                    min="0.001"
                    step="0.001"
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(line.id, "qty", e.target.value)}
                  />
                </label>

                <label className="text-[11px] font-medium text-slate-600">
                  Đơn giá nhập (₫) *
                  <input
                    className={input}
                    required
                    min="0"
                    step="1"
                    type="number"
                    value={line.cost}
                    onChange={(e) =>
                      updateLine(line.id, "cost", e.target.value)
                    }
                  />
                </label>

                <button
                  type="button"
                  disabled={lines.length === 1}
                  onClick={() => removeLine(line.id)}
                  className="flex h-10 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#f4fbf8] px-3.5 py-2.5 text-xs">
            <span className="text-slate-600">
              Tổng cộng giá trị đơn mua ({lines.length} SKU):
            </span>
            <span className="text-base font-bold text-[#16866f]">
              {money(totalAmount)}
            </span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
        )}
        <Actions pending={m.isPending} close={close} label="Tạo đơn mua" />
      </form>
    </Modal>
  )
}

function ReceivePurchaseModal({
  po,
  variants,
  close,
  saved
}: {
  po: PurchaseOrder
  variants: CatalogVariant[]
  close: () => void
  saved: () => Promise<void>
}) {
  const names = new Map(
    variants.map((x) => [
      x.variantId,
      `${x.name}${x.label ? ` - ${x.label}` : ""} (${x.skuCode})`
    ])
  )
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      po.items.map((item) => [item.skuId, String(Number(item.remainingQty))])
    )
  )
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const itemsToReceive = po.items
        .map((item) => ({
          skuId: item.skuId,
          qty: Number(quantities[item.skuId] || 0).toFixed(3),
          unitCost: item.unitCost
        }))
        .filter((i) => Number(i.qty) > 0)

      if (itemsToReceive.length === 0) {
        throw new Error("Vui lòng nhập số lượng thực nhận lớn hơn 0 cho ít nhất 1 mặt hàng.")
      }

      return receivePurchaseOrder(po.id, {
        items: itemsToReceive,
        note: note.trim() || undefined
      })
    },
    onSuccess: saved,
    onError: (e) =>
      setError(e instanceof Error && !axios.isAxiosError(e) ? e.message : apiError(e))
  })

  return (
    <Modal title={`Nhận hàng từ đơn mua ${po.code}`} close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          receiveMutation.mutate()
        }}
        className="space-y-4"
      >
        <p className="text-xs text-slate-500">
          Nhập số lượng thực nhận đợt này cho từng SKU. Bạn có thể nhận một phần
          (đơn chuyển sang <b>Nhận một phần</b>) hoặc nhận đủ toàn bộ phần còn lại.
        </p>

        <div className="max-h-64 space-y-2.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          {po.items.map((item) => {
            const rem = Number(item.remainingQty)
            return (
              <div
                key={item.id}
                className="grid items-center gap-3 rounded-lg border border-slate-200/80 bg-white p-3 sm:grid-cols-[1fr_140px]"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {names.get(item.skuId) ?? item.skuId}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Đặt: <b>{Number(item.orderedQty)}</b> · Đã nhận:{" "}
                    <b>{Number(item.receivedQty)}</b> · Còn lại:{" "}
                    <b className="text-[#16866f]">{rem}</b> · Giá vốn:{" "}
                    {money(item.unitCost)}
                  </p>
                </div>
                <label className="text-xs font-medium text-slate-600">
                  SL nhận đợt này
                  <input
                    className={input}
                    type="number"
                    min="0"
                    max={rem}
                    step="0.001"
                    disabled={rem <= 0}
                    value={quantities[item.skuId] ?? "0"}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [item.skuId]: e.target.value
                      }))
                    }
                  />
                </label>
              </div>
            )
          })}
        </div>

        <label className="block text-xs font-medium text-slate-600">
          Ghi chú biên bản giao nhận
          <input
            className={input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Số phiếu giao hàng của NCC, tình trạng kiện hàng..."
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={close}>
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={receiveMutation.isPending}
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            {receiveMutation.isPending
              ? "Đang nhập kho..."
              : "Xác nhận nhận hàng & Nhập kho"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Detail({
  supplier,
  po,
  variants,
  close
}: {
  supplier?: Supplier
  po?: PurchaseOrder
  variants: CatalogVariant[]
  close: () => void
}) {
  const names = new Map(
    variants.map((x) => [x.variantId, `${x.name} (${x.skuCode})`])
  )
  return (
    <Modal
      title={supplier ? "Chi tiết nhà cung cấp" : "Chi tiết đơn mua"}
      close={close}
    >
      {!supplier && !po ? (
        <p className="p-8 text-center text-sm">Đang tải...</p>
      ) : supplier ? (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <b>Mã:</b> {supplier.code}
          </p>
          <p>
            <b>Tên:</b> {supplier.name}
          </p>
          <p>
            <b>Điện thoại:</b> {supplier.phone ?? "—"}
          </p>
          <p>
            <b>Email:</b> {supplier.email ?? "—"}
          </p>
          <p>
            <b>Địa chỉ:</b> {supplier.address ?? "—"}
          </p>
          <p>
            <b>Trạng thái:</b> {labels[supplier.status]}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <b>Mã:</b> {po!.code}
            </p>
            <p>
              <b>Trạng thái:</b> {labels[po!.status]}
            </p>
            <p>
              <b>Tổng tiền:</b> {money(po!.totalAmount)}
            </p>
            <p>
              <b>Ngày tạo:</b> {date(po!.createdAt)}
            </p>
          </div>
          <Table empty={!po!.items.length}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Đặt</th>
                  <th>Đã nhận</th>
                  <th>Còn lại</th>
                  <th>Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                {po!.items.map((x) => (
                  <tr key={x.id}>
                    <td>{names.get(x.skuId) ?? x.skuId}</td>
                    <td>{x.orderedQty}</td>
                    <td>{x.receivedQty}</td>
                    <td>{x.remainingQty}</td>
                    <td>{money(x.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </>
      )}
    </Modal>
  )
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_15px_rgba(20,50,45,0.03)]">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p>
    </section>
  )
}
function Tab({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
        active
          ? "bg-[#e6f5ee] font-semibold text-[#16866f]"
          : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  )
}
function Table({
  empty,
  children
}: {
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <div className="inventory-table overflow-x-auto">
      {children}
      {empty && (
        <p className="p-10 text-center text-sm text-slate-500">
          Chưa có dữ liệu.
        </p>
      )}
    </div>
  )
}
function Modal({
  title,
  close,
  children
}: {
  title: string
  close: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#163d36]/35 p-4 pt-14 backdrop-blur-xs">
      <section className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex justify-between">
          <h2 className="text-lg font-semibold text-[#163d36]">{title}</h2>
          <button onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      {children}
    </label>
  )
}
function Actions({
  pending,
  close,
  label
}: {
  pending: boolean
  close: () => void
  label: string
}) {
  return (
    <div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2">
      <Button type="button" variant="outline" onClick={close}>
        Hủy
      </Button>
      <Button
        type="submit"
        disabled={pending}
        className="bg-[#16866f] text-white hover:bg-[#0f705d]"
      >
        {pending ? "Đang lưu..." : label}
      </Button>
    </div>
  )
}
function apiError(e: unknown) {
  if (!axios.isAxiosError(e)) return "Không thể thực hiện thao tác."
  const d = e.response?.data as
    | { message?: string | string[]; errorCode?: string }
    | undefined
  return (
    (Array.isArray(d?.message) ? d.message.join(" ") : d?.message) ||
    d?.errorCode ||
    "Không thể thực hiện thao tác."
  )
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
