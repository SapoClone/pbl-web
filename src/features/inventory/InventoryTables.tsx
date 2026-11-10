import { Check, ClipboardCheck, Eye, PackageCheck, Pencil, Play, RotateCcw, Send, Undo2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CatalogVariant } from "@/api/catalog/variants"
import type { StockIssue, StockLevel, StockReceipt, StockTransfer, Stocktake, Warehouse } from "@/api/inventory/stock"

export type InventoryTab = "stock" | "balances" | "ledger" | "movements" | "thresholds" | "reconcile" | "receipts" | "issues" | "transfers" | "stocktakes" | "warehouses"
export const tabs: Array<{ id: InventoryTab; label: string }> = [
  { id: "stock", label: "Tồn kho" }, { id: "balances", label: "Tồn theo kho" }, { id: "ledger", label: "Sổ kho" }, { id: "movements", label: "Biến động kho" }, { id: "thresholds", label: "Định mức" }, { id: "reconcile", label: "Đối soát" }, { id: "receipts", label: "Nhập kho" }, { id: "issues", label: "Xuất kho" }, { id: "transfers", label: "Chuyển kho" }, { id: "stocktakes", label: "Kiểm kho" }, { id: "warehouses", label: "Danh sách kho" }
]

const quantity = (value?: string | number | null) => Number(value ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 })
const date = (value?: string | null) => value ? new Date(value).toLocaleString("vi-VN") : "—"
const statusLabels: Record<string, string> = { DRAFT: "Nháp", PENDING_APPROVAL: "Chờ duyệt", POSTED: "Đã ghi sổ", CANCELLED: "Đã hủy", DISPATCHED: "Đang chuyển", PARTIALLY_RECEIVED: "Nhận một phần", RECEIVED: "Đã nhận", COUNTING: "Đang kiểm", APPROVED: "Đã duyệt", ACTIVE: "Hoạt động", INACTIVE: "Ngừng hoạt động" }

function Status({ value }: { value: string }) {
  const done = ["POSTED", "RECEIVED", "APPROVED", "ACTIVE"].includes(value)
  const cancelled = ["CANCELLED", "INACTIVE"].includes(value)
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${done ? "bg-emerald-50 text-emerald-700" : cancelled ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{statusLabels[value] ?? value}</span>
}

export function StockTable({ rows }: { rows: StockLevel[] }) {
  return <TableShell empty={rows.length === 0}><table className="w-full min-w-[900px] text-left text-sm"><thead><tr>{["Sản phẩm", "SKU / Barcode", "Tồn thực tế", "Đang giữ", "Khả dụng", "Định mức", "Trạng thái"].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={`${item.branchId}-${item.variantId}`}><td><b>{item.name ?? "Chưa đồng bộ tên"}</b>{item.variantLabel && <small>{item.variantLabel}</small>}</td><td>{item.sku ?? "—"}<small>{item.barcode ?? "Chưa có barcode"}</small></td><td>{quantity(item.onHand)}</td><td>{quantity(item.reserved)}</td><td className="font-semibold text-[#163d36]">{quantity(item.available)}</td><td>{item.minQuantity === null ? "Chưa đặt" : `Tối thiểu ${quantity(item.minQuantity)}`}</td><td><Status value={item.level === "ok" ? "ACTIVE" : item.level === "below_min" ? "PENDING_APPROVAL" : "INACTIVE"} /></td></tr>)}</tbody></table></TableShell>
}

