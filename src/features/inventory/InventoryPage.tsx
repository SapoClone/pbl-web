import { useEffect, useState } from "react"
import axios from "axios"
import { AlertTriangle, ArrowDownToLine, Boxes, Download, Plus, PackageCheck } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { listBranches } from "@/api/platform/branches"
import { listActiveVariants } from "@/api/catalog/variants"
import {
  approveStockReceipt, approveStocktake, cancelStockIssue, cancelStockReceipt, cancelStocktake, cancelStockTransfer,
  createStockIssue, createStockReceipt, createStocktake, createStockTransfer, createWarehouse,
  dispatchStockTransfer, exportStock, getStockBySku, getStockIssue, getStockReceipt, getStockSummary, getStocktake, getStockTransfer, getWarehouse,
  listLedgerEntries, listStockIssues, listStockLevels, listStockReceipts,
  listStockMovements, listStocktakes, listStockThresholds, listStockTransfers, listWarehouses,
  listWarehouseStocks, lookupStock, postStockIssue, postStockReceipt, receiveStockTransfer, reconcileStocks,
  recordStocktakeCounts, rejectStockReceipt, submitStockReceipt, updateWarehouse, upsertBranchStockThreshold, upsertStockThreshold,
  type StockIssue, type StockLookup, type StockReceipt, type StockThreshold, type Stocktake, type StockTransfer, type Warehouse
} from "@/api/inventory/stock"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { InventoryForm, StocktakeCountForm, type InventoryFormMode, type InventorySubmitValue } from "./InventoryForms"
import { DocumentTable, StockTable, WarehouseTable, tabs, type InventoryTab } from "./InventoryTables"
import { BalanceTable, MovementTable, ReconciliationPanel, SkuStockModal, ThresholdForm, ThresholdTable, TransferReceiveForm } from "./InventoryAdvanced"
import { BranchThresholdModal, DocumentDetailModal, LedgerTable, StockLookupBar, WarehouseEditModal } from "./InventoryExtras"

const modeForTab: Partial<Record<InventoryTab, InventoryFormMode>> = { receipts: "receipt", issues: "issue", transfers: "transfer", stocktakes: "stocktake", warehouses: "warehouse" }
const createLabels: Partial<Record<InventoryTab, string>> = { receipts: "Tạo phiếu nhập", issues: "Tạo phiếu xuất", transfers: "Tạo phiếu chuyển", stocktakes: "Tạo phiếu kiểm", warehouses: "Thêm kho" }

