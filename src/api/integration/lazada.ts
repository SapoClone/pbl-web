import { gatewayClient } from "@/api/axios"

export type MarketplaceProvider = "LAZADA" | "SHOPEE"

export type ConnectionStatus =
  | "PENDING_AUTH"
  | "CONNECTED"
  | "DEGRADED"
  | "TOKEN_EXPIRED"
  | "REAUTH_REQUIRED"
  | "PAUSED"
  | "DISCONNECTED"

export type SkuMappingStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "CONFLICT"
  | "NEEDS_REVIEW"

export type ListingSyncStatus =
  | "NOT_MAPPED"
  | "MAPPED"
  | "SYNC_PENDING"
  | "SYNCED"
  | "SYNC_FAILED"
  | "NEEDS_REVIEW"
  | "UNSUPPORTED"

export type SyncJobType =
  | "ORDER_IMPORT"
  | "ORDER_POLL"
  | "ORDER_STATUS_SYNC"
  | "INVENTORY_PUBLICATION"
  | "PRODUCT_MAPPING_SYNC"
  | "PRODUCT_PUBLICATION"
  | "CONNECTION_TOKEN_REFRESH"
  | "FULL_RECONCILIATION"
  | "INCREMENTAL_RECONCILIATION"

export type SyncJobStatus =
  | "PENDING"
  | "RUNNING"
  | "RETRY_SCHEDULED"
  | "COMPLETED"
  | "FAILED_PERMANENT"
  | "CANCELLED"
  | "NEEDS_REVIEW"
  | "DEAD_LETTERED"

export type SyncConflictType =
  | "SKU_UNMAPPED"
  | "SKU_INACTIVE"
  | "QUANTITY_INVALID"
  | "STOCK_INSUFFICIENT"
  | "DUPLICATE_EXTERNAL_ORDER"
  | "ORDER_STATE_CONFLICT"
  | "PAYMENT_EVIDENCE_CONFLICT"
  | "ADDRESS_INVALID"
  | "PROVIDER_DATA_INCOMPLETE"
  | "PROVIDER_AUTH_EXPIRED"
  | "SYNC_VERSION_CONFLICT"

export type ReconciliationRunType =
  | "INCREMENTAL"
  | "FULL"
  | "ORDER_VERIFICATION"
  | "INVENTORY_VERIFICATION"

export type ChannelConnection = {
  id: string
  tenantId: string
  code: string
  provider: MarketplaceProvider
  connectionKey: string
  externalShopId: string
  shopName: string
  branchId: string
  warehouseId: string | null
  status: ConnectionStatus
  safetyStockBuffer: number
  stockAllocationPercent: number
  autoSyncInventory?: boolean
  lastSyncAt: string | null
  lastOrderSyncAt: string | null
  lastInventorySyncAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  consecutiveFailures: number
  credentialSummary: {
    credentialVersion: number
    hasAccessToken: boolean
    hasRefreshToken: boolean
    accessTokenExpiresAt: string | null
    refreshTokenExpiresAt: string | null
    lastRefreshedAt: string | null
  }
  createdAt: string
  updatedAt: string
}

export type ProviderCapabilityDeclaration = {
  provider: MarketplaceProvider
  apiVersion: string
  supportsOAuth: boolean
  supportsTokenRefresh: boolean
  supportsWebhookSignatureVerification: boolean
  supportsIncrementalOrderPolling: boolean
  supportsBatchOrderFetch: boolean
  supportsInventoryPublication: boolean
  supportsProductListingDiscovery: boolean
  liveCredentialsConfigured: boolean
}

export type ChannelConnectionHealth = {
  connectionId: string
  provider: MarketplaceProvider
  externalShopId: string
  status: ConnectionStatus
  healthy: boolean
  circuitBreaker: {
    state: "CLOSED" | "OPEN" | "HALF_OPEN"
    consecutiveFailures: number
    openedAt: string | null
    nextAttemptAt: string | null
  }
  tokenStatus: {
    hasAccessToken: boolean
    accessTokenExpiresAt: string | null
    isExpired: boolean
  }
  lastSyncAt: string | null
  lastOrderSyncAt: string | null
  lastInventorySyncAt: string | null
  consecutiveFailures: number
  lastErrorCode: string | null
  capabilities: ProviderCapabilityDeclaration
}

