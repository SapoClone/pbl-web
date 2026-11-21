import type { CatalogVariant } from "@/api/catalog/variants"
import type { InventoryWarehouse } from "@/api/inventory/warehouses"
import type { Branch } from "@/api/platform/branches"
import type {
  ChannelConnection,
  ChannelConnectionHealth,
  ReconciliationRun,
  ReconciliationRunDetail,
  SkuMapping,
  SyncConflict,
  SyncJob
} from "@/api/integration"

export const DEMO_BRANCHES: Branch[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Chi nhánh Trung tâm Quận 1",
    code: "CN-Q1",
    address: "128 Nguyễn Huệ, Quận 1, TP.HCM",
    phone: "0909123456",
    isWarehouse: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00.000Z"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Chi nhánh Cầu Giấy Hà Nội",
    code: "CN-HN",
    address: "88 Xuân Thủy, Cầu Giấy, Hà Nội",
    phone: "0909888999",
    isWarehouse: true,
    status: "active",
    createdAt: "2026-10-02T08:00:00.000Z"
  }
]

export const DEMO_WAREHOUSES: InventoryWarehouse[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    branchId: "11111111-1111-4111-8111-111111111111",
    code: "WH-HCM-01",
    name: "Kho Tổng Quận 1 (Fulfillment)",
    kind: "CENTRAL",
    status: "ACTIVE",
    isDefault: true
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    branchId: "22222222-2222-4222-8222-222222222222",
    code: "WH-HN-01",
    name: "Kho Chi nhánh Cầu Giấy",
    kind: "BRANCH",
    status: "ACTIVE",
    isDefault: false
  }
]

export const DEMO_VARIANTS: CatalogVariant[] = [
  {
    variantId: "55555555-5555-4555-8555-555555555551",
    productId: "66666666-6666-4666-8666-666666666661",
    name: "Bình giữ nhiệt Terra 500ml",
    label: "Xanh Rừng",
    skuCode: "TER-500-GRN",
    barcode: "8938501234001",
    price: 420000,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555552",
    productId: "66666666-6666-4666-8666-666666666662",
    name: "Túi tote canvas Daily",
    label: "Kem Tự Nhiên",
    skuCode: "TOT-DAILY-01",
    barcode: "8938501234002",
    price: 185000,
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555553",
    productId: "66666666-6666-4666-8666-666666666663",
    name: "Cốc gốm thủ công Mộc",
    label: "Men Tro",
    skuCode: "CER-MOC-08",
    barcode: "8938501234003",
    price: 260000,
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=600&q=80",
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555554",
    productId: "66666666-6666-4666-8666-666666666664",
    name: "Trà Ô Long Thượng Hạng Mộc Châu",
    label: "Hộp Thiếc 250g",
    skuCode: "TEA-OOLONG-250",
    barcode: "8938501234004",
    price: 285000,
    imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=600&q=80",
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555555",
    productId: "66666666-6666-4666-8666-666666666665",
    name: "Khay trà tre ép thủ công",
    label: "Cỡ L",
    skuCode: "BAMBOO-TRAY-L",
    barcode: "8938501234005",
    price: 360000,
    imageUrl: "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=600&q=80",
    status: "active"
  }
]

export const DEMO_CONNECTIONS: ChannelConnection[] = [
  {
    id: "77777777-7777-4777-8777-777777777771",
    tenantId: "00000000-0000-4000-8000-000000000001",
    code: "CON-000001",
    provider: "LAZADA",
    connectionKey: "ck_lazada_9f8e7d6c5b4a3f2e1d0c9b8a",
    externalShopId: "VN10948271",
    shopName: "Mộc Store Official Lazada",
    branchId: "11111111-1111-4111-8111-111111111111",
    warehouseId: "33333333-3333-4333-8333-333333333333",
    status: "CONNECTED",
    safetyStockBuffer: 2,
    stockAllocationPercent: 100,
    autoSyncInventory: true,
    lastSyncAt: "2026-11-16T14:45:00.000Z",
    lastOrderSyncAt: "2026-11-16T14:45:00.000Z",
    lastInventorySyncAt: "2026-11-16T14:30:00.000Z",
    lastErrorCode: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    credentialSummary: {
      credentialVersion: 3,
      hasAccessToken: true,
      hasRefreshToken: true,
      accessTokenExpiresAt: "2026-11-23T14:45:00.000Z",
      refreshTokenExpiresAt: "2026-12-16T14:45:00.000Z",
      lastRefreshedAt: "2026-11-16T14:45:00.000Z"
    },
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-16T14:45:00.000Z"
  }
]

