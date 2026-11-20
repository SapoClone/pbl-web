import { type FormEvent, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Calculator,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Tag,
  Ticket as TicketPercent,
  Users,
  Wand2,
  X
} from "lucide-react"
import { gatewayClient } from "@/api/axios"
import { listBranches } from "@/api/platform/branches"
import {
  type CouponApi,
  type CreateCouponInput,
  type CreatePromotionInput,
  type EvaluateCouponResult,
  type PromotionApi,
  type PromotionDiscountType,
  createCoupon,
  createPromotion,
  evaluateCoupon,
  listCoupons,
  listPromotions,
  updateCoupon,
  updatePromotion
} from "@/api/sales/promotions"
import { Button } from "@/components/ui/button"
import {
  AnimatedSwitch,
  ChannelBadge,
  CopyCodeBadge,
  KpiStatCard,
  SegmentedTabs,
  UsageProgressBar
} from "@/components/ui/micro-ux"
import { useToast } from "@/components/ui/toast"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type PromotionsTab = "programs" | "coupons" | "simulator"

type CustomerGroupLite = {
  id: string
  name: string
  code?: string
}

const CHANNEL_OPTIONS = [
  { value: "POS", label: "POS Tại quầy" },
  { value: "LAZADA", label: "Lazada" },
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK", label: "TikTok Shop" },
  { value: "WEBSITE", label: "Website" }
] as const

const DEMO_BRANCHES = [
  { id: "11111111-1111-4111-8111-111111111101", name: "Chi nhánh Quận 1 (Flagship)" },
  { id: "11111111-1111-4111-8111-111111111102", name: "Chi nhánh Cầu Giấy" },
  { id: "11111111-1111-4111-8111-111111111103", name: "Chi nhánh Hải Châu" }
]

const DEMO_GROUPS: CustomerGroupLite[] = [
  { id: "22222222-2222-4222-8222-222222222201", name: "Khách VIP Kim Cương", code: "VIP" },
  { id: "22222222-2222-4222-8222-222222222202", name: "Khách Bán sỉ / Đại lý", code: "WHOLESALE" },
  { id: "22222222-2222-4222-8222-222222222203", name: "Thành viên Thân thiết", code: "MEMBER" }
]

const DEMO_PROMOTIONS: PromotionApi[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    code: "OMNI-SUMMER15",
    name: "Ưu đãi Hè Đa Kênh - Giảm 15%",
    description: "Áp dụng cho đơn thời trang từ 299.000 ₫ tại quầy POS và Website chính thức",
    discountType: "PERCENT",
    discountValue: 15,
    minOrderAmount: 299000,
    maxDiscountAmount: 75000,
    branchId: null,
    channelTypes: ["POS", "WEBSITE"],
    customerGroupIds: [],
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2027-12-31T23:59:59.000Z",
    status: "ACTIVE",
    createdAt: "2026-10-01T08:00:00.000Z"
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    code: "VIP-PRIVILEGE100K",
    name: "Đặc quyền Khách VIP - Tặng 100.000 ₫",
    description: "Ưu đãi riêng cho nhóm Khách VIP tại Flagship Quận 1",
    discountType: "FIXED",
    discountValue: 100000,
    minOrderAmount: 600000,
    maxDiscountAmount: null,
    branchId: "11111111-1111-4111-8111-111111111101",
    channelTypes: ["POS"],
    customerGroupIds: ["22222222-2222-4222-8222-222222222201"],
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2027-06-30T23:59:59.000Z",
    status: "ACTIVE",
    createdAt: "2026-10-12T09:30:00.000Z"
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    code: "MEGA-CAMPAIGN11",
    name: "Trợ giá Sàn TMĐT 11.11 - Giảm 8%",
    description: "Đồng bộ voucher chiến dịch Mega Sale trên Lazada & Shopee",
    discountType: "PERCENT",
    discountValue: 8,
    minOrderAmount: 199000,
    maxDiscountAmount: 40000,
    branchId: null,
    channelTypes: ["LAZADA", "SHOPEE"],
    customerGroupIds: [],
    startsAt: "2026-11-01T00:00:00.000Z",
    endsAt: "2026-11-30T23:59:59.000Z",
    status: "ACTIVE",
    createdAt: "2026-11-01T02:00:00.000Z"
  },
  {
    id: "33333333-3333-4333-8333-333333333304",
    code: "CLEARANCE-50K",
    name: "Xả kho Cuối mùa - Giảm 50K",
    description: "Chương trình đã tạm dừng sau khi đạt chỉ tiêu xả tồn",
    discountType: "FIXED",
    discountValue: 50000,
    minOrderAmount: 350000,
    maxDiscountAmount: null,
    branchId: "11111111-1111-4111-8111-111111111102",
    channelTypes: ["POS", "SHOPEE"],
    customerGroupIds: [],
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-09-30T23:59:59.000Z",
    status: "INACTIVE",
    createdAt: "2026-08-01T08:00:00.000Z"
  }
]

const DEMO_COUPONS: CouponApi[] = [
  {
    id: "44444444-4444-4444-8444-444444444401",
    promotionId: "33333333-3333-4333-8333-333333333301",
    code: "HE2026",
    maxUses: 200,
    maxUsesPerCustomer: 2,
    usedCount: 142,
    status: "ACTIVE",
    createdAt: "2026-10-02T08:00:00.000Z"
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    promotionId: "33333333-3333-4333-8333-333333333301",
    code: "WELCOME15",
    maxUses: 100,
    maxUsesPerCustomer: 1,
    usedCount: 88,
    status: "ACTIVE",
    createdAt: "2026-10-05T10:00:00.000Z"
  },
  {
    id: "44444444-4444-4444-8444-444444444403",
    promotionId: "33333333-3333-4333-8333-333333333302",
    code: "VIP100K",
    maxUses: 50,
    maxUsesPerCustomer: 1,
    usedCount: 50,
    status: "ACTIVE",
    createdAt: "2026-10-12T10:00:00.000Z"
  },
  {
    id: "44444444-4444-4444-8444-444444444404",
    promotionId: "33333333-3333-4333-8333-333333333303",
    code: "MEGA1111",
    maxUses: 500,
    maxUsesPerCustomer: 3,
    usedCount: 215,
    status: "ACTIVE",
    createdAt: "2026-11-01T03:00:00.000Z"
  }
]

const formatMoney = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message
    if (Array.isArray(msg)) return msg.join(", ")
    if (typeof msg === "string" && msg.trim()) return msg
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

