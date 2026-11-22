import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  Award,
  Coins,
  Crown,
  Eye,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  ChannelBadge,
  KpiStatCard,
  SegmentedTabs
} from "@/components/ui/micro-ux"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { useToast } from "@/components/ui/toast"
import { getCustomerHealth } from "@/api/customer/health"
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type ApiCustomer
} from "@/api/customer/customers"
import {
  assignCustomerGroup,
  getLoyaltySettings,
  listCustomerGroups,
  listMembershipTiers,
  type CustomerGroupItem,
  type LoyaltySettingsConfig,
  type MembershipTierItem
} from "@/api/customer/crm"
import { queryClient } from "@/api/tanstack-query"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { CustomerGroupsPanel } from "./CustomerGroupsPanel"
import { CustomerLoyaltyPanel } from "./CustomerLoyaltyPanel"
import {
  CustomerDetailsDrawer,
  type CustomerDetailTab
} from "./CustomerDetailsDrawer"
import {
  DEMO_CUSTOMERS,
  DEMO_CUSTOMER_GROUPS,
  DEMO_LOYALTY_SETTINGS,
  DEMO_MEMBERSHIP_TIERS,
  type CrmCustomerRecord
} from "./crm.demo"

export type CustomersModuleTab = "customers" | "groups" | "loyalty"

type CustomerDraft = {
  name: string
  phone: string
  email: string
  address: string
  birthday: string
  source: string
  customerGroupId: string
  debtLimit: string
  note: string
}

const emptyDraft: CustomerDraft = {
  name: "",
  phone: "",
  email: "",
  address: "",
  birthday: "",
  source: "POS",
  customerGroupId: "",
  debtLimit: "5000000",
  note: ""
}

const inputClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

function readInitialTab(propTab?: string | null): CustomersModuleTab {
  const candidate =
    propTab ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab")
      : null)
  if (
    candidate === "customers" ||
    candidate === "groups" ||
    candidate === "loyalty"
  ) {
    return candidate
  }
  return "customers"
}

const mapApiCustomer = (
  item: ApiCustomer,
  fallbackAddress?: string | number
): CrmCustomerRecord => {
  const noteText = item.note ?? ""
  const fromDefault = item.defaultAddress
    ? [
        item.defaultAddress.addressLine,
        item.defaultAddress.ward,
        item.defaultAddress.district,
        item.defaultAddress.province
      ]
        .filter(Boolean)
        .join(", ")
    : ""
  const fromArray =
    item.addresses && item.addresses.length > 0
      ? [
          item.addresses[0].addressLine,
          item.addresses[0].ward,
          item.addresses[0].district,
          item.addresses[0].province
        ]
          .filter(Boolean)
          .join(", ")
      : ""
  const cleanFallback =
    typeof fallbackAddress === "string" ? fallbackAddress : ""
  const extractedAddress =
    fromDefault || fromArray || item.address || cleanFallback || ""

  return {
    id: item.id,
    code: item.code || item.id.slice(0, 8).toUpperCase(),
    memberCode: item.memberCode ?? undefined,
    source: (item.source || "POS").toUpperCase(),
    name: item.name,
    phone: item.phone ?? "",
    email: item.email ?? "",
    address: extractedAddress,
    birthday: item.dateOfBirth ? item.dateOfBirth.slice(0, 10) : "",
    note: noteText,
    createdAt: item.createdAt,
    customerGroupId: item.customerGroupId ?? null,
    membershipTierId: item.membershipTierId ?? null,
    pointsBalance: Number(item.pointsBalance ?? 0),
    currentDebt: Number(item.currentDebt ?? 0),
    debtLimit: Number(item.debtLimit ?? 5000000)
  }
}