export const DEMO_SKU_MAPPINGS: SkuMapping[] = [
  {
    id: "88888888-8888-4888-8888-888888888881",
    tenantId: "00000000-0000-4000-8000-000000000001",
    connectionId: "77777777-7777-4777-8777-777777777771",
    provider: "LAZADA",
    externalItemId: "13504402059",
    externalSkuId: "117553898643",
    externalSkuCode: "TER-500-GRN",
    externalProductName: "Bình giữ nhiệt Terra 500ml Chính Hãng",
    internalProductId: "66666666-6666-4666-8666-666666666661",
    internalVariantId: "55555555-5555-4555-8555-555555555551",
    internalSkuCode: "TER-500-GRN",
    mappingMode: "EXACT_SKU_AUTO",
    mappingVersion: 1,
    status: "ACTIVE",
    listingSyncStatus: "SYNCED",
    externalPrice: 420000,
    lastSyncedAt: "2026-11-16T14:30:00.000Z",
    createdBy: "demo-operator",
    updatedBy: "demo-operator",
    createdAt: "2026-11-05T09:00:00.000Z",
    updatedAt: "2026-11-16T14:30:00.000Z"
  },
  {
    id: "88888888-8888-4888-8888-888888888882",
    tenantId: "00000000-0000-4000-8000-000000000001",
    connectionId: "77777777-7777-4777-8777-777777777771",
    provider: "LAZADA",
    externalItemId: "13504409981",
    externalSkuId: "117553911220",
    externalSkuCode: "TOT-DAILY-01",
    externalProductName: "Túi tote canvas Daily chống thấm nhẹ",
    internalProductId: "66666666-6666-4666-8666-666666666662",
    internalVariantId: "55555555-5555-4555-8555-555555555552",
    internalSkuCode: "TOT-DAILY-01",
    mappingMode: "MANUAL",
    mappingVersion: 2,
    status: "ACTIVE",
    listingSyncStatus: "SYNCED",
    externalPrice: 185000,
    lastSyncedAt: "2026-11-16T14:30:00.000Z",
    createdBy: "demo-operator",
    updatedBy: "demo-operator",
    createdAt: "2026-11-05T09:10:00.000Z",
    updatedAt: "2026-11-16T14:30:00.000Z"
  }
]

export const DEMO_SYNC_JOBS: SyncJob[] = [
  {
    id: "99999999-9999-4999-8999-999999999991",
    tenantId: "00000000-0000-4000-8000-000000000001",
    code: "JOB-000018",
    connectionId: "77777777-7777-4777-8777-777777777771",
    provider: "LAZADA",
    jobType: "ORDER_POLL",
    idempotencyKey: "manual-ord-sync:77777777-7777-4777-8777-777777777771:demo1",
    status: "COMPLETED",
    priority: 10,
    payload: {
      windowStart: "2026-11-15T14:45:00.000Z",
      windowEnd: "2026-11-16T14:45:00.000Z"
    },
    resultSummary: {
      polledCount: 6,
      importedCount: 4,
      replayedCount: 2,
      conflictCount: 0
    },
    attemptCount: 1,
    maxAttempts: 4,
    nextRetryAt: "2026-11-16T14:45:00.000Z",
    leaseOwner: null,
    leaseExpiresAt: null,
    errorCategory: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    correlationId: "corr-lazada-poll-01",
    startedAt: "2026-11-16T14:45:01.000Z",
    completedAt: "2026-11-16T14:45:03.000Z",
    createdAt: "2026-11-16T14:45:00.000Z",
    updatedAt: "2026-11-16T14:45:03.000Z"
  },
  {
    id: "99999999-9999-4999-8999-999999999992",
    tenantId: "00000000-0000-4000-8000-000000000001",
    code: "JOB-000017",
    connectionId: "77777777-7777-4777-8777-777777777771",
    provider: "LAZADA",
    jobType: "INVENTORY_PUBLICATION",
    idempotencyKey: "manual-inv-sync:77777777-7777-4777-8777-777777777771:demo2",
    status: "COMPLETED",
    priority: 10,
    payload: {},
    resultSummary: {
      totalMappings: 2,
      publishedCount: 2,
      skippedStaleCount: 0
    },
    attemptCount: 1,
    maxAttempts: 4,
    nextRetryAt: "2026-11-16T14:30:00.000Z",
    leaseOwner: null,
    leaseExpiresAt: null,
    errorCategory: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    correlationId: "corr-lazada-inv-01",
    startedAt: "2026-11-16T14:30:01.000Z",
    completedAt: "2026-11-16T14:30:02.000Z",
    createdAt: "2026-11-16T14:30:00.000Z",
    updatedAt: "2026-11-16T14:30:02.000Z"
  }
]

