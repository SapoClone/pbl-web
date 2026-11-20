import { useEffect, useRef, useState } from "react"
import axios from "axios"
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Facebook,
  Globe2,
  KeyRound,
  Link2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Share2,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  WifiOff
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { listActiveVariants } from "@/api/catalog/variants"
import { listWarehouses } from "@/api/inventory/warehouses"
import { listBranches } from "@/api/platform/branches"
import {
  authorizeChannelConnection,
  autoMatchSkuMappings,
  completeLazadaPublicCallback,
  createChannelConnection,
  createSkuMapping,
  deleteSkuMapping,
  disconnectChannelConnection,
  executeReconciliationRun,
  getChannelConnectionHealth,
  getIntegrationHealth,
  getReconciliationRun,
  listChannelConnections,
  listReconciliationRuns,
  listSkuMappings,
  listSyncConflicts,
  listSyncJobs,
  pauseChannelConnection,
  refreshChannelConnectionToken,
  resolveSyncConflict,
  resumeChannelConnection,
  retrySyncConflict,
  retrySyncJob,
  triggerInventorySync,
  triggerOrderSync,
  triggerProductSync,
  updateChannelConnection,
  updateSkuMapping,
  type AutoMatchPreviewResponse,
  type AutoMatchSelectedPair,
  type ChannelConnection,
  type ChannelConnectionHealth,
  type ConnectionStatus,
  type CreateChannelConnectionInput,
  type CreateSkuMappingInput,
  type MarketplaceProvider,
  type OAuthInitiatedResponse,
  type ReconciliationRunDetail,
  type ResolveSyncConflictInput,
  type TriggerConnectionSyncInput,
  type TriggerReconciliationRunInput,
  type UpdateChannelConnectionInput,
  type UpdateSkuMappingInput
} from "@/api/integration"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import {
  BulkAutoMatchSkuModal,
  buildDemoAutoMatchPreview,
  ConnectionSyncConfigModal
} from "./ChannelAdvancedModals"
import {
  ConnectionHealthModal,
  LazadaConnectionModal,
  LazadaOAuthModal,
  LazadaOrderSyncModal
} from "./LazadaIntegrationModals"
import {
  ConflictsPanel,
  ReconciliationPanel,
  SkuMappingsPanel,
  SyncJobsPanel
} from "./LazadaPanels"
import {
  buildDemoHealth,
  buildDemoReconciliationDetail,
  DEMO_BRANCHES,
  DEMO_CONFLICTS,
  DEMO_CONNECTIONS,
  DEMO_RECONCILIATION_RUNS,
  DEMO_SKU_MAPPINGS,
  DEMO_SYNC_JOBS,
  DEMO_VARIANTS,
  DEMO_WAREHOUSES
} from "./lazada.demo"

export type ChannelsTab =
  | "overview"
  | "sku-mappings"
  | "sync-jobs"
  | "conflicts"
  | "reconciliation"

export const CHANNEL_TABS: Array<{ id: ChannelsTab; label: string }> = [
  { id: "overview", label: "Tổng quan & Gian hàng Lazada" },
  { id: "sku-mappings", label: "Ánh xạ SKU Lazada" },
  { id: "sync-jobs", label: "Lịch sử đồng bộ" },
  { id: "conflicts", label: "Xung đột đồng bộ" },
  { id: "reconciliation", label: "Đối soát đa kênh" }
]

const STATUS_BADGE: Record<
  ConnectionStatus,
  { label: string; className: string }
> = {
  CONNECTED: {
    label: "Đang kết nối",
    className: "bg-emerald-50 text-emerald-700"
  },
  PENDING_AUTH: {
    label: "Chờ cấp quyền trên sàn",
    className: "bg-amber-50 text-amber-700"
  },
  DEGRADED: {
    label: "Kết nối chập chờn",
    className: "bg-amber-50 text-amber-700"
  },
  TOKEN_EXPIRED: {
    label: "Hết hạn phiên kết nối",
    className: "bg-red-50 text-red-600"
  },
  REAUTH_REQUIRED: {
    label: "Cần ủy quyền lại",
    className: "bg-red-50 text-red-600"
  },
  PAUSED: {
    label: "Đang tạm dừng",
    className: "bg-slate-100 text-slate-600"
  },
  DISCONNECTED: {
    label: "Đã ngắt kết nối",
    className: "bg-slate-100 text-slate-500"
  }
}

function readSearchTab(): ChannelsTab {
  if (typeof window === "undefined") return "overview"
  const raw = new URLSearchParams(window.location.search).get("tab")
  return CHANNEL_TABS.some((t) => t.id === raw)
    ? (raw as ChannelsTab)
    : "overview"
}