export function CustomersPage({
  requestedTab
}: {
  requestedTab?: string | null
} = {}) {
  const { toast } = useToast()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [activeTab, setActiveTab] = useState<CustomersModuleTab>(() =>
    readInitialTab(requestedTab)
  )

  useEffect(() => {
    if (
      requestedTab === "customers" ||
      requestedTab === "groups" ||
      requestedTab === "loyalty"
    ) {
      setActiveTab(requestedTab)
    }
  }, [requestedTab])

  useEffect(() => {
    const onPop = () => setActiveTab(readInitialTab())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const handleTabChange = (next: CustomersModuleTab) => {
    setActiveTab(next)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", next)
      window.history.replaceState({}, "", url.toString())
    }
  }

  const cachedApiCustomers = queryClient.getQueryData<ApiCustomer[]>([
    "customers-list"
  ])

  const [customers, setCustomers] = useState<CrmCustomerRecord[]>(() =>
    isDemo
      ? DEMO_CUSTOMERS
      : cachedApiCustomers
        ? cachedApiCustomers.map((c) => mapApiCustomer(c))
        : []
  )
  const [groups, setGroups] = useState<CustomerGroupItem[]>(() =>
    isDemo ? DEMO_CUSTOMER_GROUPS : []
  )
  const [tiers, setTiers] = useState<MembershipTierItem[]>(() =>
    isDemo ? DEMO_MEMBERSHIP_TIERS : []
  )
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettingsConfig>(
    DEMO_LOYALTY_SETTINGS
  )

  const [loading, setLoading] = useState(!isDemo && !cachedApiCustomers)
  const [query, setQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("ALL")
  const [groupFilter, setGroupFilter] = useState<string>("ALL")

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CrmCustomerRecord | null>(null)
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft)
  const [error, setError] = useState("")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerInitialTab, setDrawerInitialTab] =
    useState<CustomerDetailTab>("orders")

  const healthQuery = useQuery({
    queryKey: ["customer-health"],
    queryFn: getCustomerHealth,
    enabled: !isDemo,
    retry: false
  })

  const loadCrmBundle = async (force = false) => {
    if (isDemo) return
    setLoading(true)
    try {
      if (force) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["customers-list"] }),
          queryClient.invalidateQueries({ queryKey: ["crm-groups"] }),
          queryClient.invalidateQueries({ queryKey: ["crm-tiers"] }),
          queryClient.invalidateQueries({ queryKey: ["crm-loyalty-settings"] })
        ])
      }
      const [cusRes, grpRows, tierRows, settingsRow] = await Promise.all([
        queryClient
          .fetchQuery({
            queryKey: ["customers-list"],
            queryFn: () => listCustomers({ page: 1, limit: 100 })
          })
          .catch(() => null),
        queryClient
          .fetchQuery({
            queryKey: ["crm-groups"],
            queryFn: listCustomerGroups
          })
          .catch(() => [] as CustomerGroupItem[]),
        queryClient
          .fetchQuery({
            queryKey: ["crm-tiers"],
            queryFn: listMembershipTiers
          })
          .catch(() => [] as MembershipTierItem[]),
        queryClient
          .fetchQuery({
            queryKey: ["crm-loyalty-settings"],
            queryFn: getLoyaltySettings
          })
          .catch(() => null)
      ])

      const cusRows = Array.isArray(cusRes) ? cusRes : (cusRes?.items ?? [])
      if (cusRows.length > 0) {
        setCustomers(cusRows.map((r: ApiCustomer) => mapApiCustomer(r)))
      }
      if (grpRows.length > 0) {
        setGroups(grpRows)
      }
      if (tierRows.length > 0) {
        setTiers(tierRows)
      }
      if (settingsRow) {
        setLoyaltySettings(settingsRow)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isDemo) {
      setCustomers(DEMO_CUSTOMERS)
      setGroups(DEMO_CUSTOMER_GROUPS)
      setTiers(DEMO_MEMBERSHIP_TIERS)
      setLoyaltySettings(DEMO_LOYALTY_SETTINGS)
      return
    }
    void loadCrmBundle()
  }, [isDemo])

  // Sync group customer counts in Demo mode so counts stay live
  const enrichedGroups = useMemo(() => {
    if (!isDemo) return groups
    const countMap = new Map<string, number>()
    for (const c of customers) {
      if (c.customerGroupId) {
        countMap.set(c.customerGroupId, (countMap.get(c.customerGroupId) ?? 0) + 1)
      }
    }
    return groups.map((g) => ({
      ...g,
      customerCount: countMap.get(g.id) ?? 0
    }))
  }, [isDemo, groups, customers])

  const groupMap = useMemo(
    () => new Map(enrichedGroups.map((g) => [g.id, g])),
    [enrichedGroups]
  )

  const sortedActiveTiers = useMemo(
    () =>
      [...tiers]
        .filter((t) => t.status === "ACTIVE")
        .sort((a, b) => a.minPoints - b.minPoints),
    [tiers]
  )

  const resolveCustomerTier = (c: CrmCustomerRecord): MembershipTierItem | null => {
    if (c.membershipTierId) {
      const explicit = tiers.find((t) => t.id === c.membershipTierId)
      if (explicit) return explicit
    }
    return (
      [...sortedActiveTiers]
        .reverse()
        .find((t) => c.pointsBalance >= t.minPoints) ??
      sortedActiveTiers[0] ??
      null
    )
  }

  const filtered = useMemo(
    () =>
      customers.filter((customer) => {
        const matchesQuery =
          `${customer.code} ${customer.memberCode ?? ""} ${customer.name} ${customer.phone} ${customer.email} ${customer.note}`
            .toLowerCase()
            .includes(query.toLowerCase())
        const matchesSource =
          sourceFilter === "ALL" || customer.source === sourceFilter
        const matchesGroup =
          groupFilter === "ALL" ||
          (groupFilter === "UNASSIGNED"
            ? !customer.customerGroupId
            : customer.customerGroupId === groupFilter)
        return matchesQuery && matchesSource && matchesGroup
      }),
    [customers, query, sourceFilter, groupFilter]
  )

  const kpis = useMemo(() => {
    const ecommerceCount = customers.filter((c) =>
      ["LAZADA", "SHOPEE", "TIKTOK_SHOP", "WEBSITE"].includes(c.source)
    ).length
    const totalPoints = customers.reduce((sum, c) => sum + c.pointsBalance, 0)
    const totalDebt = customers.reduce((sum, c) => sum + c.currentDebt, 0)
    const debtorCount = customers.filter((c) => c.currentDebt > 0).length
    return { ecommerceCount, totalPoints, totalDebt, debtorCount }
  }, [customers])

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId]
  )

  const openCustomerDrawer = (
    customer: CrmCustomerRecord,
    tab: CustomerDetailTab = "orders"
  ) => {
    setDrawerInitialTab(tab)
    setSelectedId(customer.id)
  }

  const patchCustomerInList = (
    customerId: string,
    patch: Partial<CrmCustomerRecord>
  ) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, ...patch } : c))
    )
  }

  const openCreate = () => {
    setEditing(null)
    setDraft({
      ...emptyDraft,
      customerGroupId: enrichedGroups[0]?.id ?? ""
    })
    setError("")
    setShowForm(true)
  }

  const openEdit = (customer: CrmCustomerRecord) => {
    setEditing(customer)
    setDraft({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      birthday: customer.birthday,
      source: customer.source,
      customerGroupId: customer.customerGroupId ?? "",
      debtLimit: String(customer.debtLimit || 5000000),
      note: customer.note
    })
    setError("")
    setShowForm(true)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!draft.name.trim() || !/^\+?[0-9]{8,15}$/.test(draft.phone.trim())) {
      setError("Vui lòng nhập tên và số điện thoại hợp lệ (8-15 chữ số).")
      return
    }
    const cleanAddress = draft.address.trim()
    const nextGroupId = draft.customerGroupId || null
    const nextDebtLimit = Math.max(0, Number(draft.debtLimit) || 5000000)

    if (editing) {
      if (!isDemo) {
        try {
          const updated = await updateCustomer(editing.id, {
            name: draft.name.trim(),
            phone: draft.phone.trim(),
            email: draft.email.trim() || null,
            dateOfBirth: draft.birthday || null,
            source: draft.source || "POS",
            note: draft.note.trim() || null
          })
          if (nextGroupId !== editing.customerGroupId) {
            await assignCustomerGroup(editing.id, nextGroupId).catch(() => null)
          }
          setCustomers((current) =>
            current.map((customer) =>
              customer.id === editing.id
                ? {
                    ...mapApiCustomer(updated, cleanAddress),
                    customerGroupId: nextGroupId,
                    pointsBalance: editing.pointsBalance,
                    currentDebt: editing.currentDebt,
                    debtLimit: nextDebtLimit
                  }
                : customer
            )
          )
          toast({
            title: "Đã cập nhật hồ sơ khách hàng",
            description: draft.name.trim(),
            variant: "success"
          })
          setShowForm(false)
          return
        } catch {
          // Fallback to local state update
        }
      }
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === editing.id
            ? {
                ...editing,
                name: draft.name.trim(),
                phone: draft.phone.trim(),
                email: draft.email.trim(),
                address: cleanAddress,
                birthday: draft.birthday,
                source: draft.source,
                customerGroupId: nextGroupId,
                debtLimit: nextDebtLimit,
                note: draft.note.trim()
              }
            : customer
        )
      )
      toast({
        title: "Đã lưu thay đổi khách hàng",
        description: draft.name.trim(),
        variant: "success"
      })
    } else {
      if (customers.some((customer) => customer.phone === draft.phone.trim())) {
        setError("Số điện thoại đã tồn tại trong danh sách khách hàng.")
        return
      }
      if (!isDemo) {
        try {
          const created = await createCustomer({
            name: draft.name.trim(),
            phone: draft.phone.trim(),
            email: draft.email.trim() || null,
            dateOfBirth: draft.birthday || null,
            source: draft.source || "POS",
            note: draft.note.trim() || null,
            ...(cleanAddress
              ? { initialAddress: { addressLine: cleanAddress } }
              : {})
          })
          if (nextGroupId) {
            await assignCustomerGroup(created.id, nextGroupId).catch(() => null)
          }
          setCustomers((current) => [
            {
              ...mapApiCustomer(created, cleanAddress),
              customerGroupId: nextGroupId,
              debtLimit: nextDebtLimit
            },
            ...current
          ])
          toast({
            title: "Đã tạo khách hàng mới",
            description: `${draft.name.trim()} (${draft.phone.trim()})`,
            variant: "success"
          })
          setShowForm(false)
          return
        } catch {
          // Fallback to local state creation
        }
      }
      const nextIndex = customers.length + 1
      setCustomers((current) => [
        {
          id: `cus-${Date.now()}`,
          code: `KH${String(nextIndex).padStart(6, "0")}`,
          memberCode: `MEM2026${String(nextIndex).padStart(4, "0")}`,
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim(),
          address: cleanAddress,
          birthday: draft.birthday,
          source: draft.source || "POS",
          customerGroupId: nextGroupId,
          membershipTierId: sortedActiveTiers[0]?.id ?? null,
          pointsBalance: 0,
          currentDebt: 0,
          debtLimit: nextDebtLimit,
          note: draft.note.trim(),
          createdAt: new Date().toISOString()
        },
        ...current
      ])
      toast({
        title: "Đã thêm khách hàng vào danh bạ",
        description: draft.name.trim(),
        variant: "success"
      })
    }
    setShowForm(false)
  }

  const remove = async (customer: CrmCustomerRecord) => {
    if (window.confirm(`Xóa khách hàng ${customer.name}?`)) {
      if (!isDemo) {
        try {
          await deleteCustomer(customer.id)
        } catch {
          // Ignore delete API error in fallback
        }
      }
      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id)
      )
      if (selectedId === customer.id) setSelectedId(null)
      toast({
        title: `Đã xóa hồ sơ ${customer.name}`,
        variant: "info"
      })
    }
  }

  const lazadaCount = customers.filter((c) => c.source === "LAZADA").length

  return (
    <main className="mx-auto max-w-[1480px] py-7">
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#147853]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16866f] animate-pulse" />
            <span>CRM Đa kênh · Nhóm khách & Loyalty 360°</span>
          </div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-[#163d36] sm:text-3xl">
            Khách hàng & Tích điểm
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Đồng bộ hồ sơ 360°, phân nhóm chiết khấu, hạng thành viên, sổ cái
            điểm thưởng và công nợ từ POS, Lazada, Shopee & Website.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <span
            className={`rounded-xl border px-3 py-2 text-xs font-semibold shadow-2xs ${
              isDemo || healthQuery.data
                ? "border-emerald-200/80 bg-[#e6f5ee] text-[#147853]"
                : "border-amber-200/80 bg-amber-50 text-amber-700"
            }`}
          >
            {isDemo
              ? "Chế độ Demo tương tác"
              : healthQuery.data
                ? "Customer & Loyalty Online"
                : "Đang dùng bộ nhớ đệm"}
          </span>
          {!isDemo ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadCrmBundle(true)}
              disabled={loading}
              className="gap-2 rounded-xl border-slate-200/90 text-xs shadow-2xs hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Làm mới</span>
            </Button>
          ) : null}
          {activeTab === "customers" ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_12px_rgba(22,134,111,0.25)] hover:shadow-[0_4px_18px_rgba(22,134,111,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Thêm khách hàng</span>
            </button>
          ) : null}
        </div>
      </header>

      {/* Top Module Segmented Tabs */}
      <div className="mb-6">
        <SegmentedTabs<CustomersModuleTab>
          value={activeTab}
          onChange={handleTabChange}
          ariaLabel="Phân mục Quản trị Khách hàng & Tích điểm"
          tabs={[
            {
              value: "customers",
              label: "Danh sách khách hàng",
              icon: UserRound,
              badge: loading ? undefined : customers.length
            },
            {
              value: "groups",
              label: "Nhóm khách hàng",
              icon: Users,
              badge: loading ? undefined : enrichedGroups.length
            },
            {
              value: "loyalty",
              label: "Hạng thành viên & Tích điểm",
              icon: Crown,
              badge: loading ? undefined : tiers.length
            }
          ]}
        />
      </div>

      {/* TAB 1: CUSTOMERS DIRECTORY */}
      {activeTab === "customers" ? (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiStatCard
              label="Tổng hồ sơ khách hàng"
              value={customers.length}
              hint={`Gồm ${lazadaCount} khách đồng bộ từ Lazada`}
              icon={UserRound}
              tone="emerald"
              loading={loading}
            />
            <KpiStatCard
              label="Khách Sàn TMĐT & Website"
              value={kpis.ecommerceCount}
              hint="Tự động gộp trùng số điện thoại"
              icon={ShoppingBag}
              tone="indigo"
              loading={loading}
            />
            <KpiStatCard
              label="Tổng quỹ điểm khả dụng"
              value={`${kpis.totalPoints.toLocaleString("vi-VN")} điểm`}
              hint={`Quy đổi ~${formatVnd(kpis.totalPoints * (loyaltySettings.redeemValuePerPoint || 1000))}`}
              icon={Coins}
              tone="sky"
              loading={loading}
              onClick={() => handleTabChange("loyalty")}
            />
            <KpiStatCard
              label="Tổng dư nợ phải thu"
              value={formatVnd(kpis.totalDebt)}
              hint={`${kpis.debtorCount} khách hàng đang có công nợ mở`}
              icon={Wallet}
              tone={kpis.totalDebt > 0 ? "amber" : "emerald"}
              loading={loading}
            />
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div className="flex flex-1 flex-wrap items-center gap-2.5">
                <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm tên, mã KH, thẻ thành viên, SĐT, email..."
                    className="w-full text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>

                <select
                  aria-label="Lọc theo nhóm khách hàng"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-[#16866f]"
                >
                  <option value="ALL">Mọi nhóm khách hàng</option>
                  {enrichedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  <option value="UNASSIGNED">Chưa phân nhóm</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", label: `Tất cả (${customers.length})` },
                  { id: "POS", label: "Tại cửa hàng" },
                  { id: "LAZADA", label: `Lazada (${lazadaCount})` },
                  { id: "SHOPEE", label: "Shopee" },
                  { id: "WEBSITE", label: "Website" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceFilter(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      sourceFilter === tab.id
                        ? tab.id === "LAZADA"
                          ? "bg-[#0f146d] text-white shadow-sm"
                          : "bg-[#16866f] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Khách hàng</th>
                    <th className="px-5 py-3 font-semibold">
                      Kênh · Nhóm & Hạng
                    </th>
                    <th className="px-5 py-3 font-semibold">Liên hệ</th>
                    <th className="px-5 py-3 font-semibold">Điểm thưởng</th>
                    <th className="px-5 py-3 font-semibold">Dư nợ hiện tại</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((customer) => {
                    const group = customer.customerGroupId
                      ? groupMap.get(customer.customerGroupId)
                      : null
                    const tier = resolveCustomerTier(customer)

                    return (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-slate-50/90"
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              openCustomerDrawer(customer, "orders")
                            }
                            className="flex items-center gap-3 text-left group"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold ${
                                customer.source === "LAZADA"
                                  ? "bg-[#eef0ff] text-[#0f146d]"
                                  : "bg-[#e6f5ee] text-[#16866f]"
                              }`}
                            >
                              {customer.name.slice(0, 1)}
                            </span>
                            <span>
                              <b className="block font-medium text-[#163d36] group-hover:text-[#16866f]">
                                {customer.name}
                              </b>
                              <span className="text-xs text-slate-400">
                                Mã: {customer.code}
                                {customer.memberCode
                                  ? ` · ${customer.memberCode}`
                                  : ""}
                              </span>
                            </span>
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <ChannelBadge channel={customer.source} size="xs" />
                            {group ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                {group.name}
                              </span>
                            ) : null}
                            {tier ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                <Award size={11} />
                                {tier.name}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Phone size={13} />
                            {customer.phone}
                          </span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            <Mail size={13} />
                            {customer.email || "Chưa cập nhật"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              openCustomerDrawer(customer, "loyalty")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f2fbf6] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#147853] hover:bg-[#e6f5ee]"
                          >
                            <Coins size={13} />
                            {customer.pointsBalance.toLocaleString("vi-VN")} điểm
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openCustomerDrawer(customer, "debt")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${
                              customer.currentDebt > 0
                                ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <Wallet size={13} />
                            {customer.currentDebt > 0
                              ? formatVnd(customer.currentDebt)
                              : "0đ"}
                          </button>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openCustomerDrawer(customer, "orders")
                            }
                            className="mr-1 h-8 gap-1 text-xs font-semibold text-[#16866f] hover:bg-[#e6f5ee]"
                          >
                            <Eye size={14} /> 360°
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Chỉnh sửa"
                            aria-label={`Chỉnh sửa ${customer.name}`}
                            onClick={() => openEdit(customer)}
                            className="text-slate-400 hover:text-[#16866f]"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xóa"
                            aria-label={`Xóa ${customer.name}`}
                            onClick={() => void remove(customer)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {loading && filtered.length === 0 ? (
                <div className="p-6">
                  <TableSkeleton rows={5} cols={6} />
                </div>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Không tìm thấy khách hàng"
                  description="Không có khách hàng nào khớp với bộ lọc hiện tại. Thử thay đổi từ khóa hoặc nhóm khách."
                  actionLabel={
                    query || groupFilter !== "ALL" || sourceFilter !== "ALL"
                      ? "Xóa tất cả bộ lọc"
                      : "Thêm khách hàng mới"
                  }
                  onAction={
                    query || groupFilter !== "ALL" || sourceFilter !== "ALL"
                      ? () => {
                          setQuery("")
                          setGroupFilter("ALL")
                          setSourceFilter("ALL")
                        }
                      : openCreate
                  }
                />
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {/* TAB 2: CUSTOMER GROUPS */}
      {activeTab === "groups" ? (
        <CustomerGroupsPanel
          isDemo={isDemo}
          groups={enrichedGroups}
          onGroupsChange={setGroups}
          onRefresh={() => loadCrmBundle(true)}
        />
      ) : null}

      {/* TAB 3: MEMBERSHIP TIERS & LOYALTY SETTINGS */}
      {activeTab === "loyalty" ? (
        <CustomerLoyaltyPanel
          isDemo={isDemo}
          tiers={tiers}
          settings={loyaltySettings}
          onTiersChange={setTiers}
          onSettingsChange={setLoyaltySettings}
          onRefresh={() => loadCrmBundle(true)}
        />
      ) : null}

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {showForm ? (
        <CustomerFormModal
          draft={draft}
          editing={Boolean(editing)}
          groups={enrichedGroups}
          error={error}
          onChange={setDraft}
          onSubmit={(e) => void submit(e)}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      {/* 360° CUSTOMER DETAILS DRAWER */}
      <CustomerDetailsDrawer
        customer={selectedCustomer}
        initialTab={drawerInitialTab}
        isDemo={isDemo}
        groups={enrichedGroups}
        tiers={tiers}
        onClose={() => setSelectedId(null)}
        onCustomerPatch={patchCustomerInList}
      />
    </main>
  )
}

function CustomerFormModal({
  draft,
  editing,
  groups,
  error,
  onChange,
  onSubmit,
  onClose
}: {
  draft: CustomerDraft
  editing: boolean
  groups: CustomerGroupItem[]
  error: string
  onChange: (draft: CustomerDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}) {
  const update = (key: keyof CustomerDraft, value: string) =>
    onChange({ ...draft, [key]: value })

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 pt-12 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#163d36]">
              {editing ? "Chỉnh sửa hồ sơ khách hàng" : "Thêm khách hàng mới"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Số điện thoại là định danh xuyên suốt POS, Website & Sàn TMĐT.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={19} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Họ và tên *
            <input
              required
              className={inputClass}
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Số điện thoại *
            <input
              required
              className={inputClass}
              value={draft.phone}
              onChange={(event) => update("phone", event.target.value)}
              pattern="\+?[0-9]{8,15}"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Email
            <input
              type="email"
              className={inputClass}
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Ngày sinh
            <input
              type="date"
              className={inputClass}
              value={draft.birthday}
              onChange={(event) => update("birthday", event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Nguồn khách hàng
            <select
              className={inputClass}
              value={draft.source || "POS"}
              onChange={(event) => update("source", event.target.value)}
            >
              <option value="POS">Tại cửa hàng (POS)</option>
              <option value="LAZADA">Lazada</option>
              <option value="SHOPEE">Shopee</option>
              <option value="WEBSITE">Website</option>
              <option value="TIKTOK_SHOP">TikTok Shop</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Nhóm khách hàng
            <select
              className={inputClass}
              value={draft.customerGroupId}
              onChange={(event) =>
                update("customerGroupId", event.target.value)
              }
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
          <label className="text-xs font-medium text-slate-600">
            Địa chỉ mặc định
            <input
              className={inputClass}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành..."
              value={draft.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Hạn mức công nợ tối đa (VNĐ)
            <input
              type="number"
              min={0}
              step={500000}
              className={inputClass}
              value={draft.debtLimit}
              onChange={(event) => update("debtLimit", event.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-600 md:col-span-2">
            Ghi chú chăm sóc khách hàng
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#16866f]"
              value={draft.note}
              onChange={(event) => update("note", event.target.value)}
            />
          </label>
        </div>

        {error ? (
          <p className="px-6 pb-2 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            {editing ? "Lưu thay đổi" : "Lưu khách hàng"}
          </Button>
        </div>
      </form>
    </div>
  )
}