export type CreateChannelConnectionInput = {
  provider: MarketplaceProvider
  branchId: string
  warehouseId?: string
  externalShopId?: string
  shopName?: string
  safetyStockBuffer?: number
  stockAllocationPercent?: number
  autoSyncInventory?: boolean
  partnerId?: string
  webhookSecret?: string
  accessToken?: string
  refreshToken?: string
}

export type UpdateChannelConnectionInput = {
  shopName?: string
  warehouseId?: string | null
  safetyStockBuffer?: number
  stockAllocationPercent?: number
  autoSyncInventory?: boolean
}

export type AuthorizeChannelConnectionInput = {
  redirectUri?: string
  authorizationCode?: string
  stateNonce?: string
  externalShopId?: string
}

export type OAuthInitiatedResponse = {
  mode: "OAUTH_INITIATED"
  connectionId: string
  provider: MarketplaceProvider
  authorizationUrl: string
  stateNonce: string
  expiresInSeconds: number
}

export type OAuthCompletedResponse = {
  mode: "OAUTH_COMPLETED"
  connection: ChannelConnection
}

export type AuthorizeConnectionResponse =
  | OAuthInitiatedResponse
  | OAuthCompletedResponse

export type LazadaOAuthCallbackQuery = {
  code?: string
  state?: string
  error?: string
  error_description?: string
}

export type LazadaPublicCallbackResult = {
  mode: "OAUTH_COMPLETED"
  provider: "LAZADA"
  status: "CONNECTED"
  tenantId: string
  connectionId: string
  externalShopId: string
  shopName: string
  redirectUrl: string | null
  connection: ChannelConnection
}