const generateRandomCode = (prefix = "KM") => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let suffix = ""
  for (let i = 0; i < 5; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}-${suffix}`
}

function getPromotionWindowState(promo: PromotionApi): {
  key: "ACTIVE" | "UPCOMING" | "EXPIRED" | "INACTIVE"
  label: string
  badgeCls: string
} {
  if (promo.status !== "ACTIVE") {
    return {
      key: "INACTIVE",
      label: "Tạm ngưng",
      badgeCls: "bg-slate-100 text-slate-600"
    }
  }
  const now = Date.now()
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) {
    return {
      key: "UPCOMING",
      label: "Sắp diễn ra",
      badgeCls: "bg-sky-50 text-sky-700"
    }
  }
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) {
    return {
      key: "EXPIRED",
      label: "Đã kết thúc",
      badgeCls: "bg-amber-50 text-amber-700"
    }
  }
  return {
    key: "ACTIVE",
    label: "Đang áp dụng",
    badgeCls: "bg-[#e6f5ee] text-[#147853]"
  }
}

export function PromotionsPage({
  requestedTab
}: {
  requestedTab?: string | null
} = {}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const isDemo = useStoreAuth((s) => Boolean(s.tokens?.isDemo))

  const [tab, setTab] = useState<PromotionsTab>(() => {
    const raw =
      requestedTab ??
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null)
    return raw === "programs" || raw === "coupons" || raw === "simulator"
      ? raw
      : "programs"
  })
  useEffect(() => {
    if (
      requestedTab === "programs" ||
      requestedTab === "coupons" ||
      requestedTab === "simulator"
    ) {
      setTab(requestedTab)
    }
  }, [requestedTab])

  const handleChangeTab = (next: PromotionsTab) => {
    setTab(next)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next)
    window.history.replaceState({}, "", url.toString())
  }

  // Demo state fallbacks
  const [demoPromotions, setDemoPromotions] =
    useState<PromotionApi[]>(DEMO_PROMOTIONS)
  const [demoCoupons, setDemoCoupons] = useState<CouponApi[]>(DEMO_COUPONS)

  // Live API queries
  const promotionsQuery = useQuery({
    queryKey: ["sales-promotions"],
    queryFn: listPromotions,
    enabled: !isDemo
  })

  const couponsQuery = useQuery({
    queryKey: ["sales-coupons"],
    queryFn: listCoupons,
    enabled: !isDemo
  })

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: !isDemo
  })

  const customerGroupsQuery = useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      const { data } = await gatewayClient.get<CustomerGroupLite[]>(
        "/customer/api/v1/customer-groups"
      )
      return Array.isArray(data) ? data : []
    },
    enabled: !isDemo
  })

  const promotions = isDemo
    ? demoPromotions
    : (promotionsQuery.data ?? [])
  const coupons = isDemo ? demoCoupons : (couponsQuery.data ?? [])
  const branches: Array<{ id: string; name: string }> = isDemo
    ? DEMO_BRANCHES
    : (branchesQuery.data?.data ?? []).map((b) => ({ id: b.id, name: b.name }))
  const customerGroups = isDemo
    ? DEMO_GROUPS
    : (customerGroupsQuery.data ?? [])

  const branchNameById = useMemo(
    () => new Map<string, string>(branches.map((b) => [b.id, b.name])),
    [branches]
  )
  const groupNameById = useMemo(
    () => new Map(customerGroups.map((g) => [g.id, g.name])),
    [customerGroups]
  )
  const promoById = useMemo(
    () => new Map(promotions.map((p) => [p.id, p])),
    [promotions]
  )
  const couponCountByPromo = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of coupons) {
      map.set(c.promotionId, (map.get(c.promotionId) ?? 0) + 1)
    }
    return map
  }, [coupons])

  // Filters — Programs tab
  const [promoSearch, setPromoSearch] = useState("")
  const [promoTypeFilter, setPromoTypeFilter] = useState<
    "ALL" | PromotionDiscountType
  >("ALL")
  const [promoChannelFilter, setPromoChannelFilter] = useState<string>("ALL")
  const [promoBranchFilter, setPromoBranchFilter] = useState<string>("ALL")
  const [promoStateFilter, setPromoStateFilter] = useState<string>("ALL")

  // Filters — Coupons tab
  const [couponSearch, setCouponSearch] = useState("")
  const [couponPromoFilter, setCouponPromoFilter] = useState<string>("ALL")
  const [couponUsageFilter, setCouponUsageFilter] = useState<
    "ALL" | "AVAILABLE" | "NEAR_LIMIT" | "EXHAUSTED" | "INACTIVE"
  >("ALL")

  // Modals state
  const [promoModalOpen, setPromoModalOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] =
    useState<PromotionApi | null>(null)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [preselectedPromoId, setPreselectedPromoId] = useState<string>("")
  const [editingCoupon, setEditingCoupon] = useState<CouponApi | null>(null)

  // Simulator state
  const [simCode, setSimCode] = useState("HE2026")
  const [simAmount, setSimAmount] = useState("450000")
  const [simBranchId, setSimBranchId] = useState("")
  const [simChannel, setSimChannel] = useState("POS")
  const [simGroupId, setSimGroupId] = useState("")
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState<EvaluateCouponResult | null>(null)
  const [simError, setSimError] = useState<string>("")

  useEffect(() => {
    if (!simBranchId && branches.length > 0) {
      setSimBranchId(branches[0].id)
    }
  }, [branches, simBranchId])

  // KPI metrics
  const kpis = useMemo(() => {
    const activePromos = promotions.filter(
      (p) => getPromotionWindowState(p).key === "ACTIVE"
    ).length
    const activeCoupons = coupons.filter((c) => {
      const parent = promoById.get(c.promotionId)
      const exhausted =
        c.maxUses !== null && Number(c.usedCount) >= Number(c.maxUses)
      return (
        c.status === "ACTIVE" &&
        !exhausted &&
        (!parent || getPromotionWindowState(parent).key === "ACTIVE")
      )
    }).length
    const totalRedemptions = coupons.reduce(
      (acc, c) => acc + Number(c.usedCount ?? 0),
      0
    )
    const cappedCoupons = coupons.filter((c) => c.maxUses && c.maxUses > 0)
    const avgUtilization =
      cappedCoupons.length > 0
        ? Math.round(
            (cappedCoupons.reduce(
              (acc, c) => acc + Math.min(1, c.usedCount / (c.maxUses ?? 1)),
              0
            ) /
              cappedCoupons.length) *
              100
          )
        : 0
    return {
      activePromos,
      activeCoupons,
      totalRedemptions,
      avgUtilization
    }
  }, [coupons, promoById, promotions])

  const filteredPromotions = useMemo(() => {
    const q = promoSearch.trim().toLowerCase()
    return promotions.filter((p) => {
      if (
        q &&
        !p.code.toLowerCase().includes(q) &&
        !p.name.toLowerCase().includes(q) &&
        !(p.description ?? "").toLowerCase().includes(q)
      ) {
        return false
      }
      if (promoTypeFilter !== "ALL" && p.discountType !== promoTypeFilter) {
        return false
      }
      if (promoChannelFilter !== "ALL") {
        const ch = p.channelTypes ?? []
        if (ch.length > 0 && !ch.includes(promoChannelFilter)) return false
      }
      if (promoBranchFilter !== "ALL") {
        if (p.branchId && p.branchId !== promoBranchFilter) return false
      }
      if (promoStateFilter !== "ALL") {
        if (getPromotionWindowState(p).key !== promoStateFilter) return false
      }
      return true
    })
  }, [
    promoBranchFilter,
    promoChannelFilter,
    promoSearch,
    promoStateFilter,
    promoTypeFilter,
    promotions
  ])

  const filteredCoupons = useMemo(() => {
    const q = couponSearch.trim().toLowerCase()
    return coupons.filter((c) => {
      const parent = promoById.get(c.promotionId)
      if (
        q &&
        !c.code.toLowerCase().includes(q) &&
        !(parent?.name ?? "").toLowerCase().includes(q) &&
        !(parent?.code ?? "").toLowerCase().includes(q)
      ) {
        return false
      }
      if (couponPromoFilter !== "ALL" && c.promotionId !== couponPromoFilter) {
        return false
      }
      const exhausted =
        c.maxUses !== null && Number(c.usedCount) >= Number(c.maxUses)
      const nearLimit =
        c.maxUses !== null &&
        !exhausted &&
        Number(c.usedCount) / Number(c.maxUses) >= 0.8

      if (couponUsageFilter === "INACTIVE" && c.status === "ACTIVE") {
        return false
      }
      if (
        couponUsageFilter === "EXHAUSTED" &&
        (c.status !== "ACTIVE" || !exhausted)
      ) {
        return false
      }
      if (
        couponUsageFilter === "NEAR_LIMIT" &&
        (c.status !== "ACTIVE" || !nearLimit)
      ) {
        return false
      }
      if (
        couponUsageFilter === "AVAILABLE" &&
        (c.status !== "ACTIVE" || exhausted)
      ) {
        return false
      }
      return true
    })
  }, [couponPromoFilter, couponSearch, couponUsageFilter, coupons, promoById])

  const refreshAll = async () => {
    if (isDemo) {
      toast.info("Đang ở chế độ Demo", "Dữ liệu mô phỏng đã được cập nhật.")
      return
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales-promotions"] }),
      queryClient.invalidateQueries({ queryKey: ["sales-coupons"] })
    ])
    toast.success("Đã làm mới dữ liệu khuyến mãi & mã giảm giá")
  }

  const handleTogglePromotionStatus = async (promo: PromotionApi) => {
    const nextStatus = promo.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    if (isDemo) {
      setDemoPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, status: nextStatus } : p))
      )
      toast.success(
        nextStatus === "ACTIVE"
          ? `Đã kích hoạt chương trình ${promo.code}`
          : `Đã tạm ngưng chương trình ${promo.code}`
      )
      return
    }
    try {
      await updatePromotion(promo.id, { status: nextStatus })
      await queryClient.invalidateQueries({ queryKey: ["sales-promotions"] })
      toast.success(
        nextStatus === "ACTIVE"
          ? `Đã kích hoạt chương trình ${promo.code}`
          : `Đã tạm ngưng chương trình ${promo.code}`
      )
    } catch (error) {
      toast.error(
        "Không thể đổi trạng thái khuyến mãi",
        extractErrorMessage(error, "Vui lòng kiểm tra quyền hạn của bạn.")
      )
    }
  }

  const handleToggleCouponStatus = async (coupon: CouponApi) => {
    const nextStatus = coupon.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    if (isDemo) {
      setDemoCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, status: nextStatus } : c
        )
      )
      toast.success(
        nextStatus === "ACTIVE"
          ? `Đã bật mã giảm giá ${coupon.code}`
          : `Đã khóa mã giảm giá ${coupon.code}`
      )
      return
    }
    try {
      await updateCoupon(coupon.id, { status: nextStatus })
      await queryClient.invalidateQueries({ queryKey: ["sales-coupons"] })
      toast.success(
        nextStatus === "ACTIVE"
          ? `Đã bật mã giảm giá ${coupon.code}`
          : `Đã khóa mã giảm giá ${coupon.code}`
      )
    } catch (error) {
      toast.error(
        "Không thể cập nhật mã giảm giá",
        extractErrorMessage(error, "Vui lòng thử lại sau.")
      )
    }
  }

  const runCouponSimulation = async (e?: FormEvent) => {
    e?.preventDefault()
    const code = simCode.trim().toUpperCase()
    const amount = Number(simAmount)
    if (!code) {
      setSimError("Vui lòng nhập mã giảm giá cần kiểm tra.")
      setSimResult(null)
      return
    }
    if (!Number.isInteger(amount) || amount < 0) {
      setSimError("Giá trị đơn hàng phải là số nguyên không âm (VND).")
      setSimResult(null)
      return
    }

    setSimLoading(true)
    setSimError("")
    try {
      if (isDemo) {
        const coupon = demoCoupons.find(
          (c) => c.code.toUpperCase() === code
        )
        if (!coupon || coupon.status !== "ACTIVE") {
          throw new Error(`Mã giảm giá ${code} không tồn tại hoặc đang bị khóa.`)
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
          throw new Error(
            `Mã ${code} đã hết lượt sử dụng (${coupon.usedCount}/${coupon.maxUses}).`
          )
        }
        const promo = demoPromotions.find((p) => p.id === coupon.promotionId)
        if (!promo || promo.status !== "ACTIVE") {
          throw new Error(`Chương trình khuyến mãi của mã ${code} đã tạm ngưng.`)
        }
        if (promo.branchId && simBranchId && promo.branchId !== simBranchId) {
          const requiredName =
            branchNameById.get(promo.branchId) ?? promo.branchId
          throw new Error(`Mã ${code} chỉ áp dụng tại ${requiredName}.`)
        }
        if (
          promo.channelTypes &&
          promo.channelTypes.length > 0 &&
          !promo.channelTypes.includes(simChannel)
        ) {
          throw new Error(
            `Mã ${code} chỉ áp dụng cho kênh: ${promo.channelTypes.join(", ")}.`
          )
        }
        if (
          promo.customerGroupIds &&
          promo.customerGroupIds.length > 0 &&
          (!simGroupId || !promo.customerGroupIds.includes(simGroupId))
        ) {
          throw new Error(
            `Mã ${code} yêu cầu khách thuộc nhóm khách hàng ưu tiên.`
          )
        }
        if (amount < promo.minOrderAmount) {
          throw new Error(
            `Đơn hàng tối thiểu cần đạt ${formatMoney(promo.minOrderAmount)} (thiếu ${formatMoney(promo.minOrderAmount - amount)}).`
          )
        }
        let discount =
          promo.discountType === "PERCENT"
            ? Math.round((amount * promo.discountValue) / 100)
            : promo.discountValue
        if (
          promo.maxDiscountAmount !== null &&
          discount > promo.maxDiscountAmount
        ) {
          discount = promo.maxDiscountAmount
        }
        discount = Math.min(discount, amount)
        setSimResult({
          couponId: coupon.id,
          promotionId: promo.id,
          promotionCode: promo.code,
          promotionName: promo.name,
          couponCode: coupon.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          minOrderAmount: promo.minOrderAmount,
          maxDiscountAmount: promo.maxDiscountAmount,
          orderAmountVnd: amount,
          discountAmountVnd: discount,
          finalAmountVnd: amount - discount
        })
      } else {
        if (!simBranchId) {
          throw new Error("Vui lòng chọn chi nhánh áp dụng để kiểm thử.")
        }
        const res = await evaluateCoupon({
          code,
          orderAmount: amount,
          branchId: simBranchId,
          channelType: simChannel,
          customerGroupId: simGroupId || null
        })
        setSimResult(res)
      }
    } catch (error) {
      setSimResult(null)
      setSimError(
        extractErrorMessage(error, "Mã giảm giá không đủ điều kiện áp dụng.")
      )
    } finally {
      setSimLoading(false)
    }
  }

  const isLoading =
    !isDemo && (promotionsQuery.isLoading || couponsQuery.isLoading)

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">
              Tiếp thị &amp; Thúc đẩy doanh số
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                isDemo
                  ? "bg-amber-50 text-amber-700"
                  : promotionsQuery.isError
                    ? "bg-red-50 text-red-600"
                    : "bg-[#e6f5ee] text-[#147853]"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {isDemo
                ? "Chế độ Demo tương tác"
                : promotionsQuery.isError
                  ? "Chưa kết nối Sales API"
                  : "Sales Promotion Engine sẵn sàng"}
            </span>
          </div>
          <h1 className="mt-1.5 text-[30px] font-semibold tracking-[-0.03em] text-[#163d36]">
            Khuyến mãi &amp; Mã giảm giá
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Thiết lập chiến dịch chiết khấu tự động, phát hành mã Coupon giới hạn lượt dùng theo chi nhánh, kênh bán và phân khúc khách hàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshAll()}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={15} className="mr-2" />
            Làm mới
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingCoupon(null)
              setPreselectedPromoId(promotions[0]?.id ?? "")
              setCouponModalOpen(true)
            }}
            disabled={promotions.length === 0}
            className="border-[#b8e2d2] bg-[#f2fbf6] text-[#147853] hover:bg-[#e6f5ee]"
          >
            <Tag size={15} className="mr-2" />
            Phát hành mã Coupon
          </Button>
          <Button
            type="button"
            onClick={() => {
              setEditingPromotion(null)
              setPromoModalOpen(true)
            }}
            className="bg-[#16866f] text-white shadow-sm hover:bg-[#0f705d] active:scale-[0.98]"
          >
            <Plus size={16} className="mr-1.5" />
            Tạo chương trình KM
          </Button>
        </div>
      </header>

      {/* KPI Strip */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          label="Chương trình đang chạy"
          value={kpis.activePromos}
          hint={`Trên tổng số ${promotions.length} chiến dịch đã tạo`}
          icon={Sparkles}
          tone="emerald"
          onClick={() => handleChangeTab("programs")}
        />
        <KpiStatCard
          label="Mã giảm giá khả dụng"
          value={kpis.activeCoupons}
          hint={`${coupons.length} mã đã phát hành toàn hệ thống`}
          icon={TicketPercent}
          tone="sky"
          onClick={() => handleChangeTab("coupons")}
        />
        <KpiStatCard
          label="Tổng lượt đã áp dụng"
          value={kpis.totalRedemptions.toLocaleString("vi-VN")}
          hint="Ghi nhận tự động qua sổ cái đơn hàng"
          icon={CheckCircle2}
          tone="indigo"
        />
        <KpiStatCard
          label="Hiệu suất tiêu thụ mã"
          value={`${kpis.avgUtilization}%`}
          hint="Trung bình tỷ lệ dùng trên hạn mức phát hành"
          icon={Calculator}
          tone="amber"
          onClick={() => handleChangeTab("simulator")}
        />
      </section>

      {/* Segmented Tabs */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs<PromotionsTab>
          value={tab}
          onChange={handleChangeTab}
          ariaLabel="Phân mục Khuyến mãi và Coupon"
          tabs={[
            {
              value: "programs",
              label: "Chương trình khuyến mãi",
              icon: Sparkles,
              badge: promotions.length
            },
            {
              value: "coupons",
              label: "Kho Mã giảm giá (Coupon)",
              icon: TicketPercent,
              badge: coupons.length
            },
            {
              value: "simulator",
              label: "Kiểm thử áp mã trực tiếp",
              icon: Calculator
            }
          ]}
        />
      </div>

      {/* TAB 1: PROGRAMS */}
      {tab === "programs" && (
        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                placeholder="Tìm theo mã chiến dịch, tên chương trình..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Lọc loại chiết khấu"
                value={promoTypeFilter}
                onChange={(e) =>
                  setPromoTypeFilter(
                    e.target.value as "ALL" | PromotionDiscountType
                  )
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="ALL">Mọi loại giảm</option>
                <option value="PERCENT">Theo phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (₫)</option>
              </select>

              <select
                aria-label="Lọc theo kênh bán"
                value={promoChannelFilter}
                onChange={(e) => setPromoChannelFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="ALL">Mọi kênh bán</option>
                {CHANNEL_OPTIONS.map((ch) => (
                  <option key={ch.value} value={ch.value}>
                    {ch.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Lọc theo chi nhánh"
                value={promoBranchFilter}
                onChange={(e) => setPromoBranchFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Lọc trạng thái hiệu lực"
                value={promoStateFilter}
                onChange={(e) => setPromoStateFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="ACTIVE">Đang áp dụng</option>
                <option value="UPCOMING">Sắp diễn ra</option>
                <option value="EXPIRED">Đã kết thúc</option>
                <option value="INACTIVE">Tạm ngưng</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="h-16 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="p-12 text-center">
              <TicketPercent
                size={36}
                className="mx-auto text-slate-300"
                strokeWidth={1.5}
              />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Chưa có chương trình khuyến mãi phù hợp bộ lọc
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Tạo chiến dịch ưu đãi mới để áp dụng cho POS, Website hoặc sàn thương mại điện tử.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">
                      Chiến dịch &amp; Mã KM
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      Mức giảm &amp; Điều kiện
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      Phạm vi áp dụng (Chi nhánh · Kênh · Nhóm KH)
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      Thời hiệu &amp; Coupon
                    </th>
                    <th className="px-5 py-3.5 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPromotions.map((promo) => {
                    const win = getPromotionWindowState(promo)
                    const channels = promo.channelTypes ?? []
                    const groupIds = promo.customerGroupIds ?? []
                    const linkedCoupons = couponCountByPromo.get(promo.id) ?? 0

                    return (
                      <tr
                        key={promo.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <CopyCodeBadge
                              code={promo.code}
                              variant="mono"
                              onCopied={(c) =>
                                toast.info(`Đã sao chép mã chiến dịch ${c}`)
                              }
                            />
                          </div>
                          <p className="mt-1.5 font-semibold text-[#163d36]">
                            {promo.name}
                          </p>
                          {promo.description ? (
                            <p className="mt-0.5 line-clamp-2 max-w-xs text-xs text-slate-500">
                              {promo.description}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <span className="inline-flex items-center rounded-lg bg-[#e6f5ee] px-2.5 py-1 text-xs font-bold text-[#147853]">
                            {promo.discountType === "PERCENT"
                              ? `Giảm ${promo.discountValue}%`
                              : `Giảm ${formatMoney(promo.discountValue)}`}
                          </span>
                          <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                            <p>
                              Đơn tối thiểu:{" "}
                              <strong className="font-semibold text-slate-800">
                                {promo.minOrderAmount > 0
                                  ? formatMoney(promo.minOrderAmount)
                                  : "0 ₫ (Mọi đơn)"}
                              </strong>
                            </p>
                            {promo.discountType === "PERCENT" &&
                            promo.maxDiscountAmount ? (
                              <p className="text-slate-500">
                                Trần giảm tối đa:{" "}
                                {formatMoney(promo.maxDiscountAmount)}
                              </p>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                              <Store size={13} className="text-[#16866f]" />
                              <span className="font-medium">
                                {promo.branchId
                                  ? (branchNameById.get(promo.branchId) ??
                                    "Chi nhánh chỉ định")
                                  : "Toàn bộ chi nhánh"}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {channels.length === 0 ? (
                                <ChannelBadge channel="ALL" size="xs" />
                              ) : (
                                channels.map((ch) => (
                                  <ChannelBadge
                                    key={ch}
                                    channel={ch}
                                    size="xs"
                                  />
                                ))
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                              <Users size={12} className="text-slate-400" />
                              {groupIds.length === 0 ? (
                                <span>Tất cả khách hàng</span>
                              ) : (
                                groupIds.map((gid) => (
                                  <span
                                    key={gid}
                                    className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
                                  >
                                    {groupNameById.get(gid) ?? "Nhóm ưu tiên"}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <CalendarClock size={13} className="text-slate-400" />
                            <span>
                              {promo.startsAt
                                ? promo.startsAt.slice(0, 10)
                                : "Ngay lập tức"}{" "}
                              →{" "}
                              {promo.endsAt
                                ? promo.endsAt.slice(0, 10)
                                : "Không thời hạn"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCouponPromoFilter(promo.id)
                              handleChangeTab("coupons")
                            }}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-[#163d36] transition hover:border-[#16866f]/40 hover:bg-[#f2fbf6]"
                          >
                            <TicketPercent size={12} className="text-[#16866f]" />
                            {linkedCoupons} mã Coupon
                          </button>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2.5">
                            <AnimatedSwitch
                              checked={promo.status === "ACTIVE"}
                              onChange={() =>
                                void handleTogglePromotionStatus(promo)
                              }
                              label={`Bật hoặc tắt khuyến mãi ${promo.code}`}
                            />
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${win.badgeCls}`}
                            >
                              {win.label}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right align-top">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCoupon(null)
                                setPreselectedPromoId(promo.id)
                                setCouponModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#cce8dc] bg-[#f2fbf6] px-2.5 py-1.5 text-xs font-semibold text-[#147853] transition hover:bg-[#e6f5ee]"
                            >
                              <Plus size={13} />
                              Mã
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPromotion(promo)
                                setPromoModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Edit3 size={13} />
                              Sửa
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: COUPONS */}
      {tab === "coupons" && (
        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                placeholder="Tìm mã giảm giá (VD: HE2026, VIP100K)..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Lọc theo chương trình gốc"
                value={couponPromoFilter}
                onChange={(e) => setCouponPromoFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="ALL">Tất cả chương trình KM</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Lọc theo tình trạng lượt dùng"
                value={couponUsageFilter}
                onChange={(e) =>
                  setCouponUsageFilter(
                    e.target.value as typeof couponUsageFilter
                  )
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="ALL">Mọi tình trạng lượt dùng</option>
                <option value="AVAILABLE">Còn lượt sử dụng</option>
                <option value="NEAR_LIMIT">Sắp chạm trần (≥80%)</option>
                <option value="EXHAUSTED">Đã hết lượt (100%)</option>
                <option value="INACTIVE">Đang bị khóa</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-14 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="p-12 text-center">
              <Tag
                size={36}
                className="mx-auto text-slate-300"
                strokeWidth={1.5}
              />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Không tìm thấy mã giảm giá nào phù hợp
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Bấm &ldquo;Phát hành mã Coupon&rdquo; để tạo mã phát cho khách hàng.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Mã Coupon</th>
                    <th className="px-5 py-3.5 font-semibold">
                      Thuộc chương trình khuyến mãi
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      Tiến độ lượt dùng (Tổng)
                    </th>
                    <th className="px-5 py-3.5 font-semibold">
                      Giới hạn / Khách hàng
                    </th>
                    <th className="px-5 py-3.5 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCoupons.map((coupon) => {
                    const promo = promoById.get(coupon.promotionId)
                    const exhausted =
                      coupon.maxUses !== null &&
                      coupon.usedCount >= coupon.maxUses

                    return (
                      <tr
                        key={coupon.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <CopyCodeBadge
                            code={coupon.code}
                            variant="ticket"
                            onCopied={(c) =>
                              toast.success(`Đã sao chép mã Coupon ${c}`)
                            }
                          />
                          <p className="mt-1 text-[11px] text-slate-400">
                            Tạo ngày {coupon.createdAt.slice(0, 10)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {promo ? (
                            <div>
                              <p className="font-semibold text-[#163d36]">
                                {promo.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                <span className="font-mono font-medium text-slate-700">
                                  {promo.code}
                                </span>{" "}
                                ·{" "}
                                {promo.discountType === "PERCENT"
                                  ? `Giảm ${promo.discountValue}%`
                                  : `Giảm ${formatMoney(promo.discountValue)}`}{" "}
                                · Đơn từ {formatMoney(promo.minOrderAmount)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Chương trình #{coupon.promotionId.slice(0, 8)}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <UsageProgressBar
                            used={coupon.usedCount}
                            limit={coupon.maxUses}
                            unitLabel=" lượt"
                          />
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-700">
                          {coupon.maxUsesPerCustomer ? (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 font-medium">
                              Tối đa {coupon.maxUsesPerCustomer} lượt / khách
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Không giới hạn / khách
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <AnimatedSwitch
                              checked={coupon.status === "ACTIVE"}
                              onChange={() =>
                                void handleToggleCouponStatus(coupon)
                              }
                              label={`Bật hoặc tắt mã ${coupon.code}`}
                            />
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                coupon.status !== "ACTIVE"
                                  ? "bg-slate-100 text-slate-500"
                                  : exhausted
                                    ? "bg-red-50 text-red-600"
                                    : "bg-[#e6f5ee] text-[#147853]"
                              }`}
                            >
                              {coupon.status !== "ACTIVE"
                                ? "Đã khóa"
                                : exhausted
                                  ? "Hết lượt"
                                  : "Sẵn sàng"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSimCode(coupon.code)
                                handleChangeTab("simulator")
                              }}
                              className="rounded-lg border border-[#cce8dc] bg-[#f2fbf6] px-2.5 py-1.5 text-xs font-semibold text-[#147853] transition hover:bg-[#e6f5ee]"
                            >
                              Thử mã
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCoupon(coupon)
                                setPreselectedPromoId(coupon.promotionId)
                                setCouponModalOpen(true)
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Hạn mức
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: SIMULATOR */}
      {tab === "simulator" && (
        <section className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={(e) => void runCouponSimulation(e)}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-7"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[#163d36]">
                  Bộ mô phỏng kiểm thử điều kiện Coupon
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Kiểm tra chính xác mức chiết khấu, điều kiện chi nhánh, kênh bán và nhóm khách trước khi tung chiến dịch.
                </p>
              </div>
              <Calculator size={22} className="text-[#16866f]" />
            </div>

            {coupons.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Chọn nhanh mã có sẵn
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {coupons.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSimCode(c.code)}
                      className={`rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition ${
                        simCode.trim().toUpperCase() === c.code
                          ? "border-[#16866f] bg-[#e6f5ee] text-[#147853]"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Mã Coupon cần kiểm tra *
                <input
                  required
                  value={simCode}
                  onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                  placeholder="VD: HE2026"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold uppercase text-[#163d36] outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
                />
              </label>

              <label className="text-xs font-medium text-slate-600">
                Giá trị giỏ hàng (VND) *
                <input
                  required
                  type="number"
                  min={0}
                  step={1000}
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums text-slate-800 outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
                />
              </label>

              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">
                    Mức giỏ hàng mẫu:
                  </span>
                  {[150000, 350000, 650000, 1200000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSimAmount(String(preset))}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-[#16866f]/40 hover:bg-[#f2fbf6] hover:text-[#147853]"
                    >
                      {formatMoney(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="text-xs font-medium text-slate-600">
                Chi nhánh bán hàng *
                <select
                  value={simBranchId}
                  onChange={(e) => setSimBranchId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-600">
                Kênh phát sinh đơn
                <select
                  value={simChannel}
                  onChange={(e) => setSimChannel(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
                >
                  {CHANNEL_OPTIONS.map((ch) => (
                    <option key={ch.value} value={ch.value}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Nhóm khách hàng (tuỳ chọn)
                <select
                  value={simGroupId}
                  onChange={(e) => setSimGroupId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
                >
                  <option value="">Khách lẻ vãng lai (Chưa phân nhóm)</option>
                  {customerGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                disabled={simLoading}
                className="bg-[#16866f] text-white hover:bg-[#0f705d]"
              >
                <Calculator size={15} className="mr-2" />
                {simLoading ? "Đang kiểm tra..." : "Kiểm tra áp dụng mã"}
              </Button>
            </div>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#16866f]">
              Hóa đơn mô phỏng thanh toán
            </p>

            {simError ? (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700"
              >
                <p className="font-semibold">Từ chối áp dụng mã giảm giá</p>
                <p className="mt-1 text-xs leading-relaxed">{simError}</p>
              </div>
            ) : simResult ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[#b8e2d2] bg-[#f2fbf6] p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147853]">
                      <CheckCircle2 size={15} />
                      Mã hợp lệ — Đủ điều kiện ưu đãi
                    </span>
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-xs font-bold text-[#163d36]">
                      {simResult.couponCode}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-[#163d36]">
                    {simResult.promotionName}
                  </p>
                </div>

                <div className="space-y-2.5 rounded-xl border border-slate-100 bg-[#fbfcfc] p-4 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tạm tính giỏ hàng</span>
                    <span className="font-medium tabular-nums">
                      {formatMoney(simResult.orderAmountVnd)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#147853]">
                    <span>
                      Chiết khấu Coupon (
                      {simResult.discountType === "PERCENT"
                        ? `${simResult.discountValue}%`
                        : "Cố định"}
                      )
                    </span>
                    <span className="font-semibold tabular-nums">
                      -{formatMoney(simResult.discountAmountVnd)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2.5 text-base font-bold text-[#163d36]">
                    <span>Khách cần thanh toán</span>
                    <span className="tabular-nums">
                      {formatMoney(simResult.finalAmountVnd)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <TicketPercent
                  size={30}
                  className="mx-auto text-slate-300"
                  strokeWidth={1.5}
                />
                <p className="mt-2.5 text-xs text-slate-500">
                  Nhập thông tin bên trái và bấm <strong>Kiểm tra áp dụng mã</strong> để xem chi tiết chiết khấu.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal: Create / Edit Promotion */}
      {promoModalOpen && (
        <PromotionFormModal
          initial={editingPromotion}
          branches={branches}
          customerGroups={customerGroups}
          isDemo={isDemo}
          onClose={() => setPromoModalOpen(false)}
          onSaved={async (saved, isCreate) => {
            if (isDemo) {
              setDemoPromotions((prev) =>
                isCreate
                  ? [saved, ...prev]
                  : prev.map((p) => (p.id === saved.id ? saved : p))
              )
            } else {
              await queryClient.invalidateQueries({
                queryKey: ["sales-promotions"]
              })
            }
            setPromoModalOpen(false)
            toast.success(
              isCreate
                ? `Đã tạo chương trình khuyến mãi ${saved.code}`
                : `Đã cập nhật chương trình ${saved.code}`
            )
          }}
        />
      )}

      {/* Modal: Create / Edit Coupon */}
      {couponModalOpen && (
        <CouponFormModal
          initial={editingCoupon}
          promotions={promotions}
          defaultPromotionId={preselectedPromoId}
          isDemo={isDemo}
          onClose={() => setCouponModalOpen(false)}
          onSaved={async (saved, isCreate) => {
            if (isDemo) {
              setDemoCoupons((prev) =>
                isCreate
                  ? [saved, ...prev]
                  : prev.map((c) => (c.id === saved.id ? saved : c))
              )
            } else {
              await queryClient.invalidateQueries({
                queryKey: ["sales-coupons"]
              })
            }
            setCouponModalOpen(false)
            toast.success(
              isCreate
                ? `Đã phát hành mã Coupon ${saved.code}`
                : `Đã cập nhật hạn mức mã ${saved.code}`
            )
          }}
        />
      )}
    </main>
  )
}

function PromotionFormModal({
  initial,
  branches,
  customerGroups,
  isDemo,
  onClose,
  onSaved
}: {
  initial: PromotionApi | null
  branches: Array<{ id: string; name: string }>
  customerGroups: CustomerGroupLite[]
  isDemo: boolean
  onClose: () => void
  onSaved: (promo: PromotionApi, isCreate: boolean) => Promise<void>
}) {
  const isEdit = Boolean(initial)
  const [code, setCode] = useState(initial?.code ?? generateRandomCode("PROMO"))
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [discountType, setDiscountType] = useState<PromotionDiscountType>(
    initial?.discountType ?? "PERCENT"
  )
  const [discountValue, setDiscountValue] = useState(
    String(initial?.discountValue ?? 10)
  )
  const [minOrderAmount, setMinOrderAmount] = useState(
    String(initial?.minOrderAmount ?? 200000)
  )
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    initial?.maxDiscountAmount ? String(initial.maxDiscountAmount) : ""
  )
  const [branchId, setBranchId] = useState(initial?.branchId ?? "")
  const [channelTypes, setChannelTypes] = useState<string[]>(
    initial?.channelTypes ?? []
  )
  const [customerGroupIds, setCustomerGroupIds] = useState<string[]>(
    initial?.customerGroupIds ?? []
  )
  const [startsAt, setStartsAt] = useState(
    initial?.startsAt ? initial.startsAt.slice(0, 10) : ""
  )
  const [endsAt, setEndsAt] = useState(
    initial?.endsAt ? initial.endsAt.slice(0, 10) : ""
  )
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const toggleChannel = (val: string) => {
    setChannelTypes((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    )
  }

  const toggleGroup = (id: string) => {
    setCustomerGroupIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const naturalSummary = useMemo(() => {
    const valNum = Number(discountValue) || 0
    const discountPart =
      discountType === "PERCENT"
        ? `Giảm ${valNum}%${
            maxDiscountAmount
              ? ` (tối đa ${formatMoney(Number(maxDiscountAmount))})`
              : ""
          }`
        : `Giảm trực tiếp ${formatMoney(valNum)}`
    const minPart =
      Number(minOrderAmount) > 0
        ? ` cho đơn từ ${formatMoney(Number(minOrderAmount))}`
        : " cho mọi giá trị đơn hàng"
    const branchPart = branchId
      ? ` tại ${branches.find((b) => b.id === branchId)?.name ?? "chi nhánh đã chọn"}`
      : " trên toàn hệ thống chi nhánh"
    const channelPart =
      channelTypes.length > 0
        ? `, kênh ${channelTypes.join(", ")}`
        : ", áp dụng mọi kênh bán"
    const groupPart =
      customerGroupIds.length > 0
        ? `, dành riêng cho ${customerGroupIds.length} nhóm khách hàng ưu tiên.`
        : "."
    return `${discountPart}${minPart}${branchPart}${channelPart}${groupPart}`
  }, [
    branchId,
    branches,
    channelTypes,
    customerGroupIds.length,
    discountType,
    discountValue,
    maxDiscountAmount,
    minOrderAmount
  ])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError("")
    const valNum = Number(discountValue)
    const minNum = Number(minOrderAmount || 0)
    const maxNum = maxDiscountAmount.trim() ? Number(maxDiscountAmount) : null

    if (!name.trim()) {
      setFormError("Vui lòng nhập tên chương trình khuyến mãi.")
      return
    }
    if (!valNum || valNum <= 0) {
      setFormError("Giá trị chiết khấu phải lớn hơn 0.")
      return
    }
    if (discountType === "PERCENT" && valNum > 100) {
      setFormError("Phần trăm chiết khấu không được vượt quá 100%.")
      return
    }
    if (discountType === "FIXED" && !Number.isInteger(valNum)) {
      setFormError("Số tiền giảm VND phải là số nguyên.")
      return
    }
    if (startsAt && endsAt && startsAt > endsAt) {
      setFormError("Ngày bắt đầu không được lớn hơn ngày kết thúc.")
      return
    }

    setSubmitting(true)
    try {
      const payload: CreatePromotionInput = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue: valNum,
        minOrderAmount: Math.round(minNum),
        maxDiscountAmount:
          discountType === "PERCENT" && maxNum ? Math.round(maxNum) : null,
        branchId: branchId || null,
        channelTypes,
        customerGroupIds,
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00Z`).toISOString() : null,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59Z`).toISOString() : null
      }

      if (isDemo) {
        const mockSaved: PromotionApi = {
          id: initial?.id ?? crypto.randomUUID(),
          code: initial?.code ?? payload.code,
          name: payload.name,
          description: payload.description ?? null,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          minOrderAmount: payload.minOrderAmount ?? 0,
          maxDiscountAmount: payload.maxDiscountAmount ?? null,
          branchId: payload.branchId ?? null,
          channelTypes: payload.channelTypes ?? [],
          customerGroupIds: payload.customerGroupIds ?? [],
          startsAt: payload.startsAt ?? null,
          endsAt: payload.endsAt ?? null,
          status: initial?.status ?? "ACTIVE",
          createdAt: initial?.createdAt ?? new Date().toISOString()
        }
        await onSaved(mockSaved, !isEdit)
      } else if (isEdit && initial) {
        const { code: _unusedCode, ...patchPayload } = payload
        const updated = await updatePromotion(initial.id, patchPayload)
        await onSaved(updated, false)
      } else {
        const created = await createPromotion(payload)
        await onSaved(created, true)
      }
    } catch (error) {
      setFormError(
        extractErrorMessage(error, "Không thể lưu chương trình khuyến mãi.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Chỉnh sửa khuyến mãi" : "Tạo chương trình khuyến mãi"}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#16866f]">
              Thiết lập quy tắc ưu đãi
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-[#163d36]">
              {isEdit
                ? `Chỉnh sửa chiến dịch ${initial?.code}`
                : "Tạo chương trình khuyến mãi mới"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[74vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Live rule summary banner */}
          <div className="rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-3.5 text-xs text-[#147853]">
            <p className="font-bold uppercase tracking-wider text-[#16866f]">
              Tóm tắt quy tắc tự động
            </p>
            <p className="mt-1 leading-relaxed text-[#163d36]">
              {naturalSummary}
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Mã chương trình *
              <div className="mt-1 flex gap-1.5">
                <input
                  required
                  disabled={isEdit}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={48}
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold uppercase text-[#163d36] outline-none focus:border-[#16866f] disabled:bg-slate-100"
                />
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setCode(generateRandomCode("PROMO"))}
                    title="Sinh mã tự động"
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Wand2 size={14} />
                  </button>
                )}
              </div>
            </label>

            <label className="text-xs font-medium text-slate-600">
              Tên chiến dịch khuyến mãi *
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={160}
                placeholder="VD: Ưu đãi Hè Đa Kênh - Giảm 15%"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Mô tả / Ghi chú nội bộ
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="Điều kiện truyền thông hoặc hướng dẫn cho thu ngân..."
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="text-xs font-medium text-slate-600">
              Hình thức giảm giá *
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as PromotionDiscountType)
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="PERCENT">Theo phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (VND)</option>
              </select>
            </label>

            <label className="text-xs font-medium text-slate-600">
              {discountType === "PERCENT"
                ? "Mức giảm (%) *"
                : "Số tiền giảm (VND) *"}
              <input
                required
                type="number"
                min={discountType === "PERCENT" ? 1 : 1000}
                max={discountType === "PERCENT" ? 100 : undefined}
                step={discountType === "PERCENT" ? "0.5" : "1000"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums text-slate-800 outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="text-xs font-medium text-slate-600">
              Giá trị đơn hàng tối thiểu (VND)
              <input
                type="number"
                min={0}
                step={1000}
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums text-slate-700 outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="text-xs font-medium text-slate-600">
              Trần giảm tối đa (VND, cho loại %)
              <input
                type="number"
                min={0}
                step={1000}
                disabled={discountType !== "PERCENT"}
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                placeholder="Bỏ trống = Không giới hạn"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums text-slate-700 outline-none focus:border-[#16866f] disabled:bg-slate-100"
              />
            </label>

            <label className="text-xs font-medium text-slate-600">
              Chi nhánh áp dụng
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="">Toàn bộ chi nhánh cửa hàng</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-slate-600">
                Từ ngày
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#16866f]"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Đến ngày
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#16866f]"
                />
              </label>
            </div>
          </div>

          {/* Channel selection pills */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                Kênh bán hàng được áp dụng
              </span>
              <span className="text-[11px] text-slate-400">
                {channelTypes.length === 0
                  ? "Đang chọn: Mọi kênh bán"
                  : `Giới hạn ${channelTypes.length} kênh`}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((ch) => {
                const active = channelTypes.includes(ch.value)
                return (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-[#16866f] bg-[#e6f5ee] text-[#147853]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {ch.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Customer group selection pills */}
          {customerGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Nhóm khách hàng đủ điều kiện
                </span>
                <span className="text-[11px] text-slate-400">
                  {customerGroupIds.length === 0
                    ? "Đang chọn: Mọi khách hàng"
                    : `Giới hạn ${customerGroupIds.length} nhóm`}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {customerGroups.map((g) => {
                  const active = customerGroupIds.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            {submitting
              ? "Đang lưu..."
              : isEdit
                ? "Lưu thay đổi"
                : "Tạo chương trình"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function CouponFormModal({
  initial,
  promotions,
  defaultPromotionId,
  isDemo,
  onClose,
  onSaved
}: {
  initial: CouponApi | null
  promotions: PromotionApi[]
  defaultPromotionId: string
  isDemo: boolean
  onClose: () => void
  onSaved: (coupon: CouponApi, isCreate: boolean) => Promise<void>
}) {
  const isEdit = Boolean(initial)
  const [promotionId, setPromotionId] = useState(
    initial?.promotionId ?? defaultPromotionId ?? promotions[0]?.id ?? ""
  )
  const [code, setCode] = useState(
    initial?.code ?? generateRandomCode("VOUCHER")
  )
  const [maxUses, setMaxUses] = useState(
    initial?.maxUses ? String(initial.maxUses) : "100"
  )
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(
    initial?.maxUsesPerCustomer ? String(initial.maxUsesPerCustomer) : "1"
  )
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError("")
    const maxTotal = maxUses.trim() ? Number(maxUses) : null
    const maxPerCust = maxUsesPerCustomer.trim()
      ? Number(maxUsesPerCustomer)
      : null

    if (!promotionId) {
      setFormError("Vui lòng chọn chương trình khuyến mãi gốc.")
      return
    }
    if (!code.trim()) {
      setFormError("Vui lòng nhập mã Coupon.")
      return
    }
    if (maxTotal !== null && (!Number.isInteger(maxTotal) || maxTotal < 1)) {
      setFormError("Tổng lượt dùng tối đa phải là số nguyên dương.")
      return
    }
    if (
      maxPerCust !== null &&
      (!Number.isInteger(maxPerCust) || maxPerCust < 1)
    ) {
      setFormError("Giới hạn mỗi khách hàng phải là số nguyên dương.")
      return
    }

    setSubmitting(true)
    try {
      if (isDemo) {
        const mockCoupon: CouponApi = {
          id: initial?.id ?? crypto.randomUUID(),
          promotionId,
          code: initial?.code ?? code.trim().toUpperCase(),
          maxUses: maxTotal,
          maxUsesPerCustomer: maxPerCust,
          usedCount: initial?.usedCount ?? 0,
          status: initial?.status ?? "ACTIVE",
          createdAt: initial?.createdAt ?? new Date().toISOString()
        }
        await onSaved(mockCoupon, !isEdit)
      } else if (isEdit && initial) {
        const updated = await updateCoupon(initial.id, {
          maxUses: maxTotal,
          maxUsesPerCustomer: maxPerCust
        })
        await onSaved(updated, false)
      } else {
        const payload: CreateCouponInput = {
          promotionId,
          code: code.trim().toUpperCase(),
          maxUses: maxTotal,
          maxUsesPerCustomer: maxPerCust
        }
        const created = await createCoupon(payload)
        await onSaved(created, true)
      }
    } catch (error) {
      setFormError(
        extractErrorMessage(error, "Không thể lưu mã Coupon.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#163d36]/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Cập nhật hạn mức Coupon" : "Phát hành mã Coupon"}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#16866f]">
              Quản lý Voucher &amp; Hạn mức
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-[#163d36]">
              {isEdit
                ? `Cập nhật hạn mức mã ${initial?.code}`
                : "Phát hành mã giảm giá (Coupon)"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              {formError}
            </div>
          )}

          <label className="block text-xs font-medium text-slate-600">
            Thuộc chương trình khuyến mãi *
            <select
              disabled={isEdit}
              value={promotionId}
              onChange={(e) => setPromotionId(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f] disabled:bg-slate-100"
            >
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Mã Coupon khách nhập khi thanh toán *
            <div className="mt-1 flex gap-1.5">
              <input
                required
                disabled={isEdit}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={48}
                className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-bold uppercase text-[#163d36] outline-none focus:border-[#16866f] disabled:bg-slate-100"
              />
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => setCode(generateRandomCode("SALE"))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Wand2 size={14} />
                  Sinh mã
                </button>
              )}
            </div>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Tổng số lượt dùng tối đa
              <input
                type="number"
                min={1}
                step={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Trống = Không giới hạn"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums text-slate-700 outline-none focus:border-[#16866f]"
              />
            </label>

            <label className="text-xs font-medium text-slate-600">
              Giới hạn lượt / 1 Khách hàng
              <input
                type="number"
                min={1}
                step={1}
                value={maxUsesPerCustomer}
                onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
                placeholder="Trống = Không giới hạn"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums text-slate-700 outline-none focus:border-[#16866f]"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            {submitting
              ? "Đang lưu..."
              : isEdit
                ? "Cập nhật hạn mức"
                : "Phát hành mã ngay"}
          </Button>
        </div>
      </form>
    </div>
  )
}