export const DEMO_CONFLICTS: SyncConflict[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    tenantId: "00000000-0000-4000-8000-000000000001",
    code: "CNF-000004",
    connectionId: "77777777-7777-4777-8777-777777777771",
    provider: "LAZADA",
    conflictType: "SKU_UNMAPPED",
    severity: "HIGH",
    status: "OPEN",
    externalOrderId: "50887766554433",
    externalItemId: "13504498877",
    externalSkuId: "117559900112",
    channelOrderRefId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    syncJobId: "99999999-9999-4999-8999-999999999991",
    details: {
      externalSkuCode: "CER-MOC-08-LZD",
      buyerName: "Lê Hoàng Bách",
      reason: "External Lazada SKU (13504498877 / 117559900112) is not mapped"
    },
    resolutionAction: null,
    resolutionNotes: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "2026-11-16T14:10:00.000Z",
    updatedAt: "2026-11-16T14:10:00.000Z"
  }
]

export const DEMO_RECONCILIATION_RUNS: ReconciliationRun[] = [
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    tenantId: "00000000-0000-4000-8000-000000000001",
    code: "REC-000003",
    connectionId: "77777777-7777-4777-8777-777777777771",
    provider: "LAZADA",
    runType: "INCREMENTAL",
    status: "COMPLETED",
    windowStart: "2026-11-15T14:00:00.000Z",
    windowEnd: "2026-11-16T14:00:00.000Z",
    recordsExamined: 14,
    matchedCount: 12,
    mismatchCount: 0,
    autoRecoveredCount: 2,
    startedAt: "2026-11-16T14:00:00.000Z",
    completedAt: "2026-11-16T14:00:04.000Z",
    triggeredBy: "demo-operator",
    createdAt: "2026-11-16T14:00:00.000Z"
  }
]

export function buildDemoHealth(
  conn: ChannelConnection
): ChannelConnectionHealth {
  return {
    connectionId: conn.id,
    provider: conn.provider,
    externalShopId: conn.externalShopId,
    status: conn.status,
    healthy: conn.status === "CONNECTED",
    circuitBreaker: {
      state: "CLOSED",
      consecutiveFailures: conn.consecutiveFailures,
      openedAt: null,
      nextAttemptAt: null
    },
    tokenStatus: {
      hasAccessToken: conn.credentialSummary.hasAccessToken,
      accessTokenExpiresAt: conn.credentialSummary.accessTokenExpiresAt,
      isExpired: false
    },
    lastSyncAt: conn.lastSyncAt,
    lastOrderSyncAt: conn.lastOrderSyncAt,
    lastInventorySyncAt: conn.lastInventorySyncAt,
    consecutiveFailures: conn.consecutiveFailures,
    lastErrorCode: conn.lastErrorCode,
    capabilities: {
      provider: conn.provider,
      apiVersion: "rest-v2",
      supportsOAuth: true,
      supportsTokenRefresh: true,
      supportsWebhookSignatureVerification: true,
      supportsIncrementalOrderPolling: true,
      supportsBatchOrderFetch: true,
      supportsInventoryPublication: true,
      supportsProductListingDiscovery: true,
      liveCredentialsConfigured: true
    }
  }
}

export function buildDemoReconciliationDetail(
  run: ReconciliationRun
): ReconciliationRunDetail {
  return {
    run,
    issues: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
        tenantId: run.tenantId,
        runId: run.id,
        connectionId: run.connectionId,
        provider: run.provider,
        issueType: "MISSED_WEBHOOK_ORDER_RECOVERED",
        severity: "MEDIUM",
        externalRef: "VN10948271",
        internalRef: run.connectionId,
        expectedState: { importedViaWebhook: true },
        observedState: { recoveredOrderCount: 2 },
        status: "RESOLVED",
        resolutionNotes:
          "Auto-imported 2 missed external Lazada order(s) via incremental polling",
        resolvedBy: "auto-reconciler",
        resolvedAt: run.completedAt,
        relatedSyncJobId: null,
        createdAt: run.startedAt,
        updatedAt: run.completedAt ?? run.startedAt
      }
    ]
  }
}