export type SkuMapping = {
  id: string
  tenantId: string
  connectionId: string
  provider: MarketplaceProvider
  externalItemId: string
  externalSkuId: string
  externalSkuCode: string | null
  externalProductName: string | null
  internalProductId: string | null
  internalVariantId: string
  internalSkuCode: string
  mappingMode: "MANUAL" | "EXACT_SKU_AUTO" | "AUTO_SKU"
  mappingVersion: number
  status: SkuMappingStatus
  listingSyncStatus: ListingSyncStatus
  externalPrice: number | null
  lastSyncedAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type CreateSkuMappingInput = {
  connectionId: string
  externalItemId: string
  externalSkuId: string
  externalSkuCode?: string
  externalProductName?: string
  internalVariantId: string
  externalPrice?: number
  mappingMode?: "MANUAL" | "EXACT_SKU_AUTO"
}

export type UpdateSkuMappingInput = {
  internalVariantId?: string
  externalSkuCode?: string
  externalProductName?: string
  status?: SkuMappingStatus
  externalPrice?: number
}

export type TriggerConnectionSyncInput = {
  idempotencyKey?: string
  externalOrderId?: string
  windowStart?: string
  windowEnd?: string
  executeImmediately?: boolean
}

export type SyncJob = {
  id: string
  tenantId: string
  code: string
  connectionId: string | null
  provider: MarketplaceProvider | null
  jobType: SyncJobType
  idempotencyKey: string
  status: SyncJobStatus
  priority: number
  payload: Record<string, unknown>
  resultSummary: Record<string, unknown> | null
  attemptCount: number
  maxAttempts: number
  nextRetryAt: string
  leaseOwner: string | null
  leaseExpiresAt: string | null
  errorCategory: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  correlationId: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type EnqueuedSyncJobResponse = {
  job: SyncJob
  deduplicated: boolean
}

export type RetrySyncJobInput = {
  reason?: string
  executeImmediately?: boolean
}

export type SyncConflict = {
  id: string
  tenantId: string
  code: string
  connectionId: string
  provider: MarketplaceProvider
  conflictType: SyncConflictType
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "OPEN" | "RESOLVED" | "IGNORED"
  externalOrderId: string | null
  externalItemId: string | null
  externalSkuId: string | null
  channelOrderRefId: string | null
  syncJobId: string | null
  details: Record<string, unknown>
  resolutionAction: string | null
  resolutionNotes: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ResolveSyncConflictInput = {
  resolutionStatus: "RESOLVED" | "IGNORED"
  resolutionAction: string
  resolutionNotes?: string
  internalVariantId?: string
  retryAfterResolve?: boolean
}

export type RetrySyncConflictInput = {
  notes?: string
}

export type ReconciliationRun = {
  id: string
  tenantId: string
  code: string
  connectionId: string | null
  provider: MarketplaceProvider | null
  runType: ReconciliationRunType
  status: "RUNNING" | "COMPLETED" | "FAILED"
  windowStart: string | null
  windowEnd: string | null
  recordsExamined: number
  matchedCount: number
  mismatchCount: number
  autoRecoveredCount: number
  startedAt: string
  completedAt: string | null
  triggeredBy: string
  createdAt: string
}

export type ReconciliationIssue = {
  id: string
  tenantId: string
  runId: string
  connectionId: string | null
  provider: MarketplaceProvider | null
  issueType: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  externalRef: string | null
  internalRef: string | null
  expectedState: Record<string, unknown> | null
  observedState: Record<string, unknown> | null
  status: "OPEN" | "RESOLVED" | "IGNORED"
  resolutionNotes: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  relatedSyncJobId: string | null
  createdAt: string
  updatedAt: string
}

export type ReconciliationRunDetail = {
  run: ReconciliationRun
  issues: ReconciliationIssue[]
}

export type TriggerReconciliationRunInput = {
  connectionId?: string
  runType?: ReconciliationRunType
  autoRecoverSafeItems?: boolean
}

const BASE_PATH = "/integration/api/v1/integrations"

/**
 * Parses Lazada's canonical `shop_sku` / `ShopSku` format `<item_id>_<platform>-<sku_id>`
 * (e.g. `13504402059_VNAMZ-117553898643`) into `{ itemId, skuId }`.
 */
export function parseLazadaShopSku(rawShopSku: string): {
  itemId: string
  skuId: string
} {
  if (!rawShopSku || !rawShopSku.trim()) {
    return { itemId: "", skuId: "" }
  }
  const trimmed = rawShopSku.trim()
  const [itemPart, rightPart] = trimmed.split("_")
  const itemId = itemPart?.trim() ?? ""
  if (!rightPart) {
    return { itemId, skuId: "" }
  }
  const dashIdx = rightPart.indexOf("-")
  const skuId =
    dashIdx >= 0 ? rightPart.slice(dashIdx + 1).trim() : rightPart.trim()
  return { itemId, skuId }
}

/**
 * Extracts `code` and optional `state` from either a raw authorization code string
 * or a full Lazada OAuth callback URL (`https://.../callback?code=...&state=...`).
 */
export function extractOAuthCodeAndState(rawInput: string): {
  code: string
  state?: string
} {
  const trimmed = rawInput.trim()
  if (!trimmed) return { code: "" }
  if (trimmed.includes("code=") || trimmed.startsWith("http")) {
    try {
      const url = trimmed.startsWith("http")
        ? new URL(trimmed)
        : new URL(trimmed.startsWith("?") ? `https://local.test${trimmed}` : `https://local.test?${trimmed}`)
      const code = url.searchParams.get("code")?.trim() ?? ""
      const state = url.searchParams.get("state")?.trim() || undefined
      if (code) return { code, state }
    } catch {
      // Fallback to raw string if URL parsing fails
    }
  }
  return { code: trimmed }
}

export function buildMarketplaceWebhookUrl(
  provider: MarketplaceProvider,
  connectionKey: string,
  origin: string = typeof window !== "undefined" ? window.location.origin : "https://api.sapo.makeasy.id.vn"
): string {
  return `${origin.replace(/\/+$/, "")}/integration/webhooks/v1/${provider.toLowerCase()}/${connectionKey}`
}

// ============================================================================
// 1. CHANNEL CONNECTIONS & LAZADA OAUTH 2.0
// ============================================================================

export const listChannelConnections = async () => {
  const { data } = await gatewayClient.get<ChannelConnection[]>(
    `${BASE_PATH}/connections`
  )
  return data
}

export const getChannelConnection = async (connectionId: string) => {
  const { data } = await gatewayClient.get<ChannelConnection>(
    `${BASE_PATH}/connections/${connectionId}`
  )
  return data
}

export const getChannelConnectionHealth = async (connectionId: string) => {
  const { data } = await gatewayClient.get<ChannelConnectionHealth>(
    `${BASE_PATH}/connections/${connectionId}/health`
  )
  return data
}

export const createChannelConnection = async (
  input: CreateChannelConnectionInput
) => {
  const { data } = await gatewayClient.post<ChannelConnection>(
    `${BASE_PATH}/connections`,
    input
  )
  return data
}

export const authorizeChannelConnection = async (
  connectionId: string,
  input: AuthorizeChannelConnectionInput = {}
) => {
  const { data } = await gatewayClient.post<AuthorizeConnectionResponse>(
    `${BASE_PATH}/connections/${connectionId}/authorize`,
    input
  )
  return data
}

export const completeLazadaPublicCallback = async (
  query: LazadaOAuthCallbackQuery
) => {
  const { data } = await gatewayClient.get<LazadaPublicCallbackResult>(
    "/api/v1/integrations/lazada/callback",
    { params: query }
  )
  return data
}

export const refreshChannelConnectionToken = async (
  connectionId: string,
  workerId?: string
) => {
  const { data } = await gatewayClient.post<
    ChannelConnection & { refreshed: boolean }
  >(
    `${BASE_PATH}/connections/${connectionId}/refresh`,
    workerId ? { workerId } : {}
  )
  return data
}

export const pauseChannelConnection = async (connectionId: string) => {
  const { data } = await gatewayClient.post<ChannelConnection>(
    `${BASE_PATH}/connections/${connectionId}/pause`
  )
  return data
}

export const resumeChannelConnection = async (connectionId: string) => {
  const { data } = await gatewayClient.post<ChannelConnection>(
    `${BASE_PATH}/connections/${connectionId}/resume`
  )
  return data
}

export const updateChannelConnection = async (
  connectionId: string,
  input: UpdateChannelConnectionInput
) => {
  const { data } = await gatewayClient.patch<ChannelConnection>(
    `${BASE_PATH}/connections/${connectionId}`,
    input
  )
  return data
}

export const disconnectChannelConnection = async (connectionId: string) => {
  const { data } = await gatewayClient.delete<ChannelConnection>(
    `${BASE_PATH}/connections/${connectionId}`
  )
  return data
}

// ============================================================================
// 2. MANUAL SYNCHRONIZATION TRIGGERS (ORDERS, INVENTORY, PRODUCTS)
// ============================================================================

export const triggerOrderSync = async (
  connectionId: string,
  input: TriggerConnectionSyncInput = { executeImmediately: true }
) => {
  const { data } = await gatewayClient.post<EnqueuedSyncJobResponse>(
    `${BASE_PATH}/connections/${connectionId}/sync/orders`,
    input
  )
  return data
}

export const triggerInventorySync = async (
  connectionId: string,
  input: TriggerConnectionSyncInput = { executeImmediately: true }
) => {
  const { data } = await gatewayClient.post<EnqueuedSyncJobResponse>(
    `${BASE_PATH}/connections/${connectionId}/sync/inventory`,
    input
  )
  return data
}

export const triggerProductSync = async (
  connectionId: string,
  input: TriggerConnectionSyncInput = { executeImmediately: true }
) => {
  const { data } = await gatewayClient.post<EnqueuedSyncJobResponse>(
    `${BASE_PATH}/connections/${connectionId}/sync/products`,
    input
  )
  return data
}

// ============================================================================
// 3. SKU MAPPINGS & AUTO-MATCH
// ============================================================================

export type AutoMatchConfidence =
  | "EXACT_SKU"
  | "BARCODE"
  | "NORMALIZED_SKU"
  | "UNMATCHED"

export type AutoMatchCandidate = {
  externalItemId: string
  externalSkuId: string
  externalSkuCode: string | null
  externalProductName: string
  externalPrice: number | null
  source: "MARKETPLACE_LISTING" | "OPEN_CONFLICT"
  conflictId: string | null
  matched: boolean
  confidence: AutoMatchConfidence
  internalVariantId: string | null
  internalProductId: string | null
  internalSkuCode: string | null
  internalVariantName: string | null
  internalBasePrice: number | null
  priceDelta: number | null
}

export type AutoMatchPreviewResponse = {
  dryRun: true
  connectionId: string
  totalScanned: number
  alreadyMappedCount: number
  matchedCount: number
  unmatchedCount: number
  suggestions: AutoMatchCandidate[]
}

export type AutoMatchSelectedPair = {
  externalItemId: string
  externalSkuId: string
  externalSkuCode?: string
  externalProductName?: string
  externalPrice?: number
  internalVariantId: string
}

export type AutoMatchCommitResponse = {
  dryRun: false
  connectionId: string
  createdCount: number
  skippedExistingCount: number
  resolvedConflictCount: number
  mappings: SkuMapping[]
}

export const autoMatchSkuMappings = async (input: {
  connectionId: string
  dryRun?: boolean
  selectedPairs?: AutoMatchSelectedPair[]
}) => {
  const { data } = await gatewayClient.post<
    AutoMatchPreviewResponse | AutoMatchCommitResponse
  >(`${BASE_PATH}/sku-mappings/auto-match`, input)
  return data
}

export const listSkuMappings = async (params?: {
  connectionId?: string
  internalVariantId?: string
  status?: string
}) => {
  const { data } = await gatewayClient.get<SkuMapping[]>(
    `${BASE_PATH}/sku-mappings`,
    { params }
  )
  return data
}

export const getSkuMapping = async (mappingId: string) => {
  const { data } = await gatewayClient.get<SkuMapping>(
    `${BASE_PATH}/sku-mappings/${mappingId}`
  )
  return data
}

export const createSkuMapping = async (input: CreateSkuMappingInput) => {
  const { data } = await gatewayClient.post<SkuMapping>(
    `${BASE_PATH}/sku-mappings`,
    input
  )
  return data
}

export const updateSkuMapping = async (
  mappingId: string,
  input: UpdateSkuMappingInput
) => {
  const { data } = await gatewayClient.patch<SkuMapping>(
    `${BASE_PATH}/sku-mappings/${mappingId}`,
    input
  )
  return data
}

export const deleteSkuMapping = async (mappingId: string) => {
  const { data } = await gatewayClient.delete<{ deleted: boolean; id: string }>(
    `${BASE_PATH}/sku-mappings/${mappingId}`
  )
  return data
}

// ============================================================================
// 4. SYNC JOBS & DEAD-LETTER REPLAY
// ============================================================================

export const listSyncJobs = async (params?: {
  connectionId?: string
  status?: string
  jobType?: string
}) => {
  const { data } = await gatewayClient.get<SyncJob[]>(
    `${BASE_PATH}/sync-jobs`,
    { params }
  )
  return data
}

export const getSyncJob = async (jobId: string) => {
  const { data } = await gatewayClient.get<SyncJob>(
    `${BASE_PATH}/sync-jobs/${jobId}`
  )
  return data
}

export const retrySyncJob = async (
  jobId: string,
  input: RetrySyncJobInput = { executeImmediately: true }
) => {
  const { data } = await gatewayClient.post<SyncJob>(
    `${BASE_PATH}/sync-jobs/${jobId}/retry`,
    input
  )
  return data
}

// ============================================================================
// 5. SYNCHRONIZATION CONFLICTS
// ============================================================================

export const listSyncConflicts = async (params?: {
  connectionId?: string
  status?: string
  conflictType?: string
}) => {
  const { data } = await gatewayClient.get<SyncConflict[]>(
    `${BASE_PATH}/conflicts`,
    { params }
  )
  return data
}

export const getSyncConflict = async (conflictId: string) => {
  const { data } = await gatewayClient.get<SyncConflict>(
    `${BASE_PATH}/conflicts/${conflictId}`
  )
  return data
}

export const resolveSyncConflict = async (
  conflictId: string,
  input: ResolveSyncConflictInput
) => {
  const { data } = await gatewayClient.post<{
    conflict: SyncConflict
    retryResult: Record<string, unknown> | null
  }>(`${BASE_PATH}/conflicts/${conflictId}/resolve`, input)
  return data
}

export const retrySyncConflict = async (
  conflictId: string,
  input: RetrySyncConflictInput = {}
) => {
  const { data } = await gatewayClient.post<{
    conflict: SyncConflict
    retryResult: Record<string, unknown>
  }>(`${BASE_PATH}/conflicts/${conflictId}/retry`, input)
  return data
}

// ============================================================================
// 6. OPERATIONAL RECONCILIATION RUNS
// ============================================================================

export const listReconciliationRuns = async () => {
  const { data } = await gatewayClient.get<ReconciliationRun[]>(
    `${BASE_PATH}/reconciliation-runs`
  )
  return data
}

export const getReconciliationRun = async (runId: string) => {
  const { data } = await gatewayClient.get<ReconciliationRunDetail>(
    `${BASE_PATH}/reconciliation-runs/${runId}`
  )
  return data
}

export const executeReconciliationRun = async (
  input: TriggerReconciliationRunInput = {
    runType: "INCREMENTAL",
    autoRecoverSafeItems: true
  }
) => {
  const { data } = await gatewayClient.post<ReconciliationRunDetail>(
    `${BASE_PATH}/reconciliation-runs`,
    input
  )
  return data
}
