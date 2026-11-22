import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import axios from "axios"
import { AlertTriangle, ArrowDownToLine, Boxes, Download, Plus, PackageCheck, Sparkles } from "lucide-react"
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
import { SegmentedTabs } from "@/components/ui/micro-ux"
import { InventoryForm, StocktakeCountForm, type InventoryFormMode, type InventorySubmitValue } from "./InventoryForms"
import { DocumentTable, StockTable, WarehouseTable, tabs, type InventoryTab } from "./InventoryTables"
import { BalanceTable, MovementTable, ReconciliationPanel, SkuStockModal, ThresholdForm, ThresholdTable, TransferReceiveForm } from "./InventoryAdvanced"
import { BranchThresholdModal, DocumentDetailModal, LedgerTable, StockLookupBar, WarehouseEditModal } from "./InventoryExtras"

const modeForTab: Partial<Record<InventoryTab, InventoryFormMode>> = { receipts: "receipt", issues: "issue", transfers: "transfer", stocktakes: "stocktake", warehouses: "warehouse" }
const createLabels: Partial<Record<InventoryTab, string>> = { receipts: "Tạo phiếu nhập", issues: "Tạo phiếu xuất", transfers: "Tạo phiếu chuyển", stocktakes: "Tạo phiếu kiểm", warehouses: "Thêm kho" }

const DEMO_BRANCH_LIST = [
  { id: "branch-q1", name: "Chi nhánh Quận 1 - Flagship", code: "CN-Q1" },
  { id: "branch-tanbinh", name: "Kho Tổng Tân Bình", code: "KHO-TB" }
]

const DEMO_WAREHOUSES: Warehouse[] = [
  {
    id: "wh-q1",
    branchId: "branch-q1",
    code: "KHO-Q1",
    name: "Kho Bán Lẻ Chi Nhánh Q1",
    kind: "BRANCH",
    address: "77 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    isDefault: true,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "wh-tanbinh",
    branchId: "branch-tanbinh",
    code: "KHO-TB",
    name: "Kho Tổng Phân Phối Tân Bình",
    kind: "CENTRAL",
    address: "12 Hoàng Hoa Thám, Tân Bình, TP. Hồ Chí Minh",
    isDefault: false,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  }
]

const DEMO_STOCK_LEVELS: import("@/api/inventory/stock").StockLevel[] = [
  {
    branchId: "branch-q1",
    variantId: "var-01",
    name: "Áo Thun Cotton Compact 250gsm",
    variantLabel: "Đen / L",
    sku: "TSHIRT-BLK-L",
    barcode: "8935001234567",
    onHand: 120,
    reserved: 15,
    available: 105,
    minQuantity: 20,
    maxQuantity: null,
    level: "ok"
  },
  {
    branchId: "branch-q1",
    variantId: "var-02",
    name: "Quần Jean Slimfit Co Giãn Cao Cấp",
    variantLabel: "Xanh Đậm / 31",
    sku: "JEAN-SLIM-31",
    barcode: "8935001234581",
    onHand: 85,
    reserved: 8,
    available: 77,
    minQuantity: 15,
    maxQuantity: null,
    level: "ok"
  },
  {
    branchId: "branch-tanbinh",
    variantId: "var-03",
    name: "Bàn Phím Cơ Không Dây Tri-mode RGB",
    variantLabel: "White / Red Switch",
    sku: "KB-TRIMODE-RED",
    barcode: "8935001234604",
    onHand: 42,
    reserved: 5,
    available: 37,
    minQuantity: 10,
    maxQuantity: null,
    level: "ok"
  },
  {
    branchId: "branch-tanbinh",
    variantId: "var-04",
    name: "Tai Nghe Chống Ồn Wireless ANC",
    variantLabel: "Bạc Titanium",
    sku: "HEADPHONE-ANC-SILVER",
    barcode: "8935001234628",
    onHand: 6,
    reserved: 4,
    available: 2,
    minQuantity: 10,
    maxQuantity: null,
    level: "below_min"
  },
  {
    branchId: "branch-q1",
    variantId: "var-05",
    name: "Cốc Giữ Nhiệt Inox 316 750ml",
    variantLabel: "Xanh Rêu",
    sku: "MUG-316-GRN",
    barcode: "8935001234642",
    onHand: 0,
    reserved: 0,
    available: 0,
    minQuantity: 15,
    maxQuantity: null,
    level: "out_of_stock"
  }
]

