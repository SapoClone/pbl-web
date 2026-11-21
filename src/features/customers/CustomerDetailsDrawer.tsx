import { type FormEvent, useEffect, useMemo, useState } from "react"
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  ShoppingBag,
  Star,
  Trash2,
  Wallet
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { SlideOverDrawer } from "@/components/ui/drawer"
import {
  ChannelBadge,
  CopyCodeBadge,
  SegmentedTabs,
  UsageProgressBar
} from "@/components/ui/micro-ux"
import { useToast } from "@/components/ui/toast"
import {
  addCustomerAddress,
  getCustomer360Summary,
  listCustomerAddresses,
  type CustomerAddressItem
} from "@/api/customer/customers"
import {
  adjustCustomerLoyaltyPoints,
  assignCustomerGroup,
  deleteCustomerAddress,
  getCustomerLoyaltyAccount,
  getCustomerMembership,
  listCustomerLoyaltyTransactions,
  setDefaultCustomerAddress,
  updateCustomerAddress,
  type CustomerGroupItem,
  type LoyaltyTransactionItem,
  type MembershipTierItem
} from "@/api/customer/crm"
import {
  getCustomerDebt,
  recordCustomerDebtPayment,
  type CustomerDebtSummary,
  type ReceivablePaymentMethod
} from "@/api/finance/receivables"
import { listBranches } from "@/api/platform/branches"
import { listOrders, type OrderApi } from "@/api/sales/orders"
import {
  buildDemoCustomerAddresses,
  buildDemoCustomerDebt,
  buildDemoCustomerOrders,
  buildDemoLoyaltyTransactions,
  type CrmCustomerRecord
} from "./crm.demo"

export type CustomerDetailTab = "orders" | "loyalty" | "debt" | "addresses"

const formatVnd = (value: number | string | null | undefined) =>
  `${Math.round(Number(value ?? 0)).toLocaleString("vi-VN")}đ`

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

const inputCls =
  "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