export function InventoryPage() {
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const requestedTab = useRouterState({ select: (state) => new URLSearchParams(state.location.searchStr).get("tab") })
  const initialTab = tabs.some((item) => item.id === requestedTab) ? requestedTab as InventoryTab : "stock"
  const [tab, setTab] = useState<InventoryTab>(initialTab)
  const [branchId, setBranchId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [formMode, setFormMode] = useState<InventoryFormMode | null>(null)
  const [counting, setCounting] = useState<Stocktake | null>(null)
  const [receiving, setReceiving] = useState<StockTransfer | null>(null)
  const [thresholdForm, setThresholdForm] = useState<null | "new" | StockThreshold>(null)
  const [branchThresholdOpen, setBranchThresholdOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<StockReceipt | StockIssue | StockTransfer | Stocktake | null>(null)
  const [lookupResult, setLookupResult] = useState<StockLookup>()
  const [reconciliation, setReconciliation] = useState<Awaited<ReturnType<typeof reconcileStocks>>>()
  const [selectedSku, setSelectedSku] = useState("")
  const [actionError, setActionError] = useState("")
  const [pendingId, setPendingId] = useState("")

  useEffect(() => {
    if (requestedTab && tabs.some((item) => item.id === requestedTab)) setTab(requestedTab as InventoryTab)
  }, [requestedTab])

  const branches = useQuery({ queryKey: ["branches"], queryFn: listBranches, enabled: !isDemo })
  const selectedBranch = branchId || branches.data?.data[0]?.id || ""
  const warehouses = useQuery({ queryKey: ["inventory-warehouses"], queryFn: () => listWarehouses(), enabled: !isDemo })
  const selectedWarehouse = warehouseId || warehouses.data?.find((item) => item.isDefault)?.id || warehouses.data?.[0]?.id || ""
  const variants = useQuery({ queryKey: ["catalog-variants"], queryFn: listActiveVariants, enabled: !isDemo })
  const stock = useQuery({ queryKey: ["inventory-stock", selectedBranch], queryFn: () => listStockLevels(selectedBranch), enabled: Boolean(selectedBranch) && !isDemo })
  const summary = useQuery({ queryKey: ["inventory-summary", selectedBranch], queryFn: () => getStockSummary(selectedBranch), enabled: Boolean(selectedBranch) && !isDemo })
  const receipts = useQuery({ queryKey: ["stock-receipts", selectedWarehouse], queryFn: () => listStockReceipts(selectedWarehouse), enabled: Boolean(selectedWarehouse) && !isDemo })
  const issues = useQuery({ queryKey: ["stock-issues", selectedWarehouse], queryFn: () => listStockIssues(selectedWarehouse), enabled: Boolean(selectedWarehouse) && !isDemo })
  const transfers = useQuery({ queryKey: ["stock-transfers", selectedWarehouse], queryFn: () => listStockTransfers(selectedWarehouse), enabled: Boolean(selectedWarehouse) && !isDemo })
  const stocktakes = useQuery({ queryKey: ["stocktakes", selectedWarehouse], queryFn: () => listStocktakes(selectedWarehouse), enabled: Boolean(selectedWarehouse) && !isDemo })
  const balances = useQuery({ queryKey: ["warehouse-stocks", selectedWarehouse], queryFn: () => listWarehouseStocks(selectedWarehouse), enabled: tab === "balances" && Boolean(selectedWarehouse) && !isDemo })
  const movements = useQuery({ queryKey: ["stock-movements", selectedWarehouse], queryFn: () => listStockMovements(selectedWarehouse), enabled: tab === "movements" && Boolean(selectedWarehouse) && !isDemo })
  const ledger = useQuery({ queryKey: ["stock-ledger", selectedBranch], queryFn: () => listLedgerEntries({ branchId: selectedBranch }), enabled: tab === "ledger" && Boolean(selectedBranch) && !isDemo })
  const thresholds = useQuery({ queryKey: ["stock-thresholds", selectedWarehouse], queryFn: () => listStockThresholds(selectedWarehouse), enabled: tab === "thresholds" && Boolean(selectedWarehouse) && !isDemo })
  const skuStock = useQuery({ queryKey: ["stock-by-sku", selectedSku], queryFn: () => getStockBySku(selectedSku), enabled: Boolean(selectedSku) && !isDemo })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] }), queryClient.invalidateQueries({ queryKey: ["inventory-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-warehouses"] }), queryClient.invalidateQueries({ queryKey: ["stock-receipts"] }),
      queryClient.invalidateQueries({ queryKey: ["stock-issues"] }), queryClient.invalidateQueries({ queryKey: ["stock-transfers"] }),
      queryClient.invalidateQueries({ queryKey: ["stocktakes"] }), queryClient.invalidateQueries({ queryKey: ["warehouse-stocks"] }),
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] }), queryClient.invalidateQueries({ queryKey: ["stock-ledger"] }), queryClient.invalidateQueries({ queryKey: ["stock-thresholds"] })
    ])
  }

  const createMutation = useMutation({
    mutationFn: async (value: InventorySubmitValue) => {
      if (formMode === "receipt") return createStockReceipt({ warehouseId: value.warehouseId!, note: value.note, items: [{ skuId: value.skuId!, qty: value.qty!, unitCost: value.unitCost }] })
      if (formMode === "issue") return createStockIssue({ warehouseId: value.warehouseId!, reasonCode: value.reasonCode!, note: value.note, items: [{ skuId: value.skuId!, qty: value.qty! }] })
      if (formMode === "transfer") return createStockTransfer({ fromWarehouseId: value.fromWarehouseId!, toWarehouseId: value.toWarehouseId!, note: value.note, items: [{ skuId: value.skuId!, qty: value.qty! }] })
      if (formMode === "stocktake") return createStocktake({ warehouseId: value.warehouseId!, note: value.note, ...(value.skuId ? { skuIds: [value.skuId] } : {}) })
      return createWarehouse({ code: value.code!, name: value.name!, kind: value.kind!, branchId: value.branchId, isDefault: value.isDefault, address: value.address })
    },
    onSuccess: async () => { setFormMode(null); setActionError(""); await refresh() },
    onError: (error) => setActionError(apiError(error))
  })

  const countMutation = useMutation({
    mutationFn: (counts: Array<{ skuId: string; countedQty: string; reason?: string }>) => recordStocktakeCounts(counting!.id, counts),
    onSuccess: async () => { setCounting(null); setActionError(""); await refresh() },
    onError: (error) => setActionError(apiError(error))
  })

  const thresholdMutation = useMutation({ mutationFn: upsertStockThreshold, onSuccess: async () => { setThresholdForm(null); setActionError(""); await refresh() }, onError: (error) => setActionError(apiError(error)) })
  const branchThresholdMutation = useMutation({ mutationFn: upsertBranchStockThreshold, onSuccess: async () => { setBranchThresholdOpen(false); setActionError(""); await refresh() }, onError: (error) => setActionError(apiError(error)) })
  const warehouseMutation = useMutation({ mutationFn: (value: Partial<Pick<Warehouse, "name" | "kind" | "branchId" | "isDefault" | "address" | "status">>) => updateWarehouse(editingWarehouse!.id, value), onSuccess: async () => { setEditingWarehouse(null); setActionError(""); await refresh() }, onError: (error) => setActionError(apiError(error)) })
  const lookupMutation = useMutation({ mutationFn: (code: string) => lookupStock(selectedBranch, code), onSuccess: (data) => { setLookupResult(data); setActionError("") }, onError: (error) => { setLookupResult(undefined); setActionError(apiError(error)) } })
  const receiveMutation = useMutation({ mutationFn: (value: Parameters<typeof receiveStockTransfer>[1]) => receiveStockTransfer(receiving!.id, value), onSuccess: async () => { setReceiving(null); setActionError(""); await refresh() }, onError: (error) => setActionError(apiError(error)) })
  const reconcileMutation = useMutation({ mutationFn: reconcileStocks, onSuccess: setReconciliation, onError: (error) => setActionError(apiError(error)) })

  const runAction = async (action: string, item: StockReceipt | StockIssue | StockTransfer | Stocktake) => {
    if (action === "count") { setCounting(item as Stocktake); setActionError(""); return }
    setPendingId(item.id); setActionError("")
    try {
      if (action === "view") {
        const detail = tab === "receipts" ? await getStockReceipt(item.id) : tab === "issues" ? await getStockIssue(item.id) : tab === "transfers" ? await getStockTransfer(item.id) : await getStocktake(item.id)
        setSelectedDocument(detail)
        return
      }
      if (tab === "receipts") {
        if (action === "post") await postStockReceipt(item.id)
        else if (action === "submit") await submitStockReceipt(item.id)
        else if (action === "approve") await approveStockReceipt(item.id)
        else if (action === "reject") await rejectStockReceipt(item.id, window.prompt("Lý do trả lại phiếu nhập:") ?? undefined)
        else await cancelStockReceipt(item.id)
      }
      if (tab === "issues") await (action === "post" ? postStockIssue(item.id) : cancelStockIssue(item.id))
      if (tab === "transfers") {
        if (action === "receive") { setReceiving(item as StockTransfer); return }
        await (action === "dispatch" ? dispatchStockTransfer(item.id) : cancelStockTransfer(item.id))
      }
      if (tab === "stocktakes") await (action === "approve" ? approveStocktake(item.id) : cancelStocktake(item.id))
      await refresh()
    } catch (error) { setActionError(apiError(error)) } finally { setPendingId("") }
  }

  const metrics = summary.data ?? { onHand: 0, reserved: 0, available: 0, belowMinCount: 0, outOfStockCount: 0, skuCount: 0, stockValue: 0, branchId: null }
  const loadingError = [branches, warehouses, variants, stock, summary].some((query) => query.isError)
  const docs = tab === "receipts" ? receipts.data ?? [] : tab === "issues" ? issues.data ?? [] : tab === "transfers" ? transfers.data ?? [] : stocktakes.data ?? []

  const editWarehouse = async (warehouse: Warehouse) => {
    setActionError("")
    try { setEditingWarehouse(await getWarehouse(warehouse.id)) } catch (error) { setActionError(apiError(error)) }
  }

  const downloadStock = async () => {
    setActionError("")
    try { downloadBlob(await exportStock(selectedBranch || undefined), `ton-kho-${new Date().toISOString().slice(0, 10)}.csv`) } catch (error) { setActionError(apiError(error)) }
  }

  return <main className="mx-auto max-w-[1520px] py-7">
    <DashboardHeader section="inventory" />
    {isDemo && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Tài khoản demo không gọi API. Đăng nhập tài khoản backend để sử dụng nhập, xuất, chuyển và kiểm kho.</p>}

    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-4">
        <label className="text-xs font-semibold text-slate-500">Chi nhánh<select value={selectedBranch} onChange={(event) => setBranchId(event.target.value)} className="mt-1 block min-w-52 bg-transparent text-sm font-medium text-[#163d36] outline-none"><option value="">Chọn chi nhánh</option>{(branches.data?.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-500">Kho thao tác<select value={selectedWarehouse} onChange={(event) => setWarehouseId(event.target.value)} className="mt-1 block min-w-52 bg-transparent text-sm font-medium text-[#163d36] outline-none"><option value="">Chọn kho</option>{(warehouses.data ?? []).filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
      </div>
      <div className="flex gap-2">{tab === "stock" && <Button variant="outline" onClick={downloadStock} disabled={isDemo || !selectedBranch} className="gap-2"><Download size={16} />Xuất tồn kho</Button>}{tab !== "stock" && createLabels[tab] && <Button onClick={() => { setFormMode(modeForTab[tab]!); setActionError(""); createMutation.reset() }} disabled={isDemo} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"><Plus size={16} />{createLabels[tab]}</Button>}</div>
    </div>

    <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Tồn thực tế" value={metrics.onHand} icon={Boxes} /><Metric label="Đang giữ cho đơn" value={metrics.reserved} icon={PackageCheck} /><Metric label="Tồn khả dụng" value={metrics.available} icon={ArrowDownToLine} /><Metric label="Sản phẩm cần chú ý" value={metrics.belowMinCount + metrics.outOfStockCount} icon={AlertTriangle} warning /></div>

    {loadingError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải đầy đủ dữ liệu từ KrakenD.</p>}
    {actionError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</p>}

    {tab === "stock" && <><StockLookupBar branchId={selectedBranch} pending={lookupMutation.isPending} result={lookupResult} error={lookupMutation.isError ? actionError : ""} onLookup={(code) => lookupMutation.mutate(code)} /><StockTable rows={stock.data?.data ?? []} /></>}
    {tab === "balances" && <BalanceTable rows={balances.data?.data ?? []} variants={variants.data ?? []} onSelect={setSelectedSku} />}
    {tab === "ledger" && <LedgerTable rows={ledger.data?.data ?? []} variants={variants.data ?? []} branches={branches.data?.data ?? []} />}
    {tab === "movements" && <MovementTable rows={movements.data?.data ?? []} variants={variants.data ?? []} warehouses={warehouses.data ?? []} />}
    {tab === "thresholds" && <><div className="mb-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setBranchThresholdOpen(true)} disabled={isDemo} className="gap-2"><Plus size={16} />Theo chi nhánh</Button><Button onClick={() => setThresholdForm("new")} disabled={isDemo} className="gap-2 bg-[#16866f] text-white"><Plus size={16} />Theo kho</Button></div><ThresholdTable rows={thresholds.data ?? []} variants={variants.data ?? []} warehouses={warehouses.data ?? []} onEdit={setThresholdForm} /></>}
    {tab === "reconcile" && <ReconciliationPanel report={reconciliation} pending={reconcileMutation.isPending} onRun={() => reconcileMutation.mutate()} />}
    {tab === "warehouses" && <WarehouseTable rows={warehouses.data ?? []} onEdit={editWarehouse} />}
    {["receipts", "issues", "transfers", "stocktakes"].includes(tab) && <DocumentTable type={tab === "receipts" ? "receipt" : tab === "issues" ? "issue" : tab === "transfers" ? "transfer" : "stocktake"} rows={docs} warehouses={warehouses.data ?? []} variants={variants.data ?? []} pendingId={pendingId} onAction={runAction} />}

    {formMode && <InventoryForm mode={formMode} warehouses={warehouses.data ?? []} variants={variants.data ?? []} branches={branches.data?.data ?? []} isPending={createMutation.isPending} error={createMutation.isError ? actionError : ""} onClose={() => setFormMode(null)} onSubmit={async (value) => { await createMutation.mutateAsync(value) }} />}
    {counting && <StocktakeCountForm stocktake={counting} variants={variants.data ?? []} isPending={countMutation.isPending} error={countMutation.isError ? actionError : ""} onClose={() => setCounting(null)} onSubmit={async (counts) => { await countMutation.mutateAsync(counts) }} />}
    {receiving && <TransferReceiveForm transfer={receiving} variants={variants.data ?? []} pending={receiveMutation.isPending} error={receiveMutation.isError ? actionError : ""} onClose={() => setReceiving(null)} onSubmit={async (value) => { await receiveMutation.mutateAsync(value) }} />}
    {thresholdForm && <ThresholdForm warehouses={warehouses.data ?? []} variants={variants.data ?? []} initial={thresholdForm === "new" ? null : thresholdForm} pending={thresholdMutation.isPending} error={thresholdMutation.isError ? actionError : ""} onClose={() => setThresholdForm(null)} onSubmit={async (value) => { await thresholdMutation.mutateAsync(value) }} />}
    {branchThresholdOpen && <BranchThresholdModal branches={branches.data?.data ?? []} variants={variants.data ?? []} pending={branchThresholdMutation.isPending} error={branchThresholdMutation.isError ? actionError : ""} onClose={() => setBranchThresholdOpen(false)} onSubmit={(value) => branchThresholdMutation.mutate(value)} />}
    {editingWarehouse && <WarehouseEditModal warehouse={editingWarehouse} branches={branches.data?.data ?? []} pending={warehouseMutation.isPending} error={warehouseMutation.isError ? actionError : ""} onClose={() => setEditingWarehouse(null)} onSubmit={(value) => warehouseMutation.mutate(value)} />}
    {selectedDocument && <DocumentDetailModal document={selectedDocument} warehouses={warehouses.data ?? []} variants={variants.data ?? []} onClose={() => setSelectedDocument(null)} />}
    {selectedSku && <SkuStockModal data={skuStock.data} onClose={() => setSelectedSku("")} />}
  </main>
}

function Metric({ label, value, icon: Icon, warning = false }: { label: string; value: number; icon: typeof Boxes; warning?: boolean }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_15px_rgba(20,50,45,0.04)]"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${warning ? "bg-amber-50 text-amber-600" : "bg-[#e6f5ee] text-[#16866f]"}`}><Icon size={18} /></div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value.toLocaleString("vi-VN", { maximumFractionDigits: 3 })}</p></section>
}

function apiError(error: unknown) {
  if (!axios.isAxiosError(error)) return "Không thể thực hiện thao tác."
  const data = error.response?.data as { message?: string | string[]; errorCode?: string } | undefined
  const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message
  return message || data?.errorCode || "Không thể thực hiện thao tác. Hãy kiểm tra quyền tài khoản và trạng thái phiếu."
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
