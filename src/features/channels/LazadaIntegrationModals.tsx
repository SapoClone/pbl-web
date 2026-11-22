import { useState } from "react"
import {
  Activity,
  Calculator,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Branch } from "@/api/platform/branches"
import type { InventoryWarehouse } from "@/api/inventory/warehouses"
import {
  buildMarketplaceWebhookUrl,
  extractOAuthCodeAndState,
  type ChannelConnection,
  type ChannelConnectionHealth,
  type CreateChannelConnectionInput,
  type MarketplaceProvider,
  type OAuthInitiatedResponse,
  type TriggerConnectionSyncInput
} from "@/api/integration"

export function LazadaConnectionModal({
  branches,
  warehouses,
  defaultProvider = "LAZADA",
  pending,
  error,
  onClose,
  onSubmit
}: {
  branches: Branch[]
  warehouses: InventoryWarehouse[]
  defaultProvider?: MarketplaceProvider
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (
    input: CreateChannelConnectionInput,
    initiateOAuthAfterCreate: boolean
  ) => Promise<void>
}) {
  const [provider, setProvider] = useState<MarketplaceProvider>(defaultProvider)
  const [authMode, setAuthMode] = useState<"oauth" | "sandbox_token">("oauth")
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "")
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? ""
  )
  const [shopName, setShopName] = useState("")
  const [externalShopId, setExternalShopId] = useState("")
  const [safetyStockBuffer, setSafetyStockBuffer] = useState("2")
  const [stockAllocationPercent, setStockAllocationPercent] = useState("100")
  const [partnerId, setPartnerId] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [localError, setLocalError] = useState("")

  const sampleAvailable = 50
  const bufferNum = Math.max(0, Number(safetyStockBuffer) || 0)
  const allocNum = Math.min(100, Math.max(0, Number(stockAllocationPercent) || 100))
  const simulatedPublishedQty = Math.max(
    0,
    Math.floor(((sampleAvailable - bufferNum) * allocNum) / 100)
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError("")
    if (!branchId) {
      setLocalError("Vui lòng chọn chi nhánh ghi nhận đơn hàng và trừ tồn kho.")
      return
    }
    if (
      provider === "SHOPEE" &&
      (!externalShopId.trim() || !shopName.trim() || !webhookSecret.trim())
    ) {
      setLocalError(
        "Kết nối Shopee yêu cầu nhập Mã Shop (Shop ID), Tên gian hàng và Khóa bảo mật Webhook."
      )
      return
    }
    if (authMode === "sandbox_token" && !accessToken.trim()) {
      setLocalError(
        "Vui lòng nhập Access Token của nhà bán hàng khi chọn kết nối bằng Token trực tiếp."
      )
      return
    }

    await onSubmit(
      {
        provider,
        branchId,
        ...(warehouseId ? { warehouseId } : {}),
        ...(externalShopId.trim()
          ? { externalShopId: externalShopId.trim() }
          : {}),
        ...(shopName.trim() ? { shopName: shopName.trim() } : {}),
        safetyStockBuffer: bufferNum,
        stockAllocationPercent: allocNum,
        ...(partnerId.trim() ? { partnerId: partnerId.trim() } : {}),
        ...(webhookSecret.trim()
          ? { webhookSecret: webhookSecret.trim() }
          : {}),
        ...(authMode === "sandbox_token" && accessToken.trim()
          ? { accessToken: accessToken.trim() }
          : {}),
        ...(authMode === "sandbox_token" && refreshToken.trim()
          ? { refreshToken: refreshToken.trim() }
          : {})
      },
      authMode === "oauth"
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lazada-connect-title"
    >
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f5ee] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#16866f]">
              <Sparkles size={13} /> Liên kết sàn thương mại điện tử
            </span>
            <h2
              id="lazada-connect-title"
              className="mt-2 text-xl font-semibold text-[#163d36]"
            >
              Kết nối gian hàng {provider === "LAZADA" ? "Lazada" : "Shopee"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Tự động đồng bộ đơn hàng, cập nhật tồn kho đa kênh theo thời gian
              thực và đối soát doanh thu tập trung.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(["LAZADA", "SHOPEE"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setProvider(item)}
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                  provider === item
                    ? "border-[#16866f] bg-[#f2fbf6] text-[#163d36] shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {item === "LAZADA"
                      ? "Sàn TMĐT Lazada"
                      : "Sàn TMĐT Shopee"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {item === "LAZADA"
                      ? "Lazada Seller Center (Việt Nam)"
                      : "Shopee Kênh Người Bán"}
                  </p>
                </div>
                <span
                  className={`h-3 w-3 rounded-full ${
                    provider === item ? "bg-[#16866f]" : "bg-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-xs font-semibold text-slate-600">
              Phương thức liên kết tài khoản nhà bán hàng
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAuthMode("oauth")}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                  authMode === "oauth"
                    ? "border-[#16866f] bg-white font-semibold text-[#163d36] shadow-sm"
                    : "border-transparent text-slate-600 hover:bg-white/60"
                }`}
              >
                1. Đăng nhập & Ủy quyền qua Sàn (Khuyên dùng)
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  Chuyển tới cổng Lazada Seller Center để cấp quyền tự động
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("sandbox_token")}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                  authMode === "sandbox_token"
                    ? "border-[#16866f] bg-white font-semibold text-[#163d36] shadow-sm"
                    : "border-transparent text-slate-600 hover:bg-white/60"
                }`}
              >
                2. Kết nối bằng Token có sẵn (Sandbox / In-house)
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                  Dành cho môi trường thử nghiệm hoặc ứng dụng nội bộ
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Chi nhánh ghi nhận doanh thu & đơn hàng *
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#163d36] outline-none focus:border-[#16866f]"
              >
                <option value="">Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Kho xuất hàng & đồng bộ tồn kho
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#163d36] outline-none focus:border-[#16866f]"
              >
                <option value="">Tổng hợp tất cả kho thuộc chi nhánh</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Tên gian hàng trên hệ thống{" "}
              {provider === "LAZADA" && authMode === "oauth"
                ? "(Tự động lấy từ Lazada nếu để trống)"
                : "*"}
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="VD: Mộc Store Official Lazada"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Mã gian hàng / Seller ID{" "}
              {provider === "LAZADA" && authMode === "oauth"
                ? "(Tự nhận diện sau khi đăng nhập)"
                : "*"}
              <input
                value={externalShopId}
                onChange={(e) => setExternalShopId(e.target.value)}
                placeholder="VD: VN10928374 hoặc 200192837"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>
          </div>

          <div className="rounded-xl border border-[#cce8dc] bg-[#f2fbf6]/70 p-3.5">
            <p className="text-xs font-semibold text-[#163d36]">
              Quy tắc phân bổ & bảo vệ tồn kho đa kênh
            </p>
            <div className="mt-2.5 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-700">
                Tồn kho dự phòng giữ lại (Chống bán vượt tồn)
                <input
                  type="number"
                  min={0}
                  value={safetyStockBuffer}
                  onChange={(e) => setSafetyStockBuffer(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Tỷ lệ đẩy tồn kho lên sàn (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={stockAllocationPercent}
                  onChange={(e) => setStockAllocationPercent(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
                />
              </label>
            </div>
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-[#147853]">
              <Calculator size={14} className="shrink-0 text-[#16866f]" />
              <span>
                <strong>Mô phỏng thực tế:</strong> Khi kho còn{" "}
                <strong>{sampleAvailable} SP</strong> khả dụng → Hệ thống sẽ đẩy{" "}
                <strong>{simulatedPublishedQty} SP</strong> lên {provider} (giữ
                lại {bufferNum} SP dự phòng bán tại quầy).
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              App Key / Partner ID riêng (Tùy chọn)
              <input
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="Để trống để dùng cấu hình mặc định của hệ thống"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Khóa bảo mật Webhook / App Secret{" "}
              {provider === "SHOPEE" ? "*" : "(Tùy chọn)"}
              <input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Để trống để dùng khóa mặc định của hệ thống"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>
          </div>

          {authMode === "sandbox_token" && (
            <div className="grid gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-700">
                Seller Access Token *
                <input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Dán access_token từ Lazada Open Platform"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Seller Refresh Token
                <input
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Dán refresh_token để tự động gia hạn"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
                />
              </label>
            </div>
          )}

          {(localError || error) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {localError || error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
            >
              <KeyRound size={15} />
              {pending
                ? "Đang khởi tạo..."
                : authMode === "oauth"
                  ? "Tiếp tục tới Cấp quyền Gian hàng"
                  : "Hoàn tất Kết nối Gian hàng"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export function LazadaOAuthModal({
  connection,
  oauthSession,
  pending,
  error,
  onClose,
  onRefreshUrl,
  onExchangeCode
}: {
  connection: ChannelConnection
  oauthSession: OAuthInitiatedResponse | null
  pending: boolean
  error?: string
  onClose: () => void
  onRefreshUrl: () => Promise<void>
  onExchangeCode: (params: {
    authorizationCode: string
    stateNonce?: string
    externalShopId?: string
  }) => Promise<void>
}) {
  const [rawCodeOrUrl, setRawCodeOrUrl] = useState("")
  const [externalShopId, setExternalShopId] = useState(
    connection.externalShopId.startsWith("pending_")
      ? ""
      : connection.externalShopId
  )
  const [copied, setCopied] = useState(false)
  const [localError, setLocalError] = useState("")

  const parsed = extractOAuthCodeAndState(rawCodeOrUrl)

  const handleCopy = async () => {
    if (!oauthSession?.authorizationUrl) return
    await navigator.clipboard?.writeText(oauthSession.authorizationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExchange = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError("")
    if (!parsed.code || parsed.code.length < 4) {
      setLocalError(
        "Vui lòng dán mã Ủy quyền (Authorization Code) hoặc đường dẫn Callback URL trả về từ Lazada."
      )
      return
    }
    await onExchangeCode({
      authorizationCode: parsed.code,
      stateNonce: parsed.state ?? oauthSession?.stateNonce,
      ...(externalShopId.trim()
        ? { externalShopId: externalShopId.trim() }
        : {})
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lazada-oauth-title"
    >
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              <ShieldCheck size={13} /> Cấp quyền Lazada Seller Center
            </span>
            <h2
              id="lazada-oauth-title"
              className="mt-2 text-xl font-semibold text-[#163d36]"
            >
              Ủy quyền đồng bộ cho {connection.shopName} ({connection.code})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Cho phép OmniRetail tự động tải đơn hàng, đồng bộ danh mục sản
              phẩm và cập nhật tồn kho sang Lazada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#147853]">
                Bước 1: Đăng nhập Lazada Seller Center và nhấn &ldquo;Ủy
                quyền&rdquo; (Authorize)
              </p>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#16866f]">
                Hiệu lực phiên:{" "}
                {Math.round((oauthSession?.expiresInSeconds ?? 600) / 60)} phút
              </span>
            </div>

            {oauthSession ? (
              <>
                <div className="mt-3 break-all rounded-lg border border-[#d6eee3] bg-white p-2.5 font-mono text-[11px] text-slate-600">
                  {oauthSession.authorizationUrl}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      window.open(
                        oauthSession.authorizationUrl,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
                  >
                    <ExternalLink size={15} /> Mở cổng Ủy quyền Lazada
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-1.5"
                  >
                    <Copy size={14} />{" "}
                    {copied ? "Đã sao chép đường dẫn" : "Sao chép đường dẫn"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={onRefreshUrl}
                    className="gap-1.5 text-slate-600"
                  >
                    <RefreshCw size={14} /> Tạo đường dẫn mới
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  Chưa có đường dẫn cấp quyền hoặc phiên đã hết hạn.
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={onRefreshUrl}
                  className="bg-[#16866f] text-white"
                >
                  Lấy đường dẫn Ủy quyền
                </Button>
              </div>
            )}
          </div>

          <form
            onSubmit={handleExchange}
            className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div>
              <p className="text-xs font-semibold text-[#163d36]">
                Bước 2: Hoàn tất liên kết (Tự động hoặc dán mã xác nhận)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Trên môi trường chính thức, Lazada sẽ tự động chuyển hướng về
                trang này và kích hoạt gian hàng. Nếu bạn đang thử nghiệm trên
                máy cá nhân hoặc Lazada Sandbox, hãy dán{" "}
                <strong>Mã ủy quyền (code)</strong> hoặc{" "}
                <strong>toàn bộ đường dẫn Callback URL</strong> vào ô bên dưới:
              </p>
            </div>

            <label className="block text-xs font-medium text-slate-700">
              Mã ủy quyền Lazada (`code`) hoặc đường dẫn Callback URL *
              <input
                value={rawCodeOrUrl}
                onChange={(e) => setRawCodeOrUrl(e.target.value)}
                placeholder="VD: 0_128491_xYzAbC123456 hoặc https://.../lazada/callback?code=0_128491_xYz&state=..."
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>

            {parsed.code && (
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-600 sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-slate-700">
                    Mã code nhận diện:{" "}
                  </span>
                  <code className="text-[#16866f]">{parsed.code}</code>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">
                    Chữ ký bảo mật State:{" "}
                  </span>
                  <code className="truncate">
                    {(
                      parsed.state ??
                      oauthSession?.stateNonce ??
                      "Tự động"
                    ).slice(0, 28)}
                    ...
                  </code>
                </div>
              </div>
            )}

            <label className="block text-xs font-medium text-slate-700">
              Mã gian hàng Lazada dự phòng (Tùy chọn khi chạy chế độ giả lập)
              <input
                value={externalShopId}
                onChange={(e) => setExternalShopId(e.target.value)}
                placeholder="VD: VN10928374 (Để trống nếu xác thực từ Lazada thật)"
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>

            {(localError || error) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {localError || error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>
                Đóng
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
              >
                <CheckCircle2 size={15} />
                {pending
                  ? "Đang kích hoạt kết nối..."
                  : "Xác nhận & Kích hoạt Gian hàng"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export function ConnectionHealthModal({
  connection,
  health,
  loading,
  onClose,
  onRefreshToken
}: {
  connection: ChannelConnection
  health: ChannelConnectionHealth | null
  loading: boolean
  onClose: () => void
  onRefreshToken: () => Promise<void>
}) {
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const webhookUrl = buildMarketplaceWebhookUrl(
    connection.provider,
    connection.connectionKey
  )

  const copyWebhook = async () => {
    await navigator.clipboard?.writeText(webhookUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  const circuitLabel: Record<string, string> = {
    CLOSED: "Bình thường (Đang mở luồng đồng bộ)",
    HALF_OPEN: "Đang thử kết nối lại",
    OPEN: "Tạm ngắt bảo vệ (Sàn quá tải / Lỗi liên tiếp)"
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f5ee] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#16866f]">
              <Activity size={13} /> Trạng thái Kết nối & Cấu hình Webhook
            </span>
            <h2 className="mt-2 text-xl font-semibold text-[#163d36]">
              {connection.shopName} (Mã gian hàng: {connection.externalShopId})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {loading || !health ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Đang kiểm tra trạng thái kết nối tới sàn {connection.provider}...
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-3.5">
                <span className="text-[11px] text-slate-500">
                  Tình trạng vận hành
                </span>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    health.healthy ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {health.healthy
                    ? "Hoạt động ổn định"
                    : "Cần kiểm tra kết nối"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5">
                <span className="text-[11px] text-slate-500">
                  Trạng thái đường truyền
                </span>
                <p className="mt-1 text-sm font-semibold text-[#163d36]">
                  {circuitLabel[health.circuitBreaker.state] ??
                    health.circuitBreaker.state}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5">
                <span className="text-[11px] text-slate-500">
                  Phiên ủy quyền (Access Token)
                </span>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    health.tokenStatus.hasAccessToken &&
                    !health.tokenStatus.isExpired
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {!health.tokenStatus.hasAccessToken
                    ? "Chưa cấp quyền"
                    : health.tokenStatus.isExpired
                      ? "Đã hết hạn"
                      : `Đang hiệu lực (Lần cấp #${connection.credentialSummary.credentialVersion})`}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#163d36]">
                  Địa chỉ nhận thông báo đơn hàng tức thời (Webhook Push URL)
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyWebhook}
                  className="h-7 gap-1 text-xs"
                >
                  <Copy size={12} />{" "}
                  {copiedWebhook ? "Đã sao chép" : "Sao chép địa chỉ"}
                </Button>
              </div>
              <p className="mt-1.5 break-all rounded-lg border border-slate-200 bg-white p-2 font-mono text-[11px] text-slate-600">
                {webhookUrl}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Dán đường dẫn này vào mục <strong>Push Mechanism</strong> trên{" "}
                {connection.provider} Open Platform để nhận đơn hàng mới và cập
                nhật trạng thái giao vận theo thời gian thực.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-[#163d36]">
                Tính năng đồng bộ được hỗ trợ trên gian hàng
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {[
                  {
                    label: "Ủy quyền OAuth 2.0",
                    ok: health.capabilities.supportsOAuth
                  },
                  {
                    label: "Tự động gia hạn Token",
                    ok: health.capabilities.supportsTokenRefresh
                  },
                  {
                    label: "Nhận đơn tức thời (Webhook)",
                    ok: health.capabilities.supportsWebhookSignatureVerification
                  },
                  {
                    label: "Quét đơn hàng định kỳ",
                    ok: health.capabilities.supportsIncrementalOrderPolling
                  },
                  {
                    label: "Cập nhật tồn kho tự động",
                    ok: health.capabilities.supportsInventoryPublication
                  },
                  {
                    label: "Tải & Khớp danh mục SP",
                    ok: health.capabilities.supportsProductListingDiscovery
                  }
                ].map((cap) => (
                  <div
                    key={cap.label}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-slate-700"
                  >
                    <CheckCircle2
                      size={14}
                      className={
                        cap.ok ? "text-emerald-600" : "text-slate-300"
                      }
                    />
                    <span>{cap.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-500">
                Hạn dùng phiên kết nối:{" "}
                <strong className="text-slate-700">
                  {health.tokenStatus.accessTokenExpiresAt
                    ? new Date(
                        health.tokenStatus.accessTokenExpiresAt
                      ).toLocaleString("vi-VN")
                    : "—"}
                </strong>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRefreshToken}
                  className="gap-1.5"
                >
                  <RefreshCw size={14} /> Gia hạn phiên kết nối ngay
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="bg-[#16866f] text-white"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export function LazadaOrderSyncModal({
  connection,
  pending,
  error,
  onClose,
  onSubmit
}: {
  connection: ChannelConnection
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (input: TriggerConnectionSyncInput) => Promise<void>
}) {
  const [mode, setMode] = useState<"window" | "single">("window")
  const [externalOrderId, setExternalOrderId] = useState("")
  const [windowHours, setWindowHours] = useState("24")
  const [executeImmediately, setExecuteImmediately] = useState(true)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (mode === "single") {
      await onSubmit({
        externalOrderId: externalOrderId.trim(),
        executeImmediately
      })
      return
    }
    const now = new Date()
    const hours = Math.max(1, Number(windowHours) || 24)
    const start = new Date(now.getTime() - hours * 3600 * 1000)
    await onSubmit({
      windowStart: start.toISOString(),
      windowEnd: now.toISOString(),
      executeImmediately
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163d36]/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#16866f]">
              Tải & Đồng bộ đơn hàng từ sàn {connection.provider}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#163d36]">
              {connection.shopName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("window")}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                mode === "window"
                  ? "bg-white text-[#163d36] shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Tải theo khoảng thời gian
            </button>
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                mode === "single"
                  ? "bg-white text-[#163d36] shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Tải đích danh theo Mã đơn sàn
            </button>
          </div>

          {mode === "window" ? (
            <label className="block text-xs font-medium text-slate-700">
              Khoảng thời gian phát sinh / cập nhật đơn hàng trên sàn
              <select
                value={windowHours}
                onChange={(e) => setWindowHours(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              >
                <option value="6">6 giờ gần nhất</option>
                <option value="24">24 giờ gần nhất (Khuyên dùng)</option>
                <option value="72">3 ngày gần nhất</option>
                <option value="168">7 ngày gần nhất</option>
                <option value="720">30 ngày gần nhất</option>
              </select>
            </label>
          ) : (
            <label className="block text-xs font-medium text-slate-700">
              Mã đơn hàng trên {connection.provider} *
              <input
                required
                value={externalOrderId}
                onChange={(e) => setExternalOrderId(e.target.value)}
                placeholder="VD: 50998877665544"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#16866f]"
              />
            </label>
          )}

          <div className="rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-3 text-xs leading-5 text-[#147853]">
            <strong>Cơ chế bảo vệ tồn kho tự động:</strong> Hệ thống chỉ giữ tồn
            kho đối với các đơn hàng mới đang chờ đóng gói (
            <em>Sẵn sàng giao / Ready to ship</em>). Các đơn hàng lịch sử đã
            hoàn tất hoặc đã hủy sẽ chỉ ghi nhận doanh thu/lịch sử mà không trừ
            lặp tồn kho hiện tại.
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={executeImmediately}
              onChange={(e) => setExecuteImmediately(e.target.checked)}
              className="accent-[#16866f]"
            />
            Đồng bộ và cập nhật danh sách đơn hàng ngay lập tức
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
            >
              <RefreshCw size={15} />
              {pending ? "Đang tải đơn hàng..." : "Bắt đầu đồng bộ đơn hàng"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