export function CustomerDetailsDrawer({
  customer,
  initialTab = "orders",
  isDemo,
  groups,
  tiers,
  onClose,
  onCustomerPatch
}: {
  customer: CrmCustomerRecord | null
  initialTab?: CustomerDetailTab
  isDemo: boolean
  groups: CustomerGroupItem[]
  tiers: MembershipTierItem[]
  onClose: () => void
  onCustomerPatch: (
    customerId: string,
    patch: Partial<CrmCustomerRecord>
  ) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<CustomerDetailTab>(initialTab)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // Local interactive states for Demo / fallback mode
  const [demoTxList, setDemoTxList] = useState<LoyaltyTransactionItem[]>([])
  const [demoDebt, setDemoDebt] = useState<CustomerDebtSummary | null>(null)
  const [demoAddresses, setDemoAddresses] = useState<CustomerAddressItem[]>([])

  // Loyalty adjustment form
  const [adjustPointsInput, setAdjustPointsInput] = useState("50")
  const [adjustDirection, setAdjustDirection] = useState<"ADD" | "DEDUCT">("ADD")
  const [adjustReason, setAdjustReason] = useState("")
  const [adjusting, setAdjusting] = useState(false)

  // Debt payment form
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] =
    useState<ReceivablePaymentMethod>("BANK_TRANSFER")
  const [payBranchId, setPayBranchId] = useState("")
  const [payNote, setPayNote] = useState("")
  const [payingDebt, setPayingDebt] = useState(false)

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] =
    useState<CustomerAddressItem | null>(null)
  const [addrRecipient, setAddrRecipient] = useState("")
  const [addrPhone, setAddrPhone] = useState("")
  const [addrLine, setAddrLine] = useState("")
  const [addrWard, setAddrWard] = useState("")
  const [addrDistrict, setAddrDistrict] = useState("")
  const [addrProvince, setAddrProvince] = useState("")
  const [addrDefault, setAddrDefault] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, customer?.id])

  useEffect(() => {
    if (!customer) return
    setDemoTxList(buildDemoLoyaltyTransactions(customer))
    const d = buildDemoCustomerDebt(customer)
    setDemoDebt(d)
    setPayAmount(
      Number(d.postedDebt) > 0 ? String(Math.round(Number(d.postedDebt))) : ""
    )
    setDemoAddresses(buildDemoCustomerAddresses(customer))
    setShowAddressForm(false)
    setEditingAddress(null)
  }, [customer?.id])

  const canQueryLive = Boolean(customer && !isDemo && isUuid(customer.id))
  const cid = customer?.id ?? ""

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: Boolean(customer && !isDemo)
  })

  const liveBranches = branchesQuery.data?.data ?? []
  useEffect(() => {
    if (!payBranchId && liveBranches.length > 0) {
      setPayBranchId(liveBranches[0].id)
    }
  }, [liveBranches, payBranchId])

  const summary360Query = useQuery({
    queryKey: ["customer-360", cid],
    queryFn: () => getCustomer360Summary(cid).catch(() => null),
    enabled: canQueryLive
  })

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", cid],
    queryFn: () =>
      listOrders({ customerId: cid, page: 1, limit: 25 })
        .then((res) => res.data ?? [])
        .catch(() => [] as OrderApi[]),
    enabled: canQueryLive
  })

  const loyaltyAccountQuery = useQuery({
    queryKey: ["customer-loyalty-account", cid],
    queryFn: () => getCustomerLoyaltyAccount(cid).catch(() => null),
    enabled: canQueryLive
  })

  const membershipQuery = useQuery({
    queryKey: ["customer-membership", cid],
    queryFn: () => getCustomerMembership(cid).catch(() => null),
    enabled: canQueryLive
  })

  const loyaltyTxQuery = useQuery({
    queryKey: ["customer-loyalty-tx", cid],
    queryFn: () =>
      listCustomerLoyaltyTransactions(cid, { page: 1, limit: 30 })
        .then((res) => res.data ?? [])
        .catch(() => [] as LoyaltyTransactionItem[]),
    enabled: canQueryLive
  })

  const debtQuery = useQuery({
    queryKey: ["customer-debt", cid],
    queryFn: () => getCustomerDebt(cid).catch(() => null),
    enabled: canQueryLive
  })

  const addressesQuery = useQuery({
    queryKey: ["customer-addresses", cid],
    queryFn: () => listCustomerAddresses(cid).catch(() => []),
    enabled: canQueryLive
  })

  const sortedTiers = useMemo(
    () =>
      [...tiers]
        .filter((t) => t.status === "ACTIVE")
        .sort((a, b) => a.minPoints - b.minPoints),
    [tiers]
  )

  if (!customer) {
    return null
  }

  const orders: OrderApi[] = canQueryLive
    ? (ordersQuery.data ?? [])
    : buildDemoCustomerOrders(customer)

  const loyaltyTransactions: LoyaltyTransactionItem[] = canQueryLive
    ? (loyaltyTxQuery.data ?? [])
    : demoTxList

  const debtSummary: CustomerDebtSummary =
    canQueryLive && debtQuery.data
      ? debtQuery.data
      : (demoDebt ?? buildDemoCustomerDebt(customer))

  const addresses: CustomerAddressItem[] = canQueryLive
    ? (addressesQuery.data ?? [])
    : demoAddresses

  const availablePoints =
    loyaltyAccountQuery.data?.availablePoints ??
    summary360Query.data?.loyalty?.pointsBalance ??
    customer.pointsBalance

  const heldPoints = loyaltyAccountQuery.data?.heldPoints ?? 0
  const qualifyingPoints =
    membershipQuery.data?.qualifyingPoints ??
    loyaltyAccountQuery.data?.qualifyingPoints ??
    availablePoints

  // Determine current & next tier
  const resolvedCurrentTier =
    membershipQuery.data?.currentTier ??
    [...sortedTiers]
      .reverse()
      .find((t) => qualifyingPoints >= t.minPoints) ??
    sortedTiers[0] ??
    null

  const resolvedNextTier =
    membershipQuery.data?.nextTier ??
    sortedTiers.find((t) => t.minPoints > qualifyingPoints) ??
    null

  const currentDebtVnd = Number(debtSummary.postedDebt ?? customer.currentDebt ?? 0)
  const creditLimitVnd = Number(
    debtSummary.creditLimit ?? customer.debtLimit ?? 5000000
  )

  const totalOrderSpent = orders.reduce(
    (sum, o) => sum + Number(o.totalAmount ?? 0),
    0
  )

  const handleAssignGroup = async (nextGroupId: string) => {
    const val = nextGroupId || null
    try {
      if (canQueryLive) {
        await assignCustomerGroup(customer.id, val)
        await queryClient.invalidateQueries({ queryKey: ["customers-list"] })
      }
      onCustomerPatch(customer.id, { customerGroupId: val })
      const grpName =
        groups.find((g) => g.id === val)?.name ?? "Chưa phân nhóm"
      toast({
        title: "Đã cập nhật nhóm khách hàng",
        description: `${customer.name} thuộc nhóm: ${grpName}.`,
        variant: "success"
      })
    } catch {
      toast({
        title: "Không thể gán nhóm khách hàng",
        variant: "error"
      })
    }
  }

  const handleAdjustPoints = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const absPts = Math.round(Math.abs(Number(adjustPointsInput) || 0))
    if (absPts <= 0) {
      toast({
        title: "Vui lòng nhập số điểm lớn hơn 0",
        variant: "warning"
      })
      return
    }
    if (!adjustReason.trim()) {
      toast({
        title: "Cần nhập lý do điều chỉnh điểm",
        description: "Sổ cái điểm bắt buộc lưu vết lý do cộng/trừ điểm.",
        variant: "warning"
      })
      return
    }

    const signedPoints = adjustDirection === "ADD" ? absPts : -absPts
    if (signedPoints < 0 && availablePoints + signedPoints < 0) {
      toast({
        title: "Số điểm trừ vượt quá số dư khả dụng",
        variant: "error"
      })
      return
    }

    setAdjusting(true)
    try {
      if (canQueryLive) {
        const res = await adjustCustomerLoyaltyPoints(customer.id, {
          points: signedPoints,
          reason: adjustReason.trim()
        })
        onCustomerPatch(customer.id, {
          pointsBalance: res.availablePoints ?? res.balance
        })
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["customer-loyalty-account", customer.id]
          }),
          queryClient.invalidateQueries({
            queryKey: ["customer-loyalty-tx", customer.id]
          }),
          queryClient.invalidateQueries({
            queryKey: ["customer-membership", customer.id]
          })
        ])
      } else {
        const nextBalance = Math.max(0, availablePoints + signedPoints)
        const newTx: LoyaltyTransactionItem = {
          id: `ltx-${Date.now()}`,
          type: "adjust",
          points: signedPoints,
          balanceAfter: nextBalance,
          orderCode: null,
          reason: adjustReason.trim(),
          createdAt: new Date().toISOString()
        }
        setDemoTxList((prev) => [newTx, ...prev])
        onCustomerPatch(customer.id, { pointsBalance: nextBalance })
      }
      setAdjustReason("")
      toast({
        title:
          signedPoints > 0
            ? `Đã cộng +${absPts} điểm thưởng`
            : `Đã trừ -${absPts} điểm thưởng`,
        description: `Hồ sơ ${customer.name} đã cập nhật sổ cái điểm.`,
        variant: "success"
      })
    } catch {
      toast({
        title: "Điều chỉnh điểm thất bại",
        description: "Vui lòng kiểm tra số dư điểm hoặc quyền thao tác.",
        variant: "error"
      })
    } finally {
      setAdjusting(false)
    }
  }

  const handleRecordDebtPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const amt = Math.round(Number(payAmount) || 0)
    if (amt <= 0) {
      toast({
        title: "Số tiền thu nợ phải lớn hơn 0đ",
        variant: "warning"
      })
      return
    }

    setPayingDebt(true)
    try {
      if (canQueryLive) {
        const targetBranch =
          payBranchId || liveBranches[0]?.id || "11111111-1111-4111-8111-111111111101"
        const res = await recordCustomerDebtPayment(customer.id, {
          amount: amt,
          paymentMethod: payMethod,
          branchId: targetBranch,
          note: payNote.trim() || undefined
        })
        const nextDebt = Number(res.customerTotalDebtAfter ?? 0)
        onCustomerPatch(customer.id, { currentDebt: nextDebt })
        await queryClient.invalidateQueries({
          queryKey: ["customer-debt", customer.id]
        })
      } else {
        const before = Number(debtSummary.postedDebt ?? 0)
        const after = Math.max(0, before - amt)
        const overpay = amt > before ? amt - before : 0
        setDemoDebt((prev) => {
          const cur = prev ?? debtSummary
          let rem = amt
          const updatedRecs = cur.receivables.map((r) => {
            const out = Number(r.outstandingAmount ?? 0)
            if (rem <= 0 || out <= 0) return r
            const applied = Math.min(out, rem)
            rem -= applied
            const nextOut = out - applied
            return {
              ...r,
              paidAmount: Number(r.paidAmount ?? 0) + applied,
              outstandingAmount: nextOut,
              status: nextOut === 0 ? "PAID" : "PARTIALLY_PAID"
            }
          })
          return {
            ...cur,
            postedDebt: after,
            availableCredit: Math.max(0, creditLimitVnd - after),
            prepaymentBalance: Number(cur.prepaymentBalance ?? 0) + overpay,
            openReceivablesCount: updatedRecs.filter(
              (r) => r.status === "OPEN" || r.status === "PARTIALLY_PAID"
            ).length,
            receivables: updatedRecs,
            ledger: [
              {
                id: `ldg-${Date.now()}`,
                customerId: customer.id,
                entryType: "PAYMENT_APPLIED",
                amountDelta: -Math.min(before, amt),
                balanceBefore: before,
                balanceAfter: after,
                paymentMethod: payMethod,
                note: payNote.trim() || "Thu nợ trực tiếp trên Hồ sơ 360°",
                occurredAt: new Date().toISOString()
              },
              ...cur.ledger
            ]
          }
        })
        onCustomerPatch(customer.id, { currentDebt: after })
        setPayAmount(after > 0 ? String(after) : "")
      }
      setPayNote("")
      toast({
        title: "Đã ghi nhận phiếu thu công nợ",
        description: `Đã thu ${formatVnd(amt)} từ khách hàng ${customer.name}.`,
        variant: "success"
      })
    } catch {
      toast({
        title: "Không thể ghi nhận thu nợ",
        description: "Kiểm tra chi nhánh thu quỹ hoặc khoản phải thu đang mở.",
        variant: "error"
      })
    } finally {
      setPayingDebt(false)
    }
  }

  const openNewAddress = () => {
    setEditingAddress(null)
    setAddrRecipient(customer.name)
    setAddrPhone(customer.phone)
    setAddrLine("")
    setAddrWard("")
    setAddrDistrict("")
    setAddrProvince("TP. Hồ Chí Minh")
    setAddrDefault(addresses.length === 0)
    setShowAddressForm(true)
  }

  const openEditAddress = (addr: CustomerAddressItem) => {
    setEditingAddress(addr)
    setAddrRecipient(addr.recipientName ?? customer.name)
    setAddrPhone(addr.phone ?? customer.phone)
    setAddrLine(addr.addressLine)
    setAddrWard(addr.ward ?? "")
    setAddrDistrict(addr.district ?? "")
    setAddrProvince(addr.province ?? "")
    setAddrDefault(Boolean(addr.isDefault))
    setShowAddressForm(true)
  }

  const handleSaveAddress = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!addrLine.trim()) {
      toast({ title: "Vui lòng nhập địa chỉ chi tiết", variant: "warning" })
      return
    }
    setSavingAddress(true)
    try {
      const payload = {
        recipientName: addrRecipient.trim() || customer.name,
        phone: addrPhone.trim() || customer.phone,
        addressLine: addrLine.trim(),
        ward: addrWard.trim() || undefined,
        district: addrDistrict.trim() || undefined,
        province: addrProvince.trim() || undefined,
        isDefault: addrDefault
      }

      if (editingAddress) {
        if (canQueryLive) {
          await updateCustomerAddress(customer.id, editingAddress.id, payload)
          await queryClient.invalidateQueries({
            queryKey: ["customer-addresses", customer.id]
          })
        } else {
          setDemoAddresses((prev) =>
            prev.map((a) => {
              if (a.id === editingAddress.id) {
                return { ...a, ...payload }
              }
              return addrDefault ? { ...a, isDefault: false } : a
            })
          )
        }
        toast({ title: "Đã cập nhật địa chỉ giao hàng", variant: "success" })
      } else {
        if (canQueryLive) {
          await addCustomerAddress(customer.id, payload)
          await queryClient.invalidateQueries({
            queryKey: ["customer-addresses", customer.id]
          })
        } else {
          const created: CustomerAddressItem = {
            id: `addr-${Date.now()}`,
            ...payload
          }
          setDemoAddresses((prev) => [
            ...(addrDefault
              ? prev.map((a) => ({ ...a, isDefault: false }))
              : prev),
            created
          ])
        }
        toast({ title: "Đã thêm địa chỉ giao hàng mới", variant: "success" })
      }

      if (addrDefault) {
        const fullAddr = [
          payload.addressLine,
          payload.ward,
          payload.district,
          payload.province
        ]
          .filter(Boolean)
          .join(", ")
        onCustomerPatch(customer.id, { address: fullAddr })
      }
      setShowAddressForm(false)
      setEditingAddress(null)
    } catch {
      toast({ title: "Không thể lưu địa chỉ giao hàng", variant: "error" })
    } finally {
      setSavingAddress(false)
    }
  }

  const handleSetDefaultAddress = async (addr: CustomerAddressItem) => {
    try {
      if (canQueryLive) {
        await setDefaultCustomerAddress(customer.id, addr.id)
        await queryClient.invalidateQueries({
          queryKey: ["customer-addresses", customer.id]
        })
      } else {
        setDemoAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a.id === addr.id }))
        )
      }
      const fullAddr = [addr.addressLine, addr.ward, addr.district, addr.province]
        .filter(Boolean)
        .join(", ")
      onCustomerPatch(customer.id, { address: fullAddr })
      toast({
        title: "Đã đặt địa chỉ giao hàng mặc định",
        variant: "success"
      })
    } catch {
      toast({ title: "Không thể đổi địa chỉ mặc định", variant: "error" })
    }
  }

  const handleDeleteAddress = async (addr: CustomerAddressItem) => {
    if (!window.confirm("Xóa địa chỉ giao hàng này khỏi sổ địa chỉ?")) return
    try {
      if (canQueryLive) {
        await deleteCustomerAddress(customer.id, addr.id)
        await queryClient.invalidateQueries({
          queryKey: ["customer-addresses", customer.id]
        })
      } else {
        setDemoAddresses((prev) => prev.filter((a) => a.id !== addr.id))
      }
      toast({ title: "Đã xóa địa chỉ giao hàng", variant: "info" })
    } catch {
      toast({ title: "Không thể xóa địa chỉ này", variant: "error" })
    }
  }

  return (
    <SlideOverDrawer
      open={Boolean(customer)}
      onClose={onClose}
      width="xl"
      eyebrow="Hồ sơ Khách hàng 360° (Omnichannel CRM)"
      title={customer.name}
      subtitle={`Mã KH: ${customer.code} · Tiếp nhận từ kênh ${customer.source}`}
    >
      <div className="space-y-6">
        {/* Top 360° Profile Summary Banner */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-[#f7faf9] via-white to-[#eef7f4] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#16866f] text-lg font-bold text-white shadow-sm">
                {customer.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ChannelBadge channel={customer.source} size="xs" />
                  <CopyCodeBadge
                    code={customer.memberCode || customer.code}
                    variant="ticket"
                    onCopied={(c) =>
                      toast({
                        title: `Đã sao chép mã hội viên ${c}`,
                        variant: "info"
                      })
                    }
                  />
                  {resolvedCurrentTier ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                      <Award size={12} />
                      {resolvedCurrentTier.name}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    {customer.phone}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail size={13} className="text-slate-400" />
                    {customer.email || "Chưa cập nhật email"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick CustomerGroup Assignment */}
            <div className="min-w-[200px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Nhóm khách hàng
                <select
                  value={customer.customerGroupId ?? ""}
                  onChange={(e) => void handleAssignGroup(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-[#163d36] outline-none focus:border-[#16866f]"
                >
                  <option value="">-- Chưa phân nhóm --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (
                      {Number(g.defaultDiscountRate ?? 0) > 0
                        ? `-${Number(g.defaultDiscountRate)}%`
                        : "0%"}
                      )
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* 3 Mini Metric Strip */}
          <div className="mt-4 grid gap-3 border-t border-slate-200/70 pt-3.5 sm:grid-cols-3">
            <div className="rounded-lg bg-white/90 px-3.5 py-2.5 shadow-sm">
              <p className="text-[11px] text-slate-400">Tổng chi tiêu ghi nhận</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-[#163d36]">
                {formatVnd(
                  summary360Query.data?.purchaseSummary?.totalSpent ??
                    totalOrderSpent
                )}
              </p>
            </div>
            <div className="rounded-lg bg-white/90 px-3.5 py-2.5 shadow-sm">
              <p className="text-[11px] text-slate-400">Điểm thưởng khả dụng</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-[#147853]">
                {availablePoints.toLocaleString("vi-VN")} điểm
              </p>
            </div>
            <div className="rounded-lg bg-white/90 px-3.5 py-2.5 shadow-sm">
              <p className="text-[11px] text-slate-400">Dư nợ phải thu hiện tại</p>
              <p
                className={`mt-0.5 text-sm font-bold tabular-nums ${
                  currentDebtVnd > 0 ? "text-amber-700" : "text-slate-700"
                }`}
              >
                {formatVnd(currentDebtVnd)}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Tabs Switcher */}
        <SegmentedTabs<CustomerDetailTab>
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Chi tiết hồ sơ khách hàng 360"
          className="w-full justify-start"
          tabs={[
            {
              value: "orders",
              label: "Lịch sử đơn hàng",
              icon: ShoppingBag,
              badge: orders.length
            },
            {
              value: "loyalty",
              label: "Điểm thưởng",
              icon: Coins,
              badge: availablePoints
            },
            {
              value: "debt",
              label: "Dư nợ & Công nợ",
              icon: Wallet,
              badge: debtSummary.openReceivablesCount,
              badgeTone:
                debtSummary.openReceivablesCount > 0 ? "warning" : "neutral"
            },
            {
              value: "addresses",
              label: "Sổ địa chỉ",
              icon: MapPin,
              badge: addresses.length
            }
          ]}
        />

        {/* TAB 1: PURCHASE ORDER HISTORY */}
        {activeTab === "orders" ? (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                Khách hàng chưa phát sinh đơn hàng nào trên hệ thống.
              </div>
            ) : (
              orders.map((order) => {
                const expanded = expandedOrderId === order.id
                return (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CopyCodeBadge code={order.code} variant="mono" />
                          <ChannelBadge
                            channel={order.channel?.type || customer.source}
                            size="xs"
                          />
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {order.orderStatus || order.status}
                          </span>
                          {order.paymentStatus === "PARTIALLY_PAID" ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              Thanh toán một phần
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleString("vi-VN")} ·{" "}
                          {order.channel?.name || "Cửa hàng"} ·{" "}
                          {order.itemCount || order.items?.length || 0} sản phẩm
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-[#163d36]">
                            {formatVnd(order.totalAmount)}
                          </p>
                          <p className="text-[11px] uppercase text-slate-400">
                            {order.paymentMethod}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOrderId(expanded ? null : order.id)
                          }
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          aria-label="Xem chi tiết mặt hàng"
                        >
                          {expanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {expanded && order.items?.length > 0 ? (
                      <div className="border-t border-slate-100 bg-[#fbfcfc] px-4 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-[10px] uppercase text-slate-400">
                              <th className="pb-2">SKU / Sản phẩm</th>
                              <th className="pb-2 text-right">SL</th>
                              <th className="pb-2 text-right">Đơn giá</th>
                              <th className="pb-2 text-right">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.items.map((it, idx) => (
                              <tr key={it.id ?? `${order.id}-${idx}`}>
                                <td className="py-2">
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {it.sku || it.skuCode}
                                  </span>
                                  <p className="font-medium text-slate-800">
                                    {it.name || it.productName}
                                  </p>
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                  x{it.quantity}
                                </td>
                                <td className="py-2 text-right tabular-nums text-slate-600">
                                  {formatVnd(it.unitPrice)}
                                </td>
                                <td className="py-2 text-right font-semibold tabular-nums text-[#163d36]">
                                  {formatVnd(it.lineTotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        ) : null}

        {/* TAB 2: LOYALTY TRANSACTIONS & MANUAL ADJUSTMENT */}
        {activeTab === "loyalty" ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#163d36]">
                    Tiến độ thăng hạng thành viên
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {resolvedNextTier
                      ? `Cần thêm ${Math.max(0, resolvedNextTier.minPoints - qualifyingPoints).toLocaleString("vi-VN")} điểm để lên ${resolvedNextTier.name}`
                      : "Khách hàng đã đạt hạng thành viên cao nhất!"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Tạm giữ POS:{" "}
                  <b className="tabular-nums text-slate-700">{heldPoints}</b> điểm
                </span>
              </div>
              {resolvedNextTier ? (
                <UsageProgressBar
                  used={qualifyingPoints}
                  limit={resolvedNextTier.minPoints}
                  unitLabel=" điểm"
                  className="mt-3"
                />
              ) : null}
            </div>

            {/* Manual Points Adjustment Form */}
            <form
              onSubmit={(e) => void handleAdjustPoints(e)}
              className="rounded-xl border border-[#16866f]/25 bg-[#f2fbf6]/60 p-4"
            >
              <p className="text-xs font-semibold text-[#163d36]">
                Điều chỉnh điểm thủ công (Ghi sổ cái bất biến)
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Nghiệp vụ
                    <select
                      value={adjustDirection}
                      onChange={(e) =>
                        setAdjustDirection(e.target.value as "ADD" | "DEDUCT")
                      }
                      className={inputCls}
                    >
                      <option value="ADD">+ Cộng điểm</option>
                      <option value="DEDUCT">- Trừ điểm</option>
                    </select>
                  </label>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Số điểm
                    <input
                      type="number"
                      min={1}
                      required
                      value={adjustPointsInput}
                      onChange={(e) => setAdjustPointsInput(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Lý do điều chỉnh *
                    <input
                      required
                      placeholder="VD: Bù điểm sự cố đơn hàng, Quà tri ân..."
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={adjusting}
                  className="bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
                >
                  {adjusting ? "Đang ghi sổ..." : "Xác nhận điều chỉnh điểm"}
                </Button>
              </div>
            </form>

            {/* Loyalty Ledger Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-[#163d36]">
                Sổ cái biến động điểm (LoyaltyTransaction)
              </div>
              {loyaltyTransactions.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-500">
                  Chưa có giao dịch điểm thưởng nào.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {loyaltyTransactions.map((tx) => {
                    const delta = Number(tx.points ?? tx.pointsDelta ?? 0)
                    const rawType = (
                      tx.type ||
                      tx.transactionType ||
                      "adjust"
                    ).toLowerCase()
                    const typeMeta: Record<
                      string,
                      { label: string; cls: string }
                    > = {
                      earn: {
                        label: "Tích điểm",
                        cls: "bg-emerald-50 text-emerald-700"
                      },
                      redeem: {
                        label: "Đổi điểm",
                        cls: "bg-sky-50 text-sky-700"
                      },
                      adjust: {
                        label: "Điều chỉnh",
                        cls: "bg-amber-50 text-amber-800"
                      },
                      manual_adjust: {
                        label: "Điều chỉnh",
                        cls: "bg-amber-50 text-amber-800"
                      },
                      expire: {
                        label: "Hết hạn",
                        cls: "bg-slate-100 text-slate-600"
                      },
                      reverse: {
                        label: "Hoàn điểm",
                        cls: "bg-rose-50 text-rose-700"
                      }
                    }
                    const badge = typeMeta[rawType] ?? {
                      label: rawType.toUpperCase(),
                      cls: "bg-slate-100 text-slate-600"
                    }
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                            {tx.orderCode ? (
                              <span className="font-mono text-[11px] text-slate-500">
                                #{tx.orderCode}
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-400">
                              {new Date(tx.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-700">
                            {tx.reason || "Giao dịch tích điểm tự động"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              delta >= 0 ? "text-[#147853]" : "text-rose-600"
                            }`}
                          >
                            {delta >= 0 ? `+${delta}` : delta} điểm
                          </span>
                          {tx.balanceAfter !== undefined ? (
                            <p className="text-[11px] tabular-nums text-slate-400">
                              Dư: {tx.balanceAfter.toLocaleString("vi-VN")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* TAB 3: CURRENT DEBT, RECEIVABLES & QUICK DEBT COLLECTION */}
        {activeTab === "debt" ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#163d36]">
                    Hạn mức tín dụng & Dư nợ phải thu (AR)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Hạn mức khả dụng còn lại:{" "}
                    <b className="tabular-nums text-[#147853]">
                      {formatVnd(debtSummary.availableCredit)}
                    </b>
                    {Number(debtSummary.prepaymentBalance ?? 0) > 0
                      ? ` · Tiền trả trước: ${formatVnd(debtSummary.prepaymentBalance)}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    currentDebtVnd > 0
                      ? "bg-amber-50 text-amber-800"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {currentDebtVnd > 0
                    ? `Đang nợ ${formatVnd(currentDebtVnd)}`
                    : "Không có công nợ quá hạn"}
                </span>
              </div>
              <UsageProgressBar
                used={currentDebtVnd}
                limit={creditLimitVnd}
                unitLabel="đ"
                className="mt-3"
              />
            </div>

            {/* Quick Debt Collection Form */}
            <form
              onSubmit={(e) => void handleRecordDebtPayment(e)}
              className="rounded-xl border border-slate-200 bg-[#fbfcfc] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#163d36]">
                  <CreditCard size={14} className="text-[#16866f]" />
                  Thu nợ nhanh (Tự động cấn trừ FIFO vào chứng từ phải thu)
                </p>
                {currentDebtVnd > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(currentDebtVnd))}
                    className="text-[11px] font-semibold text-[#16866f] hover:underline"
                  >
                    Điền tất toán ({formatVnd(currentDebtVnd)})
                  </button>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-[11px] font-medium text-slate-600">
                  Số tiền thu (VNĐ) *
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    placeholder="VD: 1450000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className={inputCls}
                  />
                </label>

                <label className="block text-[11px] font-medium text-slate-600">
                  Phương thức thanh toán
                  <select
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(e.target.value as ReceivablePaymentMethod)
                    }
                    className={inputCls}
                  >
                    <option value="BANK_TRANSFER">Chuyển khoản NH</option>
                    <option value="CASH">Tiền mặt tại quầy</option>
                    <option value="CARD">Quẹt thẻ POS</option>
                    <option value="E_WALLET">Ví điện tử</option>
                  </select>
                </label>

                <label className="block text-[11px] font-medium text-slate-600">
                  Ghi chú phiếu thu
                  <input
                    placeholder="VD: UNC Vietcombank đợt 2..."
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={payingDebt || currentDebtVnd <= 0}
                  className="gap-1.5 bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
                >
                  <Receipt size={14} />
                  {payingDebt ? "Đang hạch toán..." : "Ghi nhận thu công nợ"}
                </Button>
              </div>
            </form>

            {/* Open Receivables List */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-[#163d36]">
                Chứng từ phải thu khách hàng ({debtSummary.receivables.length})
              </div>
              {debtSummary.receivables.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">
                  Không có khoản phải thu nào đang mở.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {debtSummary.receivables.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <CopyCodeBadge code={rec.code} variant="mono" />
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              rec.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {rec.status === "PAID"
                              ? "Đã tất toán"
                              : rec.status === "PARTIALLY_PAID"
                                ? "Trả một phần"
                                : "Đang mở"}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-500">
                          {rec.note || `Nguồn: ${rec.sourceId ?? "Đơn bán hàng"}`}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="font-bold text-[#163d36]">
                          Còn nợ: {formatVnd(rec.outstandingAmount)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Gốc {formatVnd(rec.originalAmount)} · Đã thu{" "}
                          {formatVnd(rec.paidAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subledger History */}
            {debtSummary.ledger.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-[#163d36]">
                  Sổ phụ công nợ chi tiết (Debt Subledger)
                </div>
                <div className="divide-y divide-slate-100">
                  {debtSummary.ledger.map((entry) => {
                    const delta = Number(entry.amountDelta ?? 0)
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-medium text-slate-700">
                            {entry.note || entry.entryType}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(entry.occurredAt).toLocaleString("vi-VN")}
                            {entry.paymentMethod
                              ? ` · ${entry.paymentMethod}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right tabular-nums">
                          <span
                            className={`font-semibold ${
                              delta < 0 ? "text-[#147853]" : "text-amber-700"
                            }`}
                          >
                            {delta < 0
                              ? `-${formatVnd(Math.abs(delta))}`
                              : `+${formatVnd(delta)}`}
                          </span>
                          <p className="text-[11px] text-slate-400">
                            Dư nợ sau GD: {formatVnd(entry.balanceAfter)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* TAB 4: CUSTOMER DELIVERY ADDRESS BOOK */}
        {activeTab === "addresses" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Quản lý nhiều địa chỉ nhận hàng cho đơn giao tận nơi & đồng bộ sàn.
              </p>
              {!showAddressForm ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={openNewAddress}
                  className="gap-1.5 bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
                >
                  <Plus size={14} /> Thêm địa chỉ
                </Button>
              ) : null}
            </div>

            {showAddressForm ? (
              <form
                onSubmit={(e) => void handleSaveAddress(e)}
                className="space-y-3 rounded-xl border border-[#16866f]/30 bg-[#f7faf9] p-4"
              >
                <p className="text-xs font-semibold text-[#163d36]">
                  {editingAddress
                    ? "Cập nhật địa chỉ giao hàng"
                    : "Thêm địa chỉ giao hàng mới"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Người nhận *
                    <input
                      required
                      value={addrRecipient}
                      onChange={(e) => setAddrRecipient(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-[11px] font-medium text-slate-600">
                    Số điện thoại nhận hàng *
                    <input
                      required
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-[11px] font-medium text-slate-600 sm:col-span-2">
                    Số nhà, tên đường / tòa nhà *
                    <input
                      required
                      placeholder="VD: 18 Lý Thường Kiệt"
                      value={addrLine}
                      onChange={(e) => setAddrLine(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-[11px] font-medium text-slate-600">
                    Phường / Xã
                    <input
                      value={addrWard}
                      onChange={(e) => setAddrWard(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-[11px] font-medium text-slate-600">
                    Quận / Huyện
                    <input
                      value={addrDistrict}
                      onChange={(e) => setAddrDistrict(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block text-[11px] font-medium text-slate-600 sm:col-span-2">
                    Tỉnh / Thành phố
                    <input
                      value={addrProvince}
                      onChange={(e) => setAddrProvince(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={addrDefault}
                    onChange={(e) => setAddrDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#16866f]"
                  />
                  Đặt làm địa chỉ giao hàng mặc định
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddressForm(false)
                      setEditingAddress(null)
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingAddress}
                    className="bg-[#16866f] text-xs text-white hover:bg-[#0f705d]"
                  >
                    {savingAddress ? "Đang lưu..." : "Lưu địa chỉ"}
                  </Button>
                </div>
              </form>
            ) : null}

            {addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                Chưa lưu địa chỉ giao hàng nào cho khách hàng này.
              </div>
            ) : (
              <div className="grid gap-3">
                {addresses.map((addr) => {
                  const fullLine = [
                    addr.addressLine,
                    addr.ward,
                    addr.district,
                    addr.province
                  ]
                    .filter(Boolean)
                    .join(", ")
                  return (
                    <div
                      key={addr.id}
                      className={`rounded-xl border p-4 transition ${
                        addr.isDefault
                          ? "border-[#16866f]/40 bg-[#f2fbf6]/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[#163d36]">
                              {addr.recipientName || customer.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              · {addr.phone || customer.phone}
                            </span>
                            {addr.isDefault ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f5ee] px-2 py-0.5 text-[10px] font-bold text-[#147853]">
                                <CheckCircle2 size={11} /> Mặc định
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-xs text-slate-600">
                            {fullLine}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {!addr.isDefault ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleSetDefaultAddress(addr)}
                              className="h-7 gap-1 px-2.5 text-[11px]"
                            >
                              <Star size={12} /> Đặt mặc định
                            </Button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEditAddress(addr)}
                            title="Sửa địa chỉ"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#16866f]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAddress(addr)}
                            title="Xóa địa chỉ"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </SlideOverDrawer>
  )
}
