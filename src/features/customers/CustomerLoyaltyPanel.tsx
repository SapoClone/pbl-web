import { type FormEvent, useEffect, useMemo, useState } from "react"
import {
  Award,
  Calculator,
  Coins,
  Crown,
  Gift,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedSwitch } from "@/components/ui/micro-ux"
import { useToast } from "@/components/ui/toast"
import {
  createMembershipTier,
  patchLoyaltySettings,
  reconcileLoyaltyProgram,
  updateMembershipTier,
  type LoyaltySettingsConfig,
  type MembershipTierItem
} from "@/api/customer/crm"

type TierDraft = {
  code: string
  name: string
  minPoints: string
  discountRate: string
  freeShipping: boolean
  prioritySupport: boolean
  birthdayVoucherVnd: string
  note: string
}

const emptyTierDraft: TierDraft = {
  code: "",
  name: "",
  minPoints: "500",
  discountRate: "3",
  freeShipping: false,
  prioritySupport: false,
  birthdayVoucherVnd: "50000",
  note: ""
}

const inputCls =
  "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

export function CustomerLoyaltyPanel({
  isDemo,
  tiers,
  settings,
  onTiersChange,
  onSettingsChange,
  onRefresh
}: {
  isDemo: boolean
  tiers: MembershipTierItem[]
  settings: LoyaltySettingsConfig
  onTiersChange: (
    updater: (prev: MembershipTierItem[]) => MembershipTierItem[]
  ) => void
  onSettingsChange: (next: LoyaltySettingsConfig) => void
  onRefresh: () => Promise<void>
}) {
  const { toast } = useToast()

  // Settings form state
  const [enabled, setEnabled] = useState(settings.enabled)
  const [earnAmount, setEarnAmount] = useState(
    String(settings.earnAmountPerPoint || 10000)
  )
  const [redeemValue, setRedeemValue] = useState(
    String(settings.redeemValuePerPoint || 1000)
  )
  const [expireMonths, setExpireMonths] = useState(
    settings.pointsExpireMonths === null
      ? ""
      : String(settings.pointsExpireMonths)
  )
  const [minRedeem, setMinRedeem] = useState(
    String(settings.minRedeemPoints ?? 10)
  )
  const [maxRedeem, setMaxRedeem] = useState(
    settings.maxRedeemPointsPerOrder === null
      ? ""
      : String(settings.maxRedeemPointsPerOrder)
  )
  const [savingSettings, setSavingSettings] = useState(false)
  const [reconciling, setReconciling] = useState(false)

  useEffect(() => {
    setEnabled(settings.enabled)
    setEarnAmount(String(settings.earnAmountPerPoint || 10000))
    setRedeemValue(String(settings.redeemValuePerPoint || 1000))
    setExpireMonths(
      settings.pointsExpireMonths === null
        ? ""
        : String(settings.pointsExpireMonths)
    )
    setMinRedeem(String(settings.minRedeemPoints ?? 10))
    setMaxRedeem(
      settings.maxRedeemPointsPerOrder === null
        ? ""
        : String(settings.maxRedeemPointsPerOrder)
    )
  }, [settings])

  // Interactive Conversion Simulator state
  const [simOrderVnd, setSimOrderVnd] = useState("850000")
  const [simRedeemPts, setSimRedeemPts] = useState("100")

  // Tier Modal state
  const [tierModalOpen, setTierModalOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<MembershipTierItem | null>(
    null
  )
  const [tierDraft, setTierDraft] = useState<TierDraft>(emptyTierDraft)
  const [savingTier, setSavingTier] = useState(false)
  const [tierError, setTierError] = useState("")

  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.minPoints - b.minPoints),
    [tiers]
  )

  const simulation = useMemo(() => {
    const orderAmt = Math.max(0, Number(simOrderVnd) || 0)
    const earnUnit = Math.max(1, Number(earnAmount) || 10000)
    const redeemUnit = Math.max(1, Number(redeemValue) || 1000)
    const minPts = Math.max(0, Number(minRedeem) || 0)
    const maxPts = maxRedeem.trim() ? Math.max(0, Number(maxRedeem) || 0) : null

    const rawReqPts = Math.max(0, Math.floor(Number(simRedeemPts) || 0))
    const cappedPts = maxPts !== null ? Math.min(rawReqPts, maxPts) : rawReqPts
    const eligibleToRedeem = enabled && cappedPts >= minPts
    const discountVnd = eligibleToRedeem
      ? Math.min(orderAmt, cappedPts * redeemUnit)
      : 0
    const netPayable = Math.max(0, orderAmt - discountVnd)
    const earnedPoints = enabled ? Math.floor(netPayable / earnUnit) : 0
    const cashbackPct =
      earnUnit > 0 ? ((redeemUnit / earnUnit) * 100).toFixed(1) : "0.0"

    return {
      orderAmt,
      cappedPts,
      eligibleToRedeem,
      discountVnd,
      netPayable,
      earnedPoints,
      cashbackPct
    }
  }, [
    simOrderVnd,
    simRedeemPts,
    earnAmount,
    redeemValue,
    minRedeem,
    maxRedeem,
    enabled
  ])

  const handleSaveSettings = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const payload = {
      enabled,
      earnAmountPerPoint: Math.max(100, Number(earnAmount) || 10000),
      redeemValuePerPoint: Math.max(10, Number(redeemValue) || 1000),
      pointsExpireMonths: expireMonths.trim()
        ? Math.max(1, Math.round(Number(expireMonths)))
        : null,
      minRedeemPoints: Math.max(0, Math.round(Number(minRedeem) || 0)),
      maxRedeemPointsPerOrder: maxRedeem.trim()
        ? Math.max(1, Math.round(Number(maxRedeem)))
        : null
    }

    setSavingSettings(true)
    try {
      if (!isDemo) {
        const updated = await patchLoyaltySettings(payload)
        onSettingsChange(updated)
        await onRefresh()
      } else {
        onSettingsChange({ ...settings, ...payload })
      }
      toast({
        title: "Đã lưu cấu hình Tích điểm & Đổi thưởng",
        description: `Tỷ lệ tích: ${formatVnd(payload.earnAmountPerPoint)} = 1 điểm · 1 điểm đổi ${formatVnd(payload.redeemValuePerPoint)}.`,
        variant: "success"
      })
    } catch {
      toast({
        title: "Không thể lưu cấu hình tích điểm",
        description: "Vui lòng kiểm tra lại giá trị quy đổi hợp lệ.",
        variant: "error"
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleReconcile = async () => {
    setReconciling(true)
    try {
      if (!isDemo) {
        const res = await reconcileLoyaltyProgram()
        toast({
          title: "Đối soát sổ cái điểm hoàn tất",
          description: `Đã kiểm tra ${res.accountsChecked ?? "toàn bộ"} ví điểm và giải phóng ${res.expiredHolds ?? 0} phiên giữ điểm quá hạn.`,
          variant: "success"
        })
      } else {
        toast({
          title: "Đối soát sổ cái điểm (Demo)",
          description:
            "100% số dư ví điểm khớp với sổ cái bất biến (0 chênh lệch).",
          variant: "success"
        })
      }
    } catch {
      toast({
        title: "Không thể chạy đối soát ngay lúc này",
        variant: "error"
      })
    } finally {
      setReconciling(false)
    }
  }

  const openCreateTier = () => {
    setEditingTier(null)
    setTierDraft(emptyTierDraft)
    setTierError("")
    setTierModalOpen(true)
  }

  const openEditTier = (tier: MembershipTierItem) => {
    setEditingTier(tier)
    const b = tier.benefitsJson ?? {}
    setTierDraft({
      code: tier.code,
      name: tier.name,
      minPoints: String(tier.minPoints),
      discountRate: String(Number(tier.discountRate ?? 0)),
      freeShipping: Boolean(b.freeShipping),
      prioritySupport: Boolean(b.prioritySupport),
      birthdayVoucherVnd: String(Number(b.birthdayVoucherVnd ?? 0)),
      note: typeof b.note === "string" ? b.note : ""
    })
    setTierError("")
    setTierModalOpen(true)
  }

  const handleSubmitTier = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTierError("")
    const name = tierDraft.name.trim()
    const minPoints = Math.max(0, Math.round(Number(tierDraft.minPoints) || 0))
    const discountRate = Math.min(
      100,
      Math.max(0, Number(tierDraft.discountRate) || 0)
    )
    if (!name) {
      setTierError("Vui lòng nhập tên hạng thành viên.")
      return
    }

    const benefits = {
      freeShipping: tierDraft.freeShipping,
      prioritySupport: tierDraft.prioritySupport,
      birthdayVoucherVnd: Math.max(
        0,
        Math.round(Number(tierDraft.birthdayVoucherVnd) || 0)
      ),
      note: tierDraft.note.trim() || undefined
    }

    setSavingTier(true)
    try {
      if (editingTier) {
        if (!isDemo) {
          const updated = await updateMembershipTier(editingTier.id, {
            name,
            minPoints,
            discountRate,
            benefits
          })
          onTiersChange((prev) =>
            prev.map((t) => (t.id === editingTier.id ? updated : t))
          )
          await onRefresh()
        } else {
          onTiersChange((prev) =>
            prev.map((t) =>
              t.id === editingTier.id
                ? {
                    ...t,
                    name,
                    minPoints,
                    discountRate,
                    benefitsJson: benefits
                  }
                : t
            )
          )
        }
        toast({
          title: `Đã cập nhật hạng ${name}`,
          description: `Ngưỡng đạt hạng: ${minPoints.toLocaleString("vi-VN")} điểm · Ưu đãi ${discountRate}%.`,
          variant: "success"
        })
      } else {
        const cleanCode =
          tierDraft.code.trim().toUpperCase() ||
          `TIER-${String(tiers.length + 1).padStart(2, "0")}`
        if (!isDemo) {
          const created = await createMembershipTier({
            code: tierDraft.code.trim() ? cleanCode : undefined,
            name,
            minPoints,
            discountRate,
            benefits
          })
          onTiersChange((prev) => [...prev, created])
          await onRefresh()
        } else {
          onTiersChange((prev) => [
            ...prev,
            {
              id: `tier-${Date.now()}`,
              code: cleanCode,
              name,
              minPoints,
              discountRate,
              benefitsJson: benefits,
              status: "ACTIVE"
            }
          ])
        }
        toast({
          title: `Đã thêm hạng thành viên ${name}`,
          variant: "success"
        })
      }
      setTierModalOpen(false)
    } catch {
      setTierError("Không thể lưu hạng thành viên (mã hạng có thể bị trùng).")
    } finally {
      setSavingTier(false)
    }
  }

  const toggleTierStatus = async (tier: MembershipTierItem) => {
    const nextStatus = tier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      if (!isDemo) {
        await updateMembershipTier(tier.id, { status: nextStatus })
        await onRefresh()
      }
      onTiersChange((prev) =>
        prev.map((t) => (t.id === tier.id ? { ...t, status: nextStatus } : t))
      )
      toast({
        title:
          nextStatus === "ACTIVE"
            ? `Đã bật hạng ${tier.name}`
            : `Đã tạm ẩn hạng ${tier.name}`,
        variant: "info"
      })
    } catch {
      toast({
        title: "Không thể đổi trạng thái hạng thành viên",
        variant: "error"
      })
    }
  }

  const tierPalette = [
    {
      ring: "border-slate-200 bg-white",
      badge: "bg-slate-100 text-slate-700",
      icon: Award
    },
    {
      ring: "border-sky-200 bg-gradient-to-br from-white to-sky-50/50",
      badge: "bg-sky-100 text-sky-800",
      icon: Award
    },
    {
      ring: "border-amber-200 bg-gradient-to-br from-white to-amber-50/60",
      badge: "bg-amber-100 text-amber-800",
      icon: Crown
    },
    {
      ring: "border-[#16866f]/35 bg-gradient-to-br from-white to-[#e6f5ee]/70",
      badge: "bg-[#16866f] text-white",
      icon: Sparkles
    }
  ]

  return (
    <div className="space-y-6">
      {/* Section 1: Membership Tier Progression Ladder */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#16866f]">
              Bậc thang Hạng thành viên (MembershipTier)
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#163d36]">
              Tự động xét thăng hạng theo điểm tích lũy đủ điều kiện
            </h2>
          </div>
          <Button
            type="button"
            onClick={openCreateTier}
            className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            <Plus size={16} />
            Thêm hạng thành viên
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sortedTiers.map((tier, idx) => {
            const theme = tierPalette[Math.min(idx, tierPalette.length - 1)]
            const TierIcon = theme.icon
            const b = tier.benefitsJson ?? {}
            const discount = Number(tier.discountRate ?? 0)
            return (
              <div
                key={tier.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${theme.ring} ${
                  tier.status === "INACTIVE" ? "opacity-60" : ""
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${theme.badge}`}
                    >
                      <TierIcon size={13} />
                      {tier.code}
                    </span>
                    <div className="flex items-center gap-1">
                      <AnimatedSwitch
                        checked={tier.status === "ACTIVE"}
                        onChange={() => void toggleTierStatus(tier)}
                        label={`Bật/tắt hạng ${tier.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => openEditTier(tier)}
                        title="Chỉnh sửa hạng"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-[#16866f]"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-[#163d36]">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Từ{" "}
                    <b className="tabular-nums text-[#163d36]">
                      {tier.minPoints.toLocaleString("vi-VN")} điểm
                    </b>{" "}
                    tích lũy
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-[#e6f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#147853]">
                      Chiết khấu {discount}%
                    </span>
                    {b.freeShipping ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                        <Truck size={11} /> Freeship
                      </span>
                    ) : null}
                    {Number(b.birthdayVoucherVnd ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        <Gift size={11} /> Sinh nhật{" "}
                        {formatVnd(Number(b.birthdayVoucherVnd))}
                      </span>
                    ) : null}
                  </div>

                  {typeof b.note === "string" && b.note ? (
                    <p className="mt-3 line-clamp-2 text-xs text-slate-500">
                      {b.note}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 border-t border-slate-200/60 pt-2.5 text-[11px] text-slate-400">
                  Bậc #{idx + 1} ·{" "}
                  {tier.status === "ACTIVE" ? "Đang áp dụng" : "Đang tạm ẩn"}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Section 2: Loyalty Program Configuration & Live Conversion Simulator */}
      <div className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={(e) => void handleSaveSettings(e)}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#16866f]">
                Cấu hình Tích & Tiêu điểm (LoyaltySetting)
              </p>
              <h3 className="mt-1 text-base font-semibold text-[#163d36]">
                Quy tắc quy đổi tiền tệ VNĐ sang Điểm thưởng đa kênh
              </h3>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-[#f7faf9] px-3 py-2">
              <AnimatedSwitch
                checked={enabled}
                onChange={setEnabled}
                label="Bật chương trình tích điểm"
              />
              <span className="text-xs font-semibold text-[#163d36]">
                {enabled ? "Đang bật tích điểm" : "Tạm tắt tích điểm"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              Mức chi tiêu để tích 1 điểm (VNĐ)
              <input
                type="number"
                min={100}
                step={500}
                className={inputCls}
                value={earnAmount}
                onChange={(e) => setEarnAmount(e.target.value)}
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                VD: 10.000đ chi tiêu = +1 điểm thưởng
              </span>
            </label>

            <label className="block text-xs font-medium text-slate-600">
              Giá trị quy đổi 1 điểm khi tiêu (VNĐ)
              <input
                type="number"
                min={10}
                step={100}
                className={inputCls}
                value={redeemValue}
                onChange={(e) => setRedeemValue(e.target.value)}
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                VD: 1 điểm = giảm 1.000đ trên hóa đơn
              </span>
            </label>

            <label className="block text-xs font-medium text-slate-600">
              Số điểm tối thiểu cho mỗi lần đổi
              <input
                type="number"
                min={0}
                className={inputCls}
                value={minRedeem}
                onChange={(e) => setMinRedeem(e.target.value)}
              />
            </label>

            <label className="block text-xs font-medium text-slate-600">
              Trần điểm đổi tối đa / đơn hàng
              <input
                type="number"
                min={1}
                placeholder="Để trống nếu không giới hạn"
                className={inputCls}
                value={maxRedeem}
                onChange={(e) => setMaxRedeem(e.target.value)}
              />
            </label>

            <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
              Thời hạn hiệu lực của điểm (Tháng)
              <input
                type="number"
                min={1}
                max={120}
                placeholder="Để trống = điểm không hết hạn"
                className={inputCls}
                value={expireMonths}
                onChange={(e) => setExpireMonths(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={reconciling}
              onClick={() => void handleReconcile()}
              className="gap-2 text-xs"
            >
              <RefreshCw
                size={14}
                className={reconciling ? "animate-spin" : ""}
              />
              Đối soát sổ cái điểm (Reconcile)
            </Button>

            <Button
              type="submit"
              disabled={savingSettings}
              className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
            >
              <ShieldCheck size={16} />
              {savingSettings ? "Đang lưu..." : "Lưu chính sách tích điểm"}
            </Button>
          </div>
        </form>

        {/* Live Loyalty Simulator */}
        <div className="flex flex-col justify-between rounded-xl border border-[#16866f]/20 bg-gradient-to-br from-[#f2fbf6] via-white to-[#eef7f4] p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16866f]/10 px-3 py-1 text-xs font-semibold text-[#147853]">
                <Calculator size={14} />
                Mô phỏng Tích & Tiêu điểm trực tiếp
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#163d36] shadow-sm">
                Hoàn tiền ~{simulation.cashbackPct}%
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              Kiểm tra ngay trải nghiệm thu ngân POS khi khách hàng vừa đổi điểm
              cũ vừa tích điểm mới trên cùng đơn hàng:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600">
                Giá trị giỏ hàng giả định (VNĐ)
                <input
                  type="number"
                  min={0}
                  step={10000}
                  className={inputCls}
                  value={simOrderVnd}
                  onChange={(e) => setSimOrderVnd(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Số điểm khách muốn dùng
                <input
                  type="number"
                  min={0}
                  step={10}
                  className={inputCls}
                  value={simRedeemPts}
                  onChange={(e) => setSimRedeemPts(e.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-4 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Tạm tính đơn hàng</span>
                <b className="tabular-nums text-slate-800">
                  {formatVnd(simulation.orderAmt)}
                </b>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>
                  Giảm từ đổi điểm ({simulation.cappedPts} điểm)
                </span>
                <b className="tabular-nums text-emerald-700">
                  -{formatVnd(simulation.discountVnd)}
                </b>
              </div>
              {!simulation.eligibleToRedeem && Number(simRedeemPts) > 0 ? (
                <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                  {!enabled
                    ? "Chương trình tích điểm đang tạm tắt."
                    : `Cần tối thiểu ${minRedeem} điểm để áp dụng giảm trừ.`}
                </p>
              ) : null}
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2.5">
                <span className="font-medium text-[#163d36]">
                  Khách thực trả
                </span>
                <b className="text-base tabular-nums text-[#163d36]">
                  {formatVnd(simulation.netPayable)}
                </b>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#e6f5ee]/70 px-3 py-2 text-xs font-semibold text-[#147853]">
                <span className="inline-flex items-center gap-1.5">
                  <Coins size={14} /> Điểm cộng mới sau thanh toán
                </span>
                <span className="tabular-nums">
                  +{simulation.earnedPoints.toLocaleString("vi-VN")} điểm
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            * Điểm giữ chỗ tại quầy POS (Hold TTL) tự động nhả về ví khách sau{" "}
            <b>{Math.round((settings.holdTtlSeconds ?? 900) / 60)} phút</b> nếu
            giao dịch bị hủy giữa chừng.
          </p>
        </div>
      </div>

      {/* Add / Edit Tier Modal */}
      {tierModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#163d36]/35 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => void handleSubmitTier(e)}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#163d36]">
                  {editingTier
                    ? "Chỉnh sửa hạng thành viên"
                    : "Tạo hạng thành viên mới"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Thiết lập mốc điểm xét hạng và đặc quyền dành riêng cho hội viên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTierModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600">
                  Mã hạng
                  <input
                    disabled={Boolean(editingTier)}
                    placeholder="VD: GOLD, PLATINUM"
                    className={`${inputCls} font-mono uppercase disabled:bg-slate-50`}
                    value={tierDraft.code}
                    onChange={(e) =>
                      setTierDraft({
                        ...tierDraft,
                        code: e.target.value.toUpperCase()
                      })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Tên hiển thị *
                  <input
                    required
                    placeholder="VD: Hạng Bạch Kim"
                    className={inputCls}
                    value={tierDraft.name}
                    onChange={(e) =>
                      setTierDraft({ ...tierDraft, name: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Điểm tối thiểu đạt hạng *
                  <input
                    type="number"
                    min={0}
                    required
                    className={inputCls}
                    value={tierDraft.minPoints}
                    onChange={(e) =>
                      setTierDraft({ ...tierDraft, minPoints: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Ưu đãi chiết khấu hạng (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    className={inputCls}
                    value={tierDraft.discountRate}
                    onChange={(e) =>
                      setTierDraft({
                        ...tierDraft,
                        discountRate: e.target.value
                      })
                    }
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-600">
                Quà tặng voucher sinh nhật (VNĐ)
                <input
                  type="number"
                  min={0}
                  step={10000}
                  className={inputCls}
                  value={tierDraft.birthdayVoucherVnd}
                  onChange={(e) =>
                    setTierDraft({
                      ...tierDraft,
                      birthdayVoucherVnd: e.target.value
                    })
                  }
                />
              </label>

              <div className="flex flex-wrap gap-4 rounded-xl bg-slate-50 p-3.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={tierDraft.freeShipping}
                    onChange={(e) =>
                      setTierDraft({
                        ...tierDraft,
                        freeShipping: e.target.checked
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#16866f] focus:ring-[#16866f]"
                  />
                  Miễn phí vận chuyển tiêu chuẩn
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={tierDraft.prioritySupport}
                    onChange={(e) =>
                      setTierDraft({
                        ...tierDraft,
                        prioritySupport: e.target.checked
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#16866f] focus:ring-[#16866f]"
                  />
                  Ưu tiên CSKH & Đổi trả nhanh
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-600">
                Ghi chú quyền lợi hạng
                <input
                  placeholder="Mô tả ngắn hiển thị trên thẻ thành viên..."
                  className={inputCls}
                  value={tierDraft.note}
                  onChange={(e) =>
                    setTierDraft({ ...tierDraft, note: e.target.value })
                  }
                />
              </label>

              {tierError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {tierError}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTierModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={savingTier}
                className="bg-[#16866f] text-white hover:bg-[#0f705d]"
              >
                {savingTier
                  ? "Đang lưu..."
                  : editingTier
                    ? "Cập nhật hạng"
                    : "Tạo hạng mới"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