export function ChannelsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [tab, setTab] = useState<ChannelsTab>(readSearchTab)
  const [selectedConnectionId, setSelectedConnectionId] = useState("")
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Modals state
  const [connectModalProvider, setConnectModalProvider] =
    useState<MarketplaceProvider | null>(null)
  const [oauthModalConn, setOauthModalConn] =
    useState<ChannelConnection | null>(null)
  const [oauthSession, setOauthSession] =
    useState<OAuthInitiatedResponse | null>(null)
  const [healthModalConn, setHealthModalConn] =
    useState<ChannelConnection | null>(null)
  const [healthData, setHealthData] = useState<ChannelConnectionHealth | null>(
    null
  )
  const [healthLoading, setHealthLoading] = useState(false)
  const [orderSyncConn, setOrderSyncConn] = useState<ChannelConnection | null>(
    null
  )
  const [selectedRunDetail, setSelectedRunDetail] =
    useState<ReconciliationRunDetail | null>(null)
  const [syncConfigConn, setSyncConfigConn] =
    useState<ChannelConnection | null>(null)
  const [autoMatchConnId, setAutoMatchConnId] = useState<string | null>(null)
  const [autoMatchScanning, setAutoMatchScanning] = useState(false)
  const [autoMatchCommitting, setAutoMatchCommitting] = useState(false)
  const [autoMatchPreview, setAutoMatchPreview] =
    useState<AutoMatchPreviewResponse | null>(null)

  // Interactive Demo state
  const [demoConnections, setDemoConnections] =
    useState<ChannelConnection[]>(DEMO_CONNECTIONS)
  const [demoMappings, setDemoMappings] = useState(DEMO_SKU_MAPPINGS)
  const [demoJobs, setDemoJobs] = useState(DEMO_SYNC_JOBS)
  const [demoConflicts, setDemoConflicts] = useState(DEMO_CONFLICTS)
  const [demoRuns, setDemoRuns] = useState(DEMO_RECONCILIATION_RUNS)

  const callbackHandledRef = useRef(false)

  // Sync tab with URL query string changes
  useEffect(() => {
    const syncFromUrl = () => {
      const next = readSearchTab()
      setTab(next)
    }
    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [])

  // Queries for Live Backend Mode
  const healthQuery = useQuery({
    queryKey: ["integration-health"],
    queryFn: getIntegrationHealth,
    enabled: !isDemo,
    retry: false
  })
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: !isDemo
  })
  const warehousesQuery = useQuery({
    queryKey: ["inventory-warehouses"],
    queryFn: () => listWarehouses(),
    enabled: !isDemo
  })
  const variantsQuery = useQuery({
    queryKey: ["catalog-variants"],
    queryFn: listActiveVariants,
    enabled: !isDemo
  })
  const connectionsQuery = useQuery({
    queryKey: ["integration-connections"],
    queryFn: listChannelConnections,
    enabled: !isDemo
  })
  const mappingsQuery = useQuery({
    queryKey: ["integration-sku-mappings", selectedConnectionId],
    queryFn: () =>
      listSkuMappings(
        selectedConnectionId
          ? { connectionId: selectedConnectionId }
          : undefined
      ),
    enabled: !isDemo
  })
  const jobsQuery = useQuery({
    queryKey: ["integration-sync-jobs", selectedConnectionId],
    queryFn: () =>
      listSyncJobs(
        selectedConnectionId
          ? { connectionId: selectedConnectionId }
          : undefined
      ),
    enabled: !isDemo
  })
  const conflictsQuery = useQuery({
    queryKey: ["integration-conflicts", selectedConnectionId],
    queryFn: () =>
      listSyncConflicts(
        selectedConnectionId
          ? { connectionId: selectedConnectionId }
          : undefined
      ),
    enabled: !isDemo
  })
  const runsQuery = useQuery({
    queryKey: ["integration-reconciliation-runs"],
    queryFn: listReconciliationRuns,
    enabled: !isDemo
  })

  const branches = isDemo ? DEMO_BRANCHES : (branchesQuery.data?.data ?? [])
  const warehouses = isDemo ? DEMO_WAREHOUSES : (warehousesQuery.data ?? [])
  const variants = isDemo ? DEMO_VARIANTS : (variantsQuery.data ?? [])
  const connections = isDemo ? demoConnections : (connectionsQuery.data ?? [])
  const mappings = isDemo ? demoMappings : (mappingsQuery.data ?? [])
  const jobs = isDemo ? demoJobs : (jobsQuery.data ?? [])
  const conflicts = isDemo ? demoConflicts : (conflictsQuery.data ?? [])
  const runs = isDemo ? demoRuns : (runsQuery.data ?? [])

  const integrationOnline = isDemo || healthQuery.data?.status === "ok"

  const refreshAll = async () => {
    if (isDemo) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["integration-connections"] }),
      queryClient.invalidateQueries({ queryKey: ["integration-sku-mappings"] }),
      queryClient.invalidateQueries({ queryKey: ["integration-sync-jobs"] }),
      queryClient.invalidateQueries({ queryKey: ["integration-conflicts"] }),
      queryClient.invalidateQueries({
        queryKey: ["integration-reconciliation-runs"]
      })
    ])
  }

  // Handle Lazada OAuth Callback redirect query parameters (`?status=connected&provider=lazada...` or `?code=...&state=...`)
  useEffect(() => {
    if (callbackHandledRef.current || typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const provider = params.get("provider")?.toLowerCase()
    const status = params.get("status")?.toLowerCase()
    const connectionId = params.get("connectionId")
    const externalShopId = params.get("externalShopId")
    const code = params.get("code")
    const state = params.get("state")
    const oauthError = params.get("error")

    if (provider === "lazada" && status === "connected") {
      callbackHandledRef.current = true
      setMessage(
        `Đã ủy quyền OAuth 2.0 thành công cho gian hàng Lazada${
          externalShopId ? ` (Seller ID: ${externalShopId})` : ""
        }!`
      )
      if (connectionId) setSelectedConnectionId(connectionId)
      void refreshAll()
      window.history.replaceState({}, "", window.location.pathname)
      return
    }

    if (code && state && !isDemo) {
      callbackHandledRef.current = true
      completeLazadaPublicCallback({
        code,
        state,
        ...(oauthError ? { error: oauthError } : {})
      })
        .then(async (res) => {
          setMessage(
            `Đã hoàn tất kết nối OAuth Lazada cho gian hàng ${res.shopName} (${res.externalShopId}).`
          )
          setSelectedConnectionId(res.connectionId)
          await refreshAll()
        })
        .catch((err) => {
          setErrorMessage(extractApiError(err))
        })
        .finally(() => {
          window.history.replaceState({}, "", window.location.pathname)
        })
    }
  }, [isDemo])

  const actionMutation = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onError: (err) => setErrorMessage(extractApiError(err))
  })

  // ============================================================================
  // HANDLERS (WORKS IN BOTH LIVE BACKEND & DEMO MODE)
  // ============================================================================

  const handleCreateConnection = async (
    input: CreateChannelConnectionInput,
    initiateOAuthAfterCreate: boolean
  ) => {
    setErrorMessage("")
    setMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        const newConn: ChannelConnection = {
          id: `demo-conn-${Date.now()}`,
          tenantId: "00000000-0000-4000-8000-000000000001",
          code: `CON-00000${demoConnections.length + 1}`,
          provider: input.provider,
          connectionKey: `ck_${input.provider.toLowerCase()}_${Math.random().toString(16).slice(2, 14)}`,
          externalShopId:
            input.externalShopId || `pending_lazada_${Date.now()}`,
          shopName: input.shopName || `Gian hàng ${input.provider} mới`,
          branchId: input.branchId,
          warehouseId: input.warehouseId ?? null,
          status: input.accessToken ? "CONNECTED" : "PENDING_AUTH",
          safetyStockBuffer: input.safetyStockBuffer ?? 2,
          stockAllocationPercent: input.stockAllocationPercent ?? 100,
          lastSyncAt: input.accessToken ? now : null,
          lastOrderSyncAt: null,
          lastInventorySyncAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          consecutiveFailures: 0,
          credentialSummary: {
            credentialVersion: 1,
            hasAccessToken: Boolean(input.accessToken),
            hasRefreshToken: Boolean(input.refreshToken),
            accessTokenExpiresAt: input.accessToken
              ? new Date(Date.now() + 7 * 86400 * 1000).toISOString()
              : null,
            refreshTokenExpiresAt: input.refreshToken
              ? new Date(Date.now() + 30 * 86400 * 1000).toISOString()
              : null,
            lastRefreshedAt: input.accessToken ? now : null
          },
          createdAt: now,
          updatedAt: now
        }
        setDemoConnections((prev) => [newConn, ...prev])
        setConnectModalProvider(null)
        if (initiateOAuthAfterCreate) {
          setOauthModalConn(newConn)
          setOauthSession({
            mode: "OAUTH_INITIATED",
            connectionId: newConn.id,
            provider: newConn.provider,
            authorizationUrl: `https://auth.lazada.com/oauth/authorize?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent("https://api.sapo.makeasy.id.vn/api/v1/integrations/lazada/callback")}&client_id=lazada-app-key&state=eyJ2IjoidjEiLCJjb25uZWN0aW9uSWQiOiI${newConn.id}In0.demo_hmac_sha256`,
            stateNonce: `eyJ2IjoidjEiLCJjb25uZWN0aW9uSWQiOiI${newConn.id}In0.demo_hmac_sha256`,
            expiresInSeconds: 600
          })
          setMessage(
            `Đã khởi tạo kết nối ${newConn.code}. Hãy hoàn tất ủy quyền OAuth 2.0 Lazada.`
          )
        } else {
          setMessage(
            `Đã kết nối thành công gian hàng ${newConn.shopName} bằng Token trực tiếp.`
          )
        }
        return
      }

      const created = await createChannelConnection(input)
      setConnectModalProvider(null)
      await refreshAll()
      if (initiateOAuthAfterCreate) {
        const authRes = await authorizeChannelConnection(created.id, {})
        if (authRes.mode === "OAUTH_INITIATED") {
          setOauthModalConn(created)
          setOauthSession(authRes)
        }
        setMessage(
          `Đã khởi tạo kết nối ${created.code}. Vui lòng mở link Ủy quyền Lazada Seller Center.`
        )
      } else {
        setMessage(
          `Đã kết nối gian hàng ${created.shopName} (${created.externalShopId}).`
        )
      }
    })
  }

  const handleOpenOAuthModal = async (conn: ChannelConnection) => {
    setErrorMessage("")
    setOauthModalConn(conn)
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        setOauthSession({
          mode: "OAUTH_INITIATED",
          connectionId: conn.id,
          provider: conn.provider,
          authorizationUrl: `https://auth.lazada.com/oauth/authorize?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent("https://api.sapo.makeasy.id.vn/api/v1/integrations/lazada/callback")}&client_id=lazada-app-key&state=eyJ2IjoidjEiLCJjb25uZWN0aW9uSWQiOiI${conn.id}In0.demo_hmac_sha256`,
          stateNonce: `eyJ2IjoidjEiLCJjb25uZWN0aW9uSWQiOiI${conn.id}In0.demo_hmac_sha256`,
          expiresInSeconds: 600
        })
        return
      }
      const res = await authorizeChannelConnection(conn.id, {})
      if (res.mode === "OAUTH_INITIATED") {
        setOauthSession(res)
      }
    })
  }

  const handleExchangeOAuthCode = async (params: {
    authorizationCode: string
    stateNonce?: string
    externalShopId?: string
  }) => {
    if (!oauthModalConn) return
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        const resolvedShopId =
          params.externalShopId ||
          (oauthModalConn.externalShopId.startsWith("pending_")
            ? `VN${Math.floor(10000000 + Math.random() * 89999999)}`
            : oauthModalConn.externalShopId)
        setDemoConnections((prev) =>
          prev.map((c) =>
            c.id === oauthModalConn.id
              ? {
                  ...c,
                  externalShopId: resolvedShopId,
                  shopName:
                    c.shopName === "Pending Lazada Seller"
                      ? `Lazada Seller ${resolvedShopId}`
                      : c.shopName,
                  status: "CONNECTED",
                  lastSyncAt: now,
                  credentialSummary: {
                    ...c.credentialSummary,
                    credentialVersion:
                      c.credentialSummary.credentialVersion + 1,
                    hasAccessToken: true,
                    hasRefreshToken: true,
                    accessTokenExpiresAt: new Date(
                      Date.now() + 7 * 86400 * 1000
                    ).toISOString(),
                    lastRefreshedAt: now
                  }
                }
              : c
          )
        )
        setOauthModalConn(null)
        setOauthSession(null)
        setMessage(
          `Đã xác thực OAuth 2.0 Lazada thành công cho gian hàng ${resolvedShopId}!`
        )
        return
      }

      const res = await authorizeChannelConnection(oauthModalConn.id, params)
      setOauthModalConn(null)
      setOauthSession(null)
      await refreshAll()
      if (res.mode === "OAUTH_COMPLETED") {
        setMessage(
          `Đã kết nối thành công gian hàng ${res.connection.shopName} (${res.connection.externalShopId})!`
        )
      }
    })
  }

  const handleOpenHealth = async (conn: ChannelConnection) => {
    setHealthModalConn(conn)
    setHealthLoading(true)
    setErrorMessage("")
    try {
      if (isDemo) {
        setHealthData(buildDemoHealth(conn))
      } else {
        setHealthData(await getChannelConnectionHealth(conn.id))
      }
    } catch (err) {
      setErrorMessage(extractApiError(err))
    } finally {
      setHealthLoading(false)
    }
  }

  const handleRefreshToken = async (conn: ChannelConnection) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        setDemoConnections((prev) =>
          prev.map((c) =>
            c.id === conn.id
              ? {
                  ...c,
                  status: "CONNECTED",
                  credentialSummary: {
                    ...c.credentialSummary,
                    credentialVersion:
                      c.credentialSummary.credentialVersion + 1,
                    lastRefreshedAt: now
                  }
                }
              : c
          )
        )
        setMessage(
          `Đã làm mới Access Token cho ${conn.shopName} (CAS Lease thành công).`
        )
        return
      }
      const res = await refreshChannelConnectionToken(conn.id)
      await refreshAll()
      if (healthModalConn?.id === conn.id) {
        setHealthData(await getChannelConnectionHealth(conn.id))
      }
      setMessage(
        res.refreshed
          ? `Đã gia hạn Access Token mới (v${res.credentialSummary.credentialVersion}) cho ${res.shopName}.`
          : `Token của ${res.shopName} vừa được làm mới bởi tiến trình khác, không cần gọi lặp.`
      )
    })
  }

  const handlePauseOrResume = async (conn: ChannelConnection) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      const pausing = conn.status === "CONNECTED"
      if (isDemo) {
        setDemoConnections((prev) =>
          prev.map((c) =>
            c.id === conn.id
              ? { ...c, status: pausing ? "PAUSED" : "CONNECTED" }
              : c
          )
        )
        setMessage(
          pausing
            ? `Đã tạm dừng đồng bộ gian hàng ${conn.shopName}.`
            : `Đã kích hoạt lại đồng bộ cho ${conn.shopName}.`
        )
        return
      }
      if (pausing) await pauseChannelConnection(conn.id)
      else await resumeChannelConnection(conn.id)
      await refreshAll()
      setMessage(
        pausing
          ? `Đã tạm dừng đồng bộ gian hàng ${conn.shopName}.`
          : `Đã tiếp tục đồng bộ gian hàng ${conn.shopName}.`
      )
    })
  }

  const handleDisconnect = async (conn: ChannelConnection) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        setDemoConnections((prev) =>
          prev.map((c) =>
            c.id === conn.id ? { ...c, status: "DISCONNECTED" } : c
          )
        )
        setMessage(
          `Đã ngắt kết nối và xóa toàn bộ token hoạt động của ${conn.shopName}.`
        )
        return
      }
      await disconnectChannelConnection(conn.id)
      await refreshAll()
      setMessage(`Đã ngắt kết nối gian hàng ${conn.shopName}.`)
    })
  }

  const handleTriggerOrderSync = async (input: TriggerConnectionSyncInput) => {
    if (!orderSyncConn) return
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        const newJob = {
          id: `demo-job-${Date.now()}`,
          tenantId: orderSyncConn.tenantId,
          code: `JOB-0000${demoJobs.length + 19}`,
          connectionId: orderSyncConn.id,
          provider: orderSyncConn.provider,
          jobType: input.externalOrderId
            ? ("ORDER_IMPORT" as const)
            : ("ORDER_POLL" as const),
          idempotencyKey: `manual-ord-sync:${orderSyncConn.id}:${Date.now()}`,
          status: "COMPLETED" as const,
          priority: 10,
          payload: input as Record<string, unknown>,
          resultSummary: input.externalOrderId
            ? {
                externalOrderId: input.externalOrderId,
                statusOutcome: "IMPORTED",
                replayed: false
              }
            : { polledCount: 3, importedCount: 2, replayedCount: 1 },
          attemptCount: 1,
          maxAttempts: 4,
          nextRetryAt: now,
          leaseOwner: null,
          leaseExpiresAt: null,
          errorCategory: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          correlationId: `corr-${Date.now()}`,
          startedAt: now,
          completedAt: now,
          createdAt: now,
          updatedAt: now
        }
        setDemoJobs((prev) => [newJob, ...prev])
        setDemoConnections((prev) =>
          prev.map((c) =>
            c.id === orderSyncConn.id
              ? { ...c, lastSyncAt: now, lastOrderSyncAt: now }
              : c
          )
        )
        setOrderSyncConn(null)
        setMessage(
          `Đã đồng bộ đơn hàng Lazada (${newJob.code}) thành công cho ${orderSyncConn.shopName}.`
        )
        return
      }

      const res = await triggerOrderSync(orderSyncConn.id, input)
      setOrderSyncConn(null)
      await refreshAll()
      setMessage(
        `Đã thực thi tiến trình đồng bộ đơn hàng ${res.job.code} (Trạng thái: ${res.job.status}).`
      )
    })
  }

  const handleTriggerInventorySync = async (connectionId: string) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        setDemoConnections((prev) =>
          prev.map((c) =>
            c.id === connectionId
              ? { ...c, lastSyncAt: now, lastInventorySyncAt: now }
              : c
          )
        )
        setMessage(
          "Đã tính toán tồn khả dụng (trừ Safety Buffer) và đẩy tồn kho lên Lazada thành công."
        )
        return
      }
      const res = await triggerInventorySync(connectionId, {
        executeImmediately: true
      })
      await refreshAll()
      setMessage(
        `Đã đẩy tồn kho lên sàn qua tiến trình ${res.job.code} (${res.job.status}).`
      )
    })
  }

  const handleTriggerProductSync = async (connectionId: string) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        setMessage(
          "Đã quét danh sách sản phẩm từ Lazada (`GetProducts`) và tự động khớp SellerSKU trùng với Catalog."
        )
        return
      }
      const res = await triggerProductSync(connectionId, {
        executeImmediately: true
      })
      await refreshAll()
      setMessage(
        `Đã đồng bộ và khám phá sản phẩm từ sàn (${res.job.code}: ${res.job.status}).`
      )
    })
  }

  const handleSaveSyncConfig = async (
    connectionId: string,
    input: UpdateChannelConnectionInput
  ) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        setDemoConnections((prev) =>
          prev.map((c) =>
            c.id === connectionId
              ? {
                  ...c,
                  ...(input.shopName !== undefined
                    ? { shopName: input.shopName }
                    : {}),
                  ...(input.warehouseId !== undefined
                    ? { warehouseId: input.warehouseId }
                    : {}),
                  ...(input.safetyStockBuffer !== undefined
                    ? { safetyStockBuffer: input.safetyStockBuffer }
                    : {}),
                  ...(input.stockAllocationPercent !== undefined
                    ? { stockAllocationPercent: input.stockAllocationPercent }
                    : {}),
                  ...(input.autoSyncInventory !== undefined
                    ? { autoSyncInventory: input.autoSyncInventory }
                    : {}),
                  updatedAt: now
                }
              : c
          )
        )
        setSyncConfigConn(null)
        setMessage(
          `Đã lưu cấu hình đồng bộ tồn kho (Giữ ${input.safetyStockBuffer ?? 0} SP · Đẩy ${input.stockAllocationPercent ?? 100}% · Tự động đẩy: ${input.autoSyncInventory !== false ? "Bật" : "Tắt"}).`
        )
        toast({
          title: "Đã cập nhật cấu hình đồng bộ gian hàng",
          variant: "success"
        })
        return
      }

      await updateChannelConnection(connectionId, input)
      setSyncConfigConn(null)
      await refreshAll()
      setMessage("Đã cập nhật cấu hình đồng bộ tồn kho gian hàng thành công.")
      toast({
        title: "Đã lưu cấu hình đồng bộ tồn kho",
        variant: "success"
      })
    })
  }

  const handleScanAutoMatch = async (connectionId: string) => {
    setAutoMatchScanning(true)
    try {
      if (isDemo) {
        const preview = buildDemoAutoMatchPreview(
          connectionId,
          demoMappings,
          variants,
          demoConflicts
        )
        setAutoMatchPreview(preview)
        return
      }
      const res = await autoMatchSkuMappings({
        connectionId,
        dryRun: true
      })
      if (res.dryRun) {
        setAutoMatchPreview(res)
      }
    } catch {
      toast({
        title: "Không thể quét danh mục sàn ngay lúc này",
        variant: "error"
      })
    } finally {
      setAutoMatchScanning(false)
    }
  }

  const handleOpenAutoMatch = (connectionId: string) => {
    setAutoMatchPreview(null)
    setAutoMatchConnId(connectionId)
  }

  const handleCommitAutoMatch = async (
    connectionId: string,
    pairs: AutoMatchSelectedPair[]
  ) => {
    if (pairs.length === 0) return
    setAutoMatchCommitting(true)
    try {
      if (isDemo) {
        const conn = connections.find((c) => c.id === connectionId)
        const now = new Date().toISOString()
        const createdMappings = pairs.map((p, idx) => {
          const v = variants.find((it) => it.variantId === p.internalVariantId)
          return {
            id: `demo-automatch-${Date.now()}-${idx}`,
            tenantId: "00000000-0000-4000-8000-000000000001",
            connectionId,
            provider: conn?.provider ?? ("LAZADA" as const),
            externalItemId: p.externalItemId,
            externalSkuId: p.externalSkuId,
            externalSkuCode: p.externalSkuCode ?? v?.skuCode ?? null,
            externalProductName: p.externalProductName ?? v?.name ?? null,
            internalProductId: v?.productId ?? null,
            internalVariantId: p.internalVariantId,
            internalSkuCode: v?.skuCode ?? "SKU-AUTO",
            mappingMode: "EXACT_SKU_AUTO" as const,
            mappingVersion: 1,
            status: "ACTIVE" as const,
            listingSyncStatus: "SYNCED" as const,
            externalPrice: p.externalPrice ?? v?.price ?? 0,
            lastSyncedAt: now,
            createdBy: "demo-operator",
            updatedBy: "demo-operator",
            createdAt: now,
            updatedAt: now
          }
        })
        const resolvedSet = new Set(
          pairs.map((p) => `${p.externalItemId}:${p.externalSkuId}`)
        )
        setDemoMappings((prev) => [...createdMappings, ...prev])
        setDemoConflicts((prev) =>
          prev.map((c) =>
            c.connectionId === connectionId &&
            c.conflictType === "SKU_UNMAPPED" &&
            resolvedSet.has(`${c.externalItemId}:${c.externalSkuId}`)
              ? {
                  ...c,
                  status: "RESOLVED",
                  resolutionAction: "AUTO_MATCH_SKU",
                  resolvedAt: now
                }
              : c
          )
        )
        setAutoMatchConnId(null)
        setAutoMatchPreview(null)
        setMessage(
          `Đã tự động nối thành công ${createdMappings.length} mã SKU giữa Catalog và ${conn?.shopName ?? "gian hàng"}.`
        )
        toast({
          title: `Đã nối hàng loạt ${createdMappings.length} mã SKU`,
          description: "Các xung đột đơn hàng liên quan đã được tự động gỡ khóa.",
          variant: "success"
        })
        return
      }

      const res = await autoMatchSkuMappings({
        connectionId,
        dryRun: false,
        selectedPairs: pairs
      })
      setAutoMatchConnId(null)
      setAutoMatchPreview(null)
      await refreshAll()
      const createdCount = !res.dryRun ? res.createdCount : pairs.length
      setMessage(
        `Đã liên kết hàng loạt ${createdCount} mã SKU thành công.`
      )
      toast({
        title: `Đã nối ${createdCount} mã SKU lên sàn`,
        variant: "success"
      })
    } catch {
      toast({
        title: "Không thể hoàn tất nối SKU hàng loạt",
        variant: "error"
      })
    } finally {
      setAutoMatchCommitting(false)
    }
  }

  const handleCreateMapping = async (input: CreateSkuMappingInput) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const variant = variants.find(
          (v) => v.variantId === input.internalVariantId
        )
        const conn = connections.find((c) => c.id === input.connectionId)
        const now = new Date().toISOString()
        setDemoMappings((prev) => [
          {
            id: `demo-map-${Date.now()}`,
            tenantId: "00000000-0000-4000-8000-000000000001",
            connectionId: input.connectionId,
            provider: conn?.provider ?? "LAZADA",
            externalItemId: input.externalItemId,
            externalSkuId: input.externalSkuId,
            externalSkuCode: input.externalSkuCode ?? variant?.skuCode ?? null,
            externalProductName:
              input.externalProductName ?? variant?.name ?? null,
            internalProductId: variant?.productId ?? null,
            internalVariantId: input.internalVariantId,
            internalSkuCode: variant?.skuCode ?? "SKU-INTERNAL",
            mappingMode: input.mappingMode ?? "MANUAL",
            mappingVersion: 1,
            status: "ACTIVE",
            listingSyncStatus: "MAPPED",
            externalPrice: input.externalPrice ?? variant?.price ?? 0,
            lastSyncedAt: now,
            createdBy: "demo-operator",
            updatedBy: "demo-operator",
            createdAt: now,
            updatedAt: now
          },
          ...prev
        ])
        setMessage(
          `Đã tạo ánh xạ SKU Lazada (${input.externalItemId} / ${input.externalSkuId}) thành công.`
        )
        return
      }
      await createSkuMapping(input)
      await refreshAll()
      setMessage("Đã tạo ánh xạ SKU thành công.")
    })
  }

  const handleUpdateMapping = async (
    id: string,
    input: UpdateSkuMappingInput
  ) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const variant = variants.find(
          (v) => v.variantId === input.internalVariantId
        )
        setDemoMappings((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  internalVariantId:
                    input.internalVariantId ?? m.internalVariantId,
                  internalSkuCode: variant?.skuCode ?? m.internalSkuCode,
                  externalSkuCode: input.externalSkuCode ?? m.externalSkuCode,
                  externalProductName:
                    input.externalProductName ?? m.externalProductName,
                  status: input.status ?? m.status,
                  externalPrice: input.externalPrice ?? m.externalPrice,
                  mappingVersion: m.mappingVersion + 1
                }
              : m
          )
        )
        setMessage("Đã cập nhật ánh xạ SKU và tăng phiên bản ánh xạ.")
        return
      }
      await updateSkuMapping(id, input)
      await refreshAll()
      setMessage("Đã cập nhật ánh xạ SKU thành công.")
    })
  }

  const handleDeleteMapping = async (id: string) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        setDemoMappings((prev) => prev.filter((m) => m.id !== id))
        setMessage("Đã xóa ánh xạ SKU.")
        return
      }
      await deleteSkuMapping(id)
      await refreshAll()
      setMessage("Đã xóa ánh xạ SKU.")
    })
  }

  const handleRetryJob = async (jobId: string) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        setDemoJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "COMPLETED",
                  attemptCount: j.attemptCount + 1,
                  lastErrorCode: null,
                  lastErrorMessage: null,
                  completedAt: now
                }
              : j
          )
        )
        setMessage("Đã chạy lại (Replay) tiến trình đồng bộ thành công.")
        return
      }
      const job = await retrySyncJob(jobId, { executeImmediately: true })
      await refreshAll()
      setMessage(`Đã chạy lại tiến trình ${job.code} (${job.status}).`)
    })
  }

  const handleResolveConflict = async (
    conflictId: string,
    input: ResolveSyncConflictInput
  ) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const target = demoConflicts.find((c) => c.id === conflictId)
        if (
          target &&
          input.internalVariantId &&
          target.externalItemId &&
          target.externalSkuId
        ) {
          await handleCreateMapping({
            connectionId: target.connectionId,
            externalItemId: target.externalItemId,
            externalSkuId: target.externalSkuId,
            internalVariantId: input.internalVariantId
          })
        }
        setDemoConflicts((prev) =>
          prev.map((c) =>
            c.id === conflictId
              ? {
                  ...c,
                  status: input.resolutionStatus,
                  resolutionAction: input.resolutionAction,
                  resolutionNotes: input.resolutionNotes ?? null,
                  resolvedAt: new Date().toISOString()
                }
              : c
          )
        )
        setMessage(
          "Đã xử lý xung đột, tạo ánh xạ SKU và tự động nhập lại đơn hàng Lazada vào Sales!"
        )
        return
      }
      await resolveSyncConflict(conflictId, input)
      await refreshAll()
      setMessage(
        "Đã giải quyết xung đột đồng bộ và kích hoạt nhập lại đơn hàng."
      )
    })
  }

  const handleRetryConflict = async (conflictId: string) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        setDemoConflicts((prev) =>
          prev.map((c) =>
            c.id === conflictId
              ? {
                  ...c,
                  status: "RESOLVED",
                  resolutionAction: "RETRY_SUCCEEDED",
                  resolvedAt: new Date().toISOString()
                }
              : c
          )
        )
        setMessage("Đã nhập lại đơn hàng Lazada thành công!")
        return
      }
      await retrySyncConflict(conflictId)
      await refreshAll()
      setMessage("Đã thử nhập lại đơn hàng từ xung đột.")
    })
  }

  const handleExecuteReconciliation = async (
    input: TriggerReconciliationRunInput
  ) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const now = new Date().toISOString()
        const newRun = {
          id: `demo-rec-${Date.now()}`,
          tenantId: "00000000-0000-4000-8000-000000000001",
          code: `REC-00000${demoRuns.length + 4}`,
          connectionId: input.connectionId ?? null,
          provider: "LAZADA" as const,
          runType: input.runType ?? "INCREMENTAL",
          status: "COMPLETED" as const,
          windowStart: new Date(Date.now() - 86400 * 1000).toISOString(),
          windowEnd: now,
          recordsExamined: 18,
          matchedCount: 17,
          mismatchCount: 0,
          autoRecoveredCount: 1,
          startedAt: now,
          completedAt: now,
          triggeredBy: "demo-operator",
          createdAt: now
        }
        setDemoRuns((prev) => [newRun, ...prev])
        setSelectedRunDetail(buildDemoReconciliationDetail(newRun))
        setMessage(
          `Đã hoàn tất phiên đối soát ${newRun.code} (Tự động khôi phục 1 đơn hàng sót Webhook).`
        )
        return
      }
      const detail = await executeReconciliationRun(input)
      setSelectedRunDetail(detail)
      await refreshAll()
      setMessage(
        `Đã hoàn tất đối soát ${detail.run.code}: Khớp ${detail.run.matchedCount}, Tự khôi phục ${detail.run.autoRecoveredCount}, Lệch ${detail.run.mismatchCount}.`
      )
    })
  }

  const handleInspectRun = async (runId: string) => {
    setErrorMessage("")
    await actionMutation.mutateAsync(async () => {
      if (isDemo) {
        const found = demoRuns.find((r) => r.id === runId)
        if (found) setSelectedRunDetail(buildDemoReconciliationDetail(found))
        return
      }
      setSelectedRunDetail(await getReconciliationRun(runId))
    })
  }

  const connectedCount = connections.filter(
    (c) => c.status === "CONNECTED"
  ).length
  const openConflictCount = conflicts.filter((c) => c.status === "OPEN").length
  const branchMap = new Map(branches.map((b) => [b.id, b]))
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">
            Bán hàng đa kênh / Liên kết Sàn TMĐT
          </p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">
            Kênh bán hàng & Tích hợp Lazada
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Quản lý tập trung gian hàng Lazada & Shopee: tự động tải đơn hàng,
            liên kết hàng hóa (SKU), phân bổ tồn kho và đối soát chênh lệch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium ${
              integrationOnline
                ? "bg-[#e6f5ee] text-[#147853]"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {integrationOnline ? (
              <CheckCircle2 size={15} />
            ) : (
              <WifiOff size={15} />
            )}
            {isDemo
              ? "Chế độ Demo tương tác"
              : integrationOnline
                ? "Hệ thống đồng bộ đang hoạt động"
                : "Dịch vụ đồng bộ tạm ngắt"}
          </div>

          <Button
            type="button"
            onClick={() => setConnectModalProvider("LAZADA")}
            className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            <Plus size={16} /> Kết nối gian hàng Lazada
          </Button>
        </div>
      </header>

      {/* Top KPI Summary Cards */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Gian hàng đang kết nối"
          value={`${connectedCount} / ${connections.length || 1}`}
          sub="Hỗ trợ đa gian hàng Lazada & Shopee"
          icon={Store}
        />
        <MetricCard
          label="Sản phẩm đã liên kết SKU"
          value={String(mappings.filter((m) => m.status === "ACTIVE").length)}
          sub={`Trên tổng ${mappings.length} mã hàng trên sàn`}
          icon={Link2}
        />
        <MetricCard
          label="Lượt đồng bộ thành công"
          value={String(jobs.filter((j) => j.status === "COMPLETED").length)}
          sub={`Tổng ${jobs.length} tác vụ đồng bộ gần đây`}
          icon={Boxes}
        />
        <MetricCard
          label="Đơn sàn chờ xử lý xung đột"
          value={String(openConflictCount)}
          sub={
            openConflictCount > 0
              ? "Nhấn để liên kết SKU & tạo đơn ngay"
              : "Mọi đơn hàng từ sàn đều khớp"
          }
          icon={AlertTriangle}
          warning={openConflictCount > 0}
          onClick={() => setTab("conflicts")}
        />
      </section>

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5">
        {CHANNEL_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              tab === item.id
                ? "bg-[#16866f] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#163d36]"
            }`}
          >
            <span>{item.label}</span>
            {item.id === "conflicts" && openConflictCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  tab === item.id
                    ? "bg-white text-[#16866f]"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {openConflictCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {message && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-3.5 text-sm text-[#147853]">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} /> {message}
          </span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Đóng thông báo"
            className="text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} /> {errorMessage}
          </span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            aria-label="Đóng lỗi"
            className="text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & LAZADA CONNECTIONS HUB */}
      {tab === "overview" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-700">
                  <Sparkles size={13} /> Quản lý Gian hàng Sàn TMĐT
                </span>
                <h2 className="mt-2 text-xl font-semibold text-[#163d36]">
                  Danh sách Gian hàng Lazada & Shopee đã liên kết
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Mỗi gian hàng gắn với một Chi nhánh và Kho xuất hàng, tự động
                  giữ lại tồn kho dự phòng tại cửa hàng để tránh bán vượt tồn.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConnectModalProvider("SHOPEE")}
                  className="gap-1.5 text-xs"
                >
                  <Plus size={14} /> Thêm gian hàng Shopee
                </Button>
                <Button
                  type="button"
                  onClick={() => setConnectModalProvider("LAZADA")}
                  className="gap-1.5 bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
                >
                  <Plus size={14} /> Thêm gian hàng Lazada
                </Button>
              </div>
            </div>

            {!isDemo && connectionsQuery.isLoading && connections.length === 0 ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-[#163d36]">
                  Chưa có gian hàng Lazada nào được kết nối.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Nhấn &ldquo;Thêm gian hàng Lazada&rdquo; để đăng nhập cấp
                  quyền hoặc kết nối bằng Token thử nghiệm.
                </p>
                <Button
                  type="button"
                  onClick={() => setConnectModalProvider("LAZADA")}
                  className="mt-4 gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
                >
                  <KeyRound size={15} /> Bắt đầu kết nối Lazada ngay
                </Button>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {connections.map((conn) => {
                  const statusBadge = STATUS_BADGE[conn.status] ?? {
                    label: conn.status,
                    className: "bg-slate-100 text-slate-600"
                  }
                  const branch = branchMap.get(conn.branchId)
                  const warehouse = conn.warehouseId
                    ? warehouseMap.get(conn.warehouseId)
                    : undefined

                  return (
                    <article
                      key={conn.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#fcfdfd] p-5 transition hover:border-[#16866f]/40"
                    >
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold ${
                                conn.provider === "LAZADA"
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {conn.provider === "LAZADA" ? "LZD" : "SHP"}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-[#163d36]">
                                  {conn.shopName}
                                </h3>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                                  {conn.code}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Mã gian hàng:{" "}
                                <code className="font-semibold text-slate-700">
                                  {conn.externalShopId}
                                </code>{" "}
                                · Chi nhánh:{" "}
                                <strong>
                                  {branch?.name ?? conn.branchId.slice(0, 8)}
                                </strong>
                              </p>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl border border-slate-100 bg-white p-3 text-xs sm:grid-cols-4">
                          <div>
                            <span className="text-[11px] text-slate-400">
                              Kho xuất hàng
                            </span>
                            <p className="mt-0.5 truncate font-medium text-slate-700">
                              {warehouse?.name ?? "Tất cả kho CN"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400">
                              Dự phòng / Đẩy tồn
                            </span>
                            <p className="mt-0.5 font-medium text-slate-700">
                              Giữ {conn.safetyStockBuffer} SP ·{" "}
                              {conn.stockAllocationPercent}% ·{" "}
                              <span
                                className={
                                  conn.autoSyncInventory !== false
                                    ? "text-[#147853]"
                                    : "text-amber-600"
                                }
                              >
                                {conn.autoSyncInventory !== false
                                  ? "Tự đẩy"
                                  : "Thủ công"}
                              </span>
                            </p>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400">
                              Tải đơn gần nhất
                            </span>
                            <p className="mt-0.5 font-medium text-slate-700">
                              {conn.lastOrderSyncAt
                                ? new Date(
                                    conn.lastOrderSyncAt
                                  ).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "Chưa tải"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400">
                              Ủy quyền sàn
                            </span>
                            <p className="mt-0.5 font-medium text-slate-700">
                              {conn.credentialSummary.hasAccessToken
                                ? `Đang hiệu lực (v${conn.credentialSummary.credentialVersion})`
                                : "Chưa cấp quyền"}
                            </p>
                          </div>
                        </div>

                        {conn.lastErrorMessage && (
                          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                            <strong>[{conn.lastErrorCode}]</strong>{" "}
                            {conn.lastErrorMessage}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              conn.status === "PENDING_AUTH" ||
                              conn.status === "REAUTH_REQUIRED" ||
                              conn.status === "TOKEN_EXPIRED"
                                ? "default"
                                : "outline"
                            }
                            onClick={() => handleOpenOAuthModal(conn)}
                            className={
                              conn.status === "PENDING_AUTH" ||
                              conn.status === "REAUTH_REQUIRED" ||
                              conn.status === "TOKEN_EXPIRED"
                                ? "h-8 gap-1.5 bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
                                : "h-8 gap-1.5 text-xs"
                            }
                          >
                            <KeyRound size={13} />
                            {conn.status === "CONNECTED"
                              ? "Cấp lại quyền"
                              : "Ủy quyền Lazada"}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={conn.status !== "CONNECTED"}
                            onClick={() => setOrderSyncConn(conn)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <RefreshCw size={13} /> Tải đơn hàng
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={conn.status !== "CONNECTED"}
                            onClick={() => handleTriggerInventorySync(conn.id)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <Boxes size={13} /> Đẩy tồn kho
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAutoMatch(conn.id)}
                            className="h-8 gap-1.5 border-[#16866f]/30 bg-[#f2fbf6] text-xs font-semibold text-[#147853] hover:bg-[#e6f5ee]"
                          >
                            <Link2 size={13} /> Gợi ý nối SKU
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            title="Chỉnh sửa Buffer tồn an toàn, % phân bổ & Tự động đẩy tồn"
                            onClick={() => setSyncConfigConn(conn)}
                            className="h-8 gap-1 px-2 text-xs font-medium text-[#16866f] hover:bg-[#e6f5ee]"
                          >
                            <SlidersHorizontal size={14} /> Cấu hình đồng bộ
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            title="Trạng thái kết nối & Cấu hình Webhook"
                            onClick={() => handleOpenHealth(conn)}
                            className="h-8 gap-1 px-2 text-xs text-slate-600 hover:text-[#16866f]"
                          >
                            <Activity size={14} /> Cấu hình & Webhook
                          </Button>

                          {(conn.status === "CONNECTED" ||
                            conn.status === "PAUSED") && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              title={
                                conn.status === "CONNECTED"
                                  ? "Tạm dừng đồng bộ"
                                  : "Tiếp tục đồng bộ"
                              }
                              onClick={() => handlePauseOrResume(conn)}
                              className="h-8 px-2 text-slate-500"
                            >
                              {conn.status === "CONNECTED" ? (
                                <PauseCircle size={15} />
                              ) : (
                                <PlayCircle size={15} />
                              )}
                            </Button>
                          )}

                          {conn.status !== "DISCONNECTED" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              title="Ngắt kết nối gian hàng"
                              onClick={() => handleDisconnect(conn)}
                              className="h-8 px-2 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* All Omnichannel Channels Directory */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                id: "pos",
                name: "Bán tại quầy (POS)",
                desc: "Ghi nhận đơn hàng và trừ tồn trực tiếp tại quầy thu ngân",
                icon: Store,
                color: "bg-[#e6f5ee] text-[#16866f]",
                status: "Đang hoạt động",
                active: true,
                onAction: null
              },
              {
                id: "lazada",
                name: "Sàn TMĐT Lazada",
                desc: "Đồng bộ đơn hàng, cập nhật tồn kho & liên kết mã ShopSKU",
                icon: ShoppingBag,
                color: "bg-orange-50 text-orange-600",
                status: connections.some(
                  (c) => c.provider === "LAZADA" && c.status === "CONNECTED"
                )
                  ? "Đang kết nối"
                  : "Sẵn sàng kết nối",
                active: connections.some(
                  (c) => c.provider === "LAZADA" && c.status === "CONNECTED"
                ),
                onAction: () => setConnectModalProvider("LAZADA")
              },
              {
                id: "shopee",
                name: "Sàn TMĐT Shopee",
                desc: "Đồng bộ sản phẩm, đơn hàng và tồn kho Shopee Kênh Người Bán",
                icon: ShoppingBag,
                color: "bg-amber-50 text-amber-600",
                status: connections.some(
                  (c) => c.provider === "SHOPEE" && c.status === "CONNECTED"
                )
                  ? "Đang kết nối"
                  : "Sẵn sàng kết nối",
                active: connections.some(
                  (c) => c.provider === "SHOPEE" && c.status === "CONNECTED"
                ),
                onAction: () => setConnectModalProvider("SHOPEE")
              },
              {
                id: "social",
                name: "Website & Facebook / Zalo",
                desc: "Tập trung đơn hàng từ Website bán hàng và mạng xã hội",
                icon: Globe2,
                color: "bg-blue-50 text-blue-600",
                status: "Sắp ra mắt",
                active: false,
                onAction: () =>
                  setMessage(
                    "Kênh Website & Mạng xã hội sẽ được kích hoạt trong bản cập nhật tiếp theo."
                  )
              }
            ].map((ch) => {
              const Icon = ch.icon
              return (
                <article
                  key={ch.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_15px_rgba(20,50,45,0.04)]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${ch.color}`}
                      >
                        <Icon size={20} />
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          ch.active
                            ? "bg-[#e6f5ee] text-[#147853]"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {ch.status}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-[#163d36]">
                      {ch.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{ch.desc}</p>
                  </div>
                  {ch.onAction && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={ch.onAction}
                        className="w-full text-xs"
                      >
                        {ch.active ? "Thêm gian hàng khác" : "Thiết lập kết nối"}
                      </Button>
                    </div>
                  )}
                </article>
              )
            })}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-[#16866f]" />
              <h2 className="font-semibold text-[#163d36]">
                Nguyên tắc đồng bộ tồn kho & đơn hàng đa kênh (Omnichannel)
              </h2>
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              • <strong>Tồn kho trung tâm là nguồn dữ liệu duy nhất:</strong> Khi
              phát sinh đơn hàng tại quầy POS hoặc trên Lazada/Shopee, tồn khả
              dụng sẽ tự động trừ và đẩy số tồn mới lên tất cả các gian hàng đã
              liên kết.
              <br />• <strong>Không trùng đơn & không trừ lặp tồn kho:</strong>{" "}
              Mỗi mã đơn hàng trên sàn chỉ được tạo một lần duy nhất; các đơn
              hàng lịch sử đã giao hoặc đã hủy được đồng bộ để đối soát doanh
              thu mà không trừ vào tồn kho hiện tại.
            </p>
          </section>
        </div>
      )}

      {/* TAB 2: SKU MAPPINGS */}
      {tab === "sku-mappings" && (
        <SkuMappingsPanel
          connections={connections}
          mappings={mappings}
          variants={variants}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={setSelectedConnectionId}
          onCreateMapping={handleCreateMapping}
          onUpdateMapping={handleUpdateMapping}
          onDeleteMapping={handleDeleteMapping}
          onAutoDiscoverProducts={handleTriggerProductSync}
          onOpenAutoMatch={handleOpenAutoMatch}
          pending={actionMutation.isPending}
        />
      )}

      {/* TAB 3: SYNC JOBS */}
      {tab === "sync-jobs" && (
        <SyncJobsPanel
          connections={connections}
          jobs={jobs}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={setSelectedConnectionId}
          onOpenOrderSync={(conn) => setOrderSyncConn(conn)}
          onTriggerInventorySync={handleTriggerInventorySync}
          onTriggerProductSync={handleTriggerProductSync}
          onRetryJob={handleRetryJob}
          pending={actionMutation.isPending}
        />
      )}

      {/* TAB 4: CONFLICTS */}
      {tab === "conflicts" && (
        <ConflictsPanel
          connections={connections}
          conflicts={conflicts}
          variants={variants}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={setSelectedConnectionId}
          onResolveConflict={handleResolveConflict}
          onRetryConflict={handleRetryConflict}
          pending={actionMutation.isPending}
        />
      )}

      {/* TAB 5: RECONCILIATION */}
      {tab === "reconciliation" && (
        <ReconciliationPanel
          connections={connections}
          runs={runs}
          selectedRunDetail={selectedRunDetail}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={setSelectedConnectionId}
          onExecuteRun={handleExecuteReconciliation}
          onInspectRun={handleInspectRun}
          pending={actionMutation.isPending}
        />
      )}

      {/* MODALS */}
      {connectModalProvider && (
        <LazadaConnectionModal
          branches={branches}
          warehouses={warehouses}
          defaultProvider={connectModalProvider}
          pending={actionMutation.isPending}
          error={actionMutation.isError ? errorMessage : ""}
          onClose={() => setConnectModalProvider(null)}
          onSubmit={handleCreateConnection}
        />
      )}

      {oauthModalConn && (
        <LazadaOAuthModal
          connection={oauthModalConn}
          oauthSession={oauthSession}
          pending={actionMutation.isPending}
          error={actionMutation.isError ? errorMessage : ""}
          onClose={() => {
            setOauthModalConn(null)
            setOauthSession(null)
          }}
          onRefreshUrl={() => handleOpenOAuthModal(oauthModalConn)}
          onExchangeCode={handleExchangeOAuthCode}
        />
      )}

      {healthModalConn && (
        <ConnectionHealthModal
          connection={healthModalConn}
          health={healthData}
          loading={healthLoading}
          onClose={() => {
            setHealthModalConn(null)
            setHealthData(null)
          }}
          onRefreshToken={() => handleRefreshToken(healthModalConn)}
        />
      )}

      {orderSyncConn && (
        <LazadaOrderSyncModal
          connection={orderSyncConn}
          pending={actionMutation.isPending}
          error={actionMutation.isError ? errorMessage : ""}
          onClose={() => setOrderSyncConn(null)}
          onSubmit={handleTriggerOrderSync}
        />
      )}

      {syncConfigConn && (
        <ConnectionSyncConfigModal
          connection={syncConfigConn}
          warehouses={warehouses}
          pending={actionMutation.isPending}
          onClose={() => setSyncConfigConn(null)}
          onSave={handleSaveSyncConfig}
        />
      )}

      {autoMatchConnId && (
        <BulkAutoMatchSkuModal
          connections={connections}
          initialConnectionId={autoMatchConnId}
          variants={variants}
          scanning={autoMatchScanning}
          committing={autoMatchCommitting}
          preview={autoMatchPreview}
          onScanConnection={handleScanAutoMatch}
          onCommitSelected={handleCommitAutoMatch}
          onClose={() => {
            setAutoMatchConnId(null)
            setAutoMatchPreview(null)
          }}
        />
      )}
    </main>
  )
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  warning = false,
  onClick
}: {
  label: string
  value: string
  sub: string
  icon: typeof Store
  warning?: boolean
  onClick?: () => void
}) {
  return (
    <section
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 shadow-[0_3px_15px_rgba(20,50,45,0.04)] ${
        warning ? "border-amber-300" : "border-slate-200"
      } ${onClick ? "cursor-pointer transition hover:border-[#16866f]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            warning
              ? "bg-amber-50 text-amber-600"
              : "bg-[#e6f5ee] text-[#16866f]"
          }`}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#163d36]">{value}</p>
      <p
        className={`mt-1 text-[11px] ${
          warning ? "font-medium text-amber-700" : "text-slate-400"
        }`}
      >
        {sub}
      </p>
    </section>
  )
}

function extractApiError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : "Không thể thực hiện thao tác tích hợp."
  }
  const data = error.response?.data as
    | { message?: string | string[]; errorCode?: string; code?: string }
    | undefined
  const msg = Array.isArray(data?.message)
    ? data.message.join(" ")
    : data?.message
  const code = data?.errorCode || data?.code
  if (msg && code) return `[${code}] ${msg}`
  return (
    msg ||
    code ||
    "Không thể kết nối tới Integration Service. Vui lòng kiểm tra quyền hạn hoặc cấu hình Lazada."
  )
}