export function DocumentTable({ type, rows, warehouses, variants, pendingId, onAction }: { type: "receipt" | "issue" | "transfer" | "stocktake"; rows: Array<StockReceipt | StockIssue | StockTransfer | Stocktake>; warehouses: Warehouse[]; variants: CatalogVariant[]; pendingId?: string; onAction: (action: string, item: StockReceipt | StockIssue | StockTransfer | Stocktake) => void }) {
  const warehouseNames = new Map(warehouses.map((item) => [item.id, item.name]))
  const variantNames = new Map(variants.map((item) => [item.variantId, item.skuCode]))
  return <TableShell empty={rows.length === 0}><table className="w-full min-w-[960px] text-left text-sm"><thead><tr><th>Mã phiếu</th><th>{type === "transfer" ? "Tuyến kho" : "Kho"}</th><th>Sản phẩm</th><th>Số lượng</th><th>Trạng thái</th><th>Ngày tạo</th><th className="text-right">Thao tác</th></tr></thead><tbody>{rows.map((row) => {
    const first = row.items[0]
    const qty = type === "transfer" ? first?.transferQty : type === "stocktake" ? first?.snapshotOnHandQty : first?.qty
    const route = "fromWarehouseId" in row ? `${warehouseNames.get(row.fromWarehouseId) ?? row.fromWarehouseId} → ${warehouseNames.get(row.toWarehouseId) ?? row.toWarehouseId}` : warehouseNames.get(row.warehouseId) ?? row.warehouseId
    return <tr key={row.id}><td><b>{row.code}</b><small>{row.items.length} dòng hàng</small></td><td>{route}</td><td>{variantNames.get(first?.skuId ?? "") ?? (first?.skuId ? `${first.skuId.slice(0, 8)}…` : "—")}</td><td>{quantity(qty)}</td><td><Status value={row.status} /></td><td>{date(row.createdAt)}</td><td><div className="flex justify-end gap-1"><Button type="button" variant="ghost" size="sm" disabled={pendingId === row.id} onClick={() => onAction("view", row)} className="gap-1 text-slate-500"><Eye size={14} />Chi tiết</Button>{actions(type, row.status).map((action) => <Button key={action.id} type="button" variant={action.primary ? "default" : "ghost"} size="sm" disabled={pendingId === row.id} onClick={() => onAction(action.id, row)} className={action.primary ? "bg-[#16866f] text-white hover:bg-[#0f705d]" : "text-slate-500"}>{action.icon}{action.label}</Button>)}</div></td></tr>
  })}</tbody></table></TableShell>
}

function actions(type: "receipt" | "issue" | "transfer" | "stocktake", status: string) {
  if (type === "receipt" && status === "DRAFT") return [{ id: "submit", label: "Gửi duyệt", icon: <Send size={14} />, primary: true }, { id: "post", label: "Ghi sổ ngay", icon: <PackageCheck size={14} /> }, { id: "cancel", label: "Hủy", icon: <XCircle size={14} /> }]
  if (type === "receipt" && status === "PENDING_APPROVAL") return [{ id: "approve", label: "Duyệt", icon: <Check size={14} />, primary: true }, { id: "reject", label: "Trả lại", icon: <Undo2 size={14} /> }, { id: "cancel", label: "Hủy", icon: <XCircle size={14} /> }]
  if (type === "issue" && status === "DRAFT") return [{ id: "post", label: "Ghi sổ", icon: <PackageCheck size={14} />, primary: true }, { id: "cancel", label: "Hủy", icon: <XCircle size={14} /> }]
  if (type === "transfer" && status === "DRAFT") return [{ id: "dispatch", label: "Xuất chuyển", icon: <Play size={14} />, primary: true }, { id: "cancel", label: "Hủy", icon: <XCircle size={14} /> }]
  if (type === "transfer" && ["DISPATCHED", "PARTIALLY_RECEIVED"].includes(status)) return [{ id: "receive", label: "Nhận hàng", icon: <Check size={14} />, primary: true }, { id: "cancel", label: "Hủy", icon: <RotateCcw size={14} /> }]
  if (type === "stocktake" && status === "DRAFT") return [{ id: "count", label: "Nhập số đếm", icon: <ClipboardCheck size={14} />, primary: true }, { id: "cancel", label: "Hủy", icon: <XCircle size={14} /> }]
  if (type === "stocktake" && status === "COUNTING") return [{ id: "count", label: "Sửa số đếm", icon: <ClipboardCheck size={14} /> }, { id: "approve", label: "Duyệt", icon: <Check size={14} />, primary: true }, { id: "cancel", label: "Hủy", icon: <XCircle size={14} /> }]
  return []
}

export function WarehouseTable({ rows, onEdit }: { rows: Warehouse[]; onEdit?: (warehouse: Warehouse) => void }) {
  return <TableShell empty={rows.length === 0}><table className="w-full min-w-[820px] text-left text-sm"><thead><tr><th>Mã kho</th><th>Tên kho</th><th>Loại</th><th>Địa chỉ</th><th>Mặc định</th><th>Trạng thái</th><th></th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td className="font-semibold">{item.code}</td><td>{item.name}</td><td>{{ BRANCH: "Chi nhánh", CENTRAL: "Trung tâm", QUARANTINE: "Cách ly" }[item.kind]}</td><td>{item.address ?? "—"}</td><td>{item.isDefault ? "Có" : "Không"}</td><td><Status value={item.status} /></td><td className="text-right">{onEdit && <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)} className="gap-1 text-slate-500"><Pencil size={14} />Sửa</Button>}</td></tr>)}</tbody></table></TableShell>
}

function TableShell({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]"><div className="inventory-table overflow-x-auto">{children}{empty && <p className="p-12 text-center text-sm text-slate-500">Chưa có dữ liệu.</p>}</div></section>
}