const DEMO_STOCK_SUMMARY = {
  onHand: 253,
  reserved: 32,
  available: 221,
  belowMinCount: 1,
  outOfStockCount: 1,
  skuCount: 5,
  stockValue: 285400000,
  branchId: "branch-q1"
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const requestedTab = useRouterState({ select: (state) => new URLSearchParams(state.location.searchStr).get("tab") })
  const initialTab = tabs.some((item) => item.id === requestedTab) ? requestedTab as InventoryTab : "stock"
  const [tab, setTab] = useState<InventoryTab>(initialTab)
  const [branchId, setBranchId] = useState(isDemo ? "branch-q1" : "")
  const [warehouseId, setWarehouseId] = useState(isDemo ? "wh-q1" : "")
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
  const branchList: Array<{ id: string; name: string; code: string }> = isDemo ? DEMO_BRANCH_LIST : (branches.data?.data ?? [])
  const selectedBranch = branchId || branchList[0]?.id || ""
  
  const warehouses = useQuery({ queryKey: ["inventory-warehouses"], queryFn: () => listWarehouses(), enabled: !isDemo })
  const warehouseList = isDemo ? DEMO_WAREHOUSES : warehouses.data ?? []
  const selectedWarehouse = warehouseId || warehouseList.find((item) => item.isDefault)?.id || warehouseList[0]?.id || ""
  
  const variants = useQuery({ queryKey: ["catalog-variants"], queryFn: listActiveVariants, enabled: !isDemo })
  const stock = useQuery({ queryKey: ["inventory-stock", selectedBranch], queryFn: () => listStockLevels(selectedBranch || undefined), enabled: !isDemo })
  const summary = useQuery({ queryKey: ["inventory-summary", selectedBranch], queryFn: () => getStockSummary(selectedBranch || undefined), enabled: !isDemo })
  const receipts = useQuery({ queryKey: ["stock-receipts", selectedWarehouse], queryFn: () => listStockReceipts(selectedWarehouse || undefined), enabled: tab === "receipts" && !isDemo })
  const issues = useQuery({ queryKey: ["stock-issues", selectedWarehouse], queryFn: () => listStockIssues(selectedWarehouse || undefined), enabled: tab === "issues" && !isDemo })
  const transfers = useQuery({ queryKey: ["stock-transfers", selectedWarehouse], queryFn: () => listStockTransfers(selectedWarehouse || undefined), enabled: tab === "transfers" && !isDemo })
  const stocktakes = useQuery({ queryKey: ["stocktakes", selectedWarehouse], queryFn: () => listStocktakes(selectedWarehouse || undefined), enabled: tab === "stocktakes" && !isDemo })
  const balances = useQuery({ queryKey: ["warehouse-stocks", selectedWarehouse], queryFn: () => listWarehouseStocks(selectedWarehouse || undefined), enabled: tab === "balances" && !isDemo })
  const movements = useQuery({ queryKey: ["stock-movements", selectedWarehouse], queryFn: () => listStockMovements(selectedWarehouse || undefined), enabled: tab === "movements" && !isDemo })
  const ledger = useQuery({ queryKey: ["stock-ledger", selectedBranch], queryFn: () => listLedgerEntries({ branchId: selectedBranch || undefined }), enabled: tab === "ledger" && !isDemo })
  const thresholds = useQuery({ queryKey: ["stock-thresholds", selectedWarehouse], queryFn: () => listStockThresholds(selectedWarehouse || undefined), enabled: tab === "thresholds" && !isDemo })
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
      const items = value.items && value.items.length > 0 ? value.items : [{ skuId: value.skuId!, qty: value.qty!, unitCost: value.unitCost }]
      if (formMode === "receipt") return createStockReceipt({ warehouseId: value.warehouseId!, note: value.note, autoPost: value.autoPost, items })
      if (formMode === "issue") return createStockIssue({ warehouseId: value.warehouseId!, reasonCode: value.reasonCode!, note: value.note, autoPost: value.autoPost, items: items.map(({ skuId, qty }) => ({ skuId, qty })) })
      if (formMode === "transfer") return createStockTransfer({ fromWarehouseId: value.fromWarehouseId!, toWarehouseId: value.toWarehouseId!, note: value.note, items: items.map(({ skuId, qty }) => ({ skuId, qty })) })
      if (formMode === "stocktake") return createStocktake({ warehouseId: value.warehouseId!, note: value.note, ...(value.skuIds?.length ? { skuIds: value.skuIds } : value.skuId ? { skuIds: [value.skuId] } : {}) })
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

  const metrics = isDemo ? DEMO_STOCK_SUMMARY : summary.data ?? { onHand: 0, reserved: 0, available: 0, belowMinCount: 0, outOfStockCount: 0, skuCount: 0, stockValue: 0, branchId: null }
  // while the summary is in flight there is no number yet: a placeholder, never a "0"
  const summaryLoading = !isDemo && summary.isLoading
  const loadingError = !isDemo && [branches, warehouses, variants, stock, summary].some((query) => query.isError)
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
    {isDemo && (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#16866f]/20 bg-[#e6f5ee]/40 px-4 py-3 text-xs text-[#163d36]">
        <span className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#16866f]" />
          <span>Đang hiển thị dữ liệu tồn kho đa điểm thực tế (Chi nhánh Q1 & Kho Tân Bình). Chuyển chi nhánh hoặc kho để xem hạn mức tồn & khả dụng.</span>
        </span>
        <span className="rounded-md bg-[#16866f]/10 px-2.5 py-1 font-semibold text-[#16866f]">Trải nghiệm Demo</span>
      </div>
    )}

    {/* In-page Horizontal Scrollable SegmentedTabs */}
    <div className="mb-5">
      <SegmentedTabs
        tabs={tabs.map((t) => ({ value: t.id, label: t.label }))}
        value={tab}
        onChange={(next) => setTab(next)}
        ariaLabel="Phân hệ quản lý kho"
      />
    </div>

    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-xs font-semibold text-slate-500">
          Chi nhánh
          <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 focus-within:border-[#16866f] focus-within:bg-white">
            <select
              value={selectedBranch}
              onChange={(event) => setBranchId(event.target.value)}
              className="min-w-48 bg-transparent text-xs font-semibold text-[#163d36] outline-none"
            >
              <option value="">{!isDemo && branches.isLoading ? "Đang tải chi nhánh..." : "Chọn chi nhánh"}</option>
              {branchList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Kho thao tác
          <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 focus-within:border-[#16866f] focus-within:bg-white">
            <select
              value={selectedWarehouse}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="min-w-48 bg-transparent text-xs font-semibold text-[#163d36] outline-none"
            >
              <option value="">{!isDemo && warehouses.isLoading ? "Đang tải kho..." : "Chọn kho"}</option>
              {warehouseList
                .filter((item) => item.status === "ACTIVE")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
            </select>
          </div>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {tab === "stock" && (
          <Button
            variant="outline"
            onClick={downloadStock}
            disabled={isDemo || !selectedBranch}
            className="gap-2 rounded-xl border-slate-200/90 text-xs shadow-2xs hover:bg-slate-50"
          >
            <Download size={15} /> Xuất tồn kho
          </Button>
        )}
        {tab !== "stock" && createLabels[tab] && (
          <button
            type="button"
            onClick={() => {
              setFormMode(modeForTab[tab]!)
              setActionError("")
              createMutation.reset()
            }}
            disabled={isDemo}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(22,134,111,0.25)] hover:shadow-[0_4px_16px_rgba(22,134,111,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Plus size={15} strokeWidth={2.5} />
            {createLabels[tab]}
          </button>
        )}
      </div>
    </div>

    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Tồn thực tế" value={metrics.onHand} icon={Boxes} loading={summaryLoading} />
      <Metric label="Đang giữ cho đơn" value={metrics.reserved} icon={PackageCheck} loading={summaryLoading} />
      <Metric label="Tồn khả dụng" value={metrics.available} icon={ArrowDownToLine} loading={summaryLoading} />
      <Metric label="Sản phẩm cần chú ý" value={metrics.belowMinCount + metrics.outOfStockCount} icon={AlertTriangle} warning loading={summaryLoading} />
    </div>

    {loadingError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải đầy đủ dữ liệu từ KrakenD.</p>}
    {actionError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</p>}

    {tab === "stock" && <><StockLookupBar branchId={selectedBranch} pending={lookupMutation.isPending} result={lookupResult} error={lookupMutation.isError ? actionError : ""} onLookup={(code) => lookupMutation.mutate(code)} /><StockTable rows={isDemo ? DEMO_STOCK_LEVELS : stock.data?.data ?? []} loading={stock.isLoading} /></>}
    {tab === "balances" && <BalanceTable rows={balances.data?.data ?? []} variants={variants.data ?? []} onSelect={setSelectedSku} />}
    {tab === "ledger" && <LedgerTable rows={ledger.data?.data ?? []} variants={variants.data ?? []} branches={branches.data?.data ?? []} />}
    {tab === "movements" && <MovementTable rows={movements.data?.data ?? []} variants={variants.data ?? []} warehouses={warehouseList} />}
    {tab === "thresholds" && <><div className="mb-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setBranchThresholdOpen(true)} disabled={isDemo} className="gap-2"><Plus size={16} />Theo chi nhánh</Button><Button onClick={() => setThresholdForm("new")} disabled={isDemo} className="gap-2 bg-[#16866f] text-white"><Plus size={16} />Theo kho</Button></div><ThresholdTable rows={thresholds.data ?? []} variants={variants.data ?? []} warehouses={warehouseList} onEdit={setThresholdForm} /></>}
    {tab === "reconcile" && <ReconciliationPanel report={reconciliation} pending={reconcileMutation.isPending} onRun={() => reconcileMutation.mutate()} />}
    {tab === "warehouses" && <WarehouseTable rows={isDemo ? DEMO_WAREHOUSES : warehouses.data ?? []} loading={warehouses.isLoading} onEdit={editWarehouse} />}
    {["receipts", "issues", "transfers", "stocktakes"].includes(tab) && <DocumentTable type={tab === "receipts" ? "receipt" : tab === "issues" ? "issue" : tab === "transfers" ? "transfer" : "stocktake"} rows={docs} warehouses={warehouses.data ?? []} variants={variants.data ?? []} pendingId={pendingId} loading={[receipts, issues, transfers, stocktakes].some((q) => q.isLoading)} onAction={runAction} />}

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

function Metric({
  label,
  value,
  icon: Icon,
  warning = false,
  loading = false
}: {
  label: string
  value: number
  icon: typeof Boxes
  warning?: boolean
  loading?: boolean
}) {
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04),0_12px_28px_-8px_rgba(20,50,45,0.05)] backdrop-blur-sm transition-all duration-300 hover:border-[#16866f]/30 hover:shadow-[0_8px_30px_-4px_rgba(20,50,45,0.08)]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
            warning
              ? "border border-amber-200/50 bg-amber-50 text-amber-600"
              : "border border-[#16866f]/20 bg-[#e6f5ee] text-[#16866f]"
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
      {loading ? (
        <div role="status" aria-label="Đang tải" className="mt-3.5">
          <Skeleton className="h-8 w-28" />
        </div>
      ) : (
        <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#163d36] sm:text-3xl">
          {value.toLocaleString("vi-VN", { maximumFractionDigits: 3 })}
        </p>
      )}
    </section>
  )
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
