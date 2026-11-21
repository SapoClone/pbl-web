import { type FormEvent, useEffect, useMemo, useState } from "react"
import axios from "axios"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Boxes,
  Edit3,
  Layers,
  Minus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X
} from "lucide-react"
import {
  type CatalogBrand,
  type CatalogCategory,
  type CatalogComboItem,
  createCatalogProduct,
  listCatalogProductVariants,
  listComboItems,
  updateCatalogVariant,
  upsertComboItems
} from "@/api/catalog/products"
import {
  type CatalogVariant as SellableVariant,
  listActiveVariants
} from "@/api/catalog/variants"
import { Button } from "@/components/ui/button"
import { CopyCodeBadge } from "@/components/ui/micro-ux"
import { useToast } from "@/components/ui/toast"
import type { Product } from "@/shared/dashboard/dashboard.types"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type DemoComboRecord = {
  id: string
  name: string
  sku: string
  description: string
  comboPrice: number
  items: CatalogComboItem[]
}

const DEMO_SELLABLE_VARIANTS: SellableVariant[] = [
  {
    variantId: "55555555-5555-4555-8555-555555555501",
    productId: "66666666-6666-4666-8666-666666666601",
    name: "Bình giữ nhiệt Terra 500ml",
    label: "Xanh Rêu",
    skuCode: "TER-500-GRN",
    barcode: "8938501234001",
    price: 420000,
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555502",
    productId: "66666666-6666-4666-8666-666666666602",
    name: "Túi tote canvas Daily",
    label: "Trắng Kem",
    skuCode: "TOT-DAILY-01",
    barcode: "8938501234002",
    price: 185000,
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555503",
    productId: "66666666-6666-4666-8666-666666666603",
    name: "Cốc gốm thủ công Mộc",
    label: "Men Nâu",
    skuCode: "CER-MOC-08",
    barcode: "8938501234003",
    price: 260000,
    status: "active"
  },
  {
    variantId: "55555555-5555-4555-8555-555555555504",
    productId: "66666666-6666-4666-8666-666666666604",
    name: "Nến thơm Gỗ tuyết tùng",
    label: "200g",
    skuCode: "CAN-CEDAR-02",
    barcode: "8938501234004",
    price: 320000,
    status: "active"
  }
]

const INITIAL_DEMO_COMBOS: DemoComboRecord[] = [
  {
    id: "88888888-8888-4888-8888-888888888801",
    name: "Combo Quà Tặng Xanh Eco (Bình Terra + Túi Tote Daily)",
    sku: "CB-ECO-GIFT01",
    description: "Bộ quà tặng doanh nghiệp & bán lẻ tiết kiệm 15%",
    comboPrice: 515000,
    items: [
      {
        id: "88888888-8888-4888-8888-888888888811",
        comboProductId: "88888888-8888-4888-8888-888888888801",
        childVariantId: "55555555-5555-4555-8555-555555555501",
        childProductId: "66666666-6666-4666-8666-666666666601",
        skuCode: "TER-500-GRN",
        variantName: "Bình giữ nhiệt Terra 500ml",
        basePrice: 420000,
        imageUrl: null,
        quantity: 1,
        lineTotal: 420000,
        sortOrder: 0
      },
      {
        id: "88888888-8888-4888-8888-888888888812",
        comboProductId: "88888888-8888-4888-8888-888888888801",
        childVariantId: "55555555-5555-4555-8555-555555555502",
        childProductId: "66666666-6666-4666-8666-666666666602",
        skuCode: "TOT-DAILY-01",
        variantName: "Túi tote canvas Daily",
        basePrice: 185000,
        imageUrl: null,
        quantity: 1,
        lineTotal: 185000,
        sortOrder: 1
      }
    ]
  },
  {
    id: "88888888-8888-4888-8888-888888888802",
    name: "Set Thư Giãn Cuối Tuần (Cốc Gốm Mộc + Nến Tuyết Tùng)",
    sku: "CB-RELAX-HOME",
    description: "Set decor phòng khách bán chạy trên Website & POS",
    comboPrice: 499000,
    items: [
      {
        id: "88888888-8888-4888-8888-888888888821",
        comboProductId: "88888888-8888-4888-8888-888888888802",
        childVariantId: "55555555-5555-4555-8555-555555555503",
        childProductId: "66666666-6666-4666-8666-666666666603",
        skuCode: "CER-MOC-08",
        variantName: "Cốc gốm thủ công Mộc",
        basePrice: 260000,
        imageUrl: null,
        quantity: 1,
        lineTotal: 260000,
        sortOrder: 0
      },
      {
        id: "88888888-8888-4888-8888-888888888822",
        comboProductId: "88888888-8888-4888-8888-888888888802",
        childVariantId: "55555555-5555-4555-8555-555555555504",
        childProductId: "66666666-6666-4666-8666-666666666604",
        skuCode: "CAN-CEDAR-02",
        variantName: "Nến thơm Gỗ tuyết tùng",
        basePrice: 320000,
        imageUrl: null,
        quantity: 1,
        lineTotal: 320000,
        sortOrder: 1
      }
    ]
  }
]

const formatMoney = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`

const parseApiErr = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message
    if (Array.isArray(msg)) return msg.join(", ")
    if (typeof msg === "string" && msg.trim()) return msg
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function ProductCombosPanel({
  products,
  categories,
  brands,
  onReloadProducts
}: {
  products: Product[]
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  onReloadProducts: () => Promise<void>
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const isDemo = useStoreAuth((s) => Boolean(s.tokens?.isDemo))

  const [demoCombos, setDemoCombos] =
    useState<DemoComboRecord[]>(INITIAL_DEMO_COMBOS)
  const [search, setSearch] = useState("")
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<DemoComboRecord | null>(null)

  const variantsQuery = useQuery({
    queryKey: ["catalog-variants"],
    queryFn: listActiveVariants,
    enabled: !isDemo
  })

  const liveComboProducts = useMemo(
    () => products.filter((p) => Boolean(p.isCombo && p.id)),
    [products]
  )

  const liveComboDetailsQuery = useQuery({
    queryKey: [
      "catalog-combo-details",
      liveComboProducts.map((p) => `${p.id}:${p.retailPrice}`).join(",")
    ],
    queryFn: async () => {
      const entries = await Promise.all(
        liveComboProducts.map(async (p) => {
          const items = await listComboItems(p.id!).catch(() => [])
          return {
            id: p.id!,
            name: p.name,
            sku: p.sku || `CB-${p.id!.slice(0, 6).toUpperCase()}`,
            description: p.description ?? "",
            comboPrice: p.retailPrice ?? 0,
            items
          } satisfies DemoComboRecord
        })
      )
      return entries
    },
    enabled: !isDemo
  })

  const comboRecords = isDemo
    ? demoCombos
    : (liveComboDetailsQuery.data ?? [])

  const sellableVariants = useMemo(() => {
    if (isDemo) return DEMO_SELLABLE_VARIANTS
    const comboProductIds = new Set(liveComboProducts.map((p) => p.id))
    return (variantsQuery.data ?? []).filter(
      (v) => !comboProductIds.has(v.productId)
    )
  }, [isDemo, liveComboProducts, variantsQuery.data])

  const filteredCombos = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return comboRecords
    return comboRecords.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sku.toLowerCase().includes(q) ||
        c.items.some(
          (i) =>
            i.variantName.toLowerCase().includes(q) ||
            i.skuCode.toLowerCase().includes(q)
        )
    )
  }, [comboRecords, search])

  return (
    <div className="space-y-5">
      {/* Callout Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#16866f] shadow-xs">
            <Boxes size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#163d36]">
              Sản phẩm Combo &amp; Bộ quà tặng (Bundle SKU)
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Ghép nhiều SKU đơn lẻ thành 1 gói sản phẩm có giá ưu đãi để tăng giá trị đơn hàng trung bình (AOV) tại POS và sàn TMĐT.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingCombo(null)
            setBuilderOpen(true)
          }}
          className="shrink-0 bg-[#16866f] text-white hover:bg-[#0f705d]"
        >
          <Plus size={16} className="mr-1.5" />
          Tạo gói Combo mới
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên gói Combo, mã SKU Combo hoặc SKU thành phần..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"
          />
        </div>
        <span className="text-xs font-medium text-slate-500">
          Tổng cộng{" "}
          <strong className="text-[#163d36]">{filteredCombos.length}</strong>{" "}
          gói Combo
        </span>
      </div>

      {/* Combo Cards Grid */}
      {!isDemo && liveComboDetailsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl bg-white p-6 shadow-xs"
            />
          ))}
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
          <Layers size={36} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Chưa có sản phẩm Combo nào
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Bấm &ldquo;Tạo gói Combo mới&rdquo; để kết hợp các biến thể bán chạy thành bộ sản phẩm ưu đãi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredCombos.map((combo) => {
            const sumRetail = combo.items.reduce(
              (acc, it) => acc + it.basePrice * it.quantity,
              0
            )
            const savings = Math.max(0, sumRetail - combo.comboPrice)
            const savingsPct =
              sumRetail > 0 ? Math.round((savings / sumRetail) * 100) : 0

            return (
              <article
                key={combo.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)] transition hover:border-[#16866f]/35"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#e6f5ee] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#147853]">
                          Gói Combo · {combo.items.length} thành phần
                        </span>
                        <CopyCodeBadge code={combo.sku} variant="mono" />
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-[#163d36]">
                        {combo.name}
                      </h3>
                      {combo.description ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {combo.description}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCombo(combo)
                        setBuilderOpen(true)
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Edit3 size={13} />
                      Cấu hình
                    </button>
                  </div>

                  {/* Component items list */}
                  <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-[#fbfcfc] px-3.5">
                    {combo.items.length === 0 ? (
                      <p className="py-3 text-xs text-slate-400">
                        Chưa gắn SKU thành phần. Bấm &ldquo;Cấu hình&rdquo; để bổ sung.
                      </p>
                    ) : (
                      combo.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 py-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded bg-[#e6f5ee] px-1.5 font-mono text-[11px] font-bold text-[#147853]">
                              x{item.quantity}
                            </span>{" "}
                            <span className="font-medium text-slate-700">
                              {item.variantName}
                            </span>
                            <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                              ({item.skuCode})
                            </span>
                          </div>
                          <span className="shrink-0 tabular-nums text-slate-500">
                            {formatMoney(item.basePrice * item.quantity)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Price comparison footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
                  <div>
                    <span className="block text-[11px] text-slate-400">
                      Giá lẻ cộng dồn:{" "}
                      <s className="tabular-nums">{formatMoney(sumRetail)}</s>
                    </span>
                    <span className="text-lg font-bold tabular-nums text-[#163d36]">
                      Giá Combo: {formatMoney(combo.comboPrice)}
                    </span>
                  </div>
                  {savings > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      <Sparkles size={13} />
                      Khách tiết kiệm {formatMoney(savings)} (-{savingsPct}%)
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      Bằng tổng giá lẻ
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {builderOpen && (
        <ComboBuilderModal
          initial={editingCombo}
          variants={sellableVariants}
          categories={categories}
          brands={brands}
          isDemo={isDemo}
          onClose={() => setBuilderOpen(false)}
          onSaved={async (saved, isCreate) => {
            if (isDemo) {
              setDemoCombos((prev) =>
                isCreate
                  ? [saved, ...prev]
                  : prev.map((c) => (c.id === saved.id ? saved : c))
              )
            } else {
              await onReloadProducts()
              await queryClient.invalidateQueries({
                queryKey: ["catalog-combo-details"]
              })
            }
            setBuilderOpen(false)
            toast.success(
              isCreate
                ? `Đã tạo sản phẩm Combo "${saved.name}"`
                : `Đã cập nhật thành phần Combo "${saved.name}"`
            )
          }}
        />
      )}
    </div>
  )
}

function ComboBuilderModal({
  initial,
  variants,
  categories,
  brands,
  isDemo,
  onClose,
  onSaved
}: {
  initial: DemoComboRecord | null
  variants: SellableVariant[]
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  isDemo: boolean
  onClose: () => void
  onSaved: (combo: DemoComboRecord, isCreate: boolean) => Promise<void>
}) {
  const isEdit = Boolean(initial)
  const [name, setName] = useState(initial?.name ?? "")
  const [sku, setSku] = useState(
    initial?.sku ??
      `CB-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  )
  const [description, setDescription] = useState(initial?.description ?? "")
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "")
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "")
  const [comboPrice, setComboPrice] = useState(
    String(initial?.comboPrice ?? 0)
  )
  const [pickerSearch, setPickerSearch] = useState("")
  const [lines, setLines] = useState<
    Array<{
      childVariantId: string
      skuCode: string
      variantName: string
      basePrice: number
      quantity: number
    }>
  >(() =>
    (initial?.items ?? []).map((it) => ({
      childVariantId: it.childVariantId,
      skuCode: it.skuCode,
      variantName: it.variantName,
      basePrice: it.basePrice,
      quantity: it.quantity
    }))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const sumRetail = useMemo(
    () => lines.reduce((acc, l) => acc + l.basePrice * l.quantity, 0),
    [lines]
  )

  useEffect(() => {
    if (!isEdit && lines.length > 0 && Number(comboPrice) === 0) {
      setComboPrice(String(Math.round((sumRetail * 0.9) / 1000) * 1000))
    }
  }, [comboPrice, isEdit, lines.length, sumRetail])

  const pickerResults = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    const chosen = new Set(lines.map((l) => l.childVariantId))
    return variants
      .filter((v) => !chosen.has(v.variantId))
      .filter(
        (v) =>
          !q ||
          v.name.toLowerCase().includes(q) ||
          v.skuCode.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [lines, pickerSearch, variants])

  const addVariantLine = (v: SellableVariant) => {
    setLines((prev) => [
      ...prev,
      {
        childVariantId: v.variantId,
        skuCode: v.skuCode,
        variantName: v.label ? `${v.name} (${v.label})` : v.name,
        basePrice: v.price,
        quantity: 1
      }
    ])
  }

  const updateQty = (variantId: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.childVariantId === variantId
          ? { ...l, quantity: Math.max(1, l.quantity + delta) }
          : l
      )
    )
  }

  const removeLine = (variantId: string) => {
    setLines((prev) => prev.filter((l) => l.childVariantId !== variantId))
  }

  const priceNum = Number(comboPrice) || 0
  const savings = Math.max(0, sumRetail - priceNum)
  const savingsPct =
    sumRetail > 0 ? Math.round((savings / sumRetail) * 100) : 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name.trim()) {
      setError("Vui lòng nhập tên sản phẩm Combo.")
      return
    }
    if (lines.length < 1) {
      setError("Gói Combo cần ít nhất 1 biến thể SKU thành phần.")
      return
    }
    if (!Number.isInteger(priceNum) || priceNum < 0) {
      setError("Giá bán Combo phải là số nguyên VND không âm.")
      return
    }

    setSubmitting(true)
    try {
      if (isDemo) {
        const comboId = initial?.id ?? crypto.randomUUID()
        const saved: DemoComboRecord = {
          id: comboId,
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          description: description.trim(),
          comboPrice: priceNum,
          items: lines.map((l, idx) => ({
            id: crypto.randomUUID(),
            comboProductId: comboId,
            childVariantId: l.childVariantId,
            childProductId: l.childVariantId,
            skuCode: l.skuCode,
            variantName: l.variantName,
            basePrice: l.basePrice,
            imageUrl: null,
            quantity: l.quantity,
            lineTotal: l.basePrice * l.quantity,
            sortOrder: idx
          }))
        }
        await onSaved(saved, !isEdit)
      } else if (isEdit && initial) {
        const updatedItems = await upsertComboItems(
          initial.id,
          lines.map((l) => ({
            childVariantId: l.childVariantId,
            quantity: l.quantity
          }))
        )
        // Update default variant price if changed
        if (priceNum !== initial.comboPrice) {
          const prodVariants = await listCatalogProductVariants(initial.id)
          const primary = prodVariants[0]
          if (primary) {
            await updateCatalogVariant(primary.id, {
              basePrice: priceNum,
              version: primary.version
            })
          }
        }
        await onSaved(
          {
            ...initial,
            comboPrice: priceNum,
            items: updatedItems
          },
          false
        )
      } else {
        const created = await createCatalogProduct({
          name: name.trim(),
          description: description.trim() || undefined,
          categoryId: categoryId || undefined,
          brandId: brandId || undefined,
          baseUnit: "Bộ",
          isCombo: true,
          createDefaultVariant: true,
          defaultSkuCode: sku.trim().toUpperCase(),
          defaultBasePrice: priceNum,
          comboItems: lines.map((l) => ({
            childVariantId: l.childVariantId,
            quantity: l.quantity
          }))
        })
        await onSaved(
          {
            id: created.id,
            name: created.name,
            sku: sku.trim().toUpperCase(),
            description: created.description ?? "",
            comboPrice: priceNum,
            items: created.comboItems ?? []
          },
          true
        )
      }
    } catch (err) {
      setError(parseApiErr(err, "Không thể lưu sản phẩm Combo."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#163d36]/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Cấu hình Combo" : "Tạo sản phẩm Combo"}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#16866f]">
              Thiết kế Gói sản phẩm (Combo Builder)
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-[#163d36]">
              {isEdit
                ? `Cấu hình thành phần: ${initial?.name}`
                : "Tạo gói Sản phẩm Combo mới"}
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
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Tên gói Combo *
              <input
                required
                disabled={isEdit}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Combo Quà Tặng Xanh Eco"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f] disabled:bg-slate-100"
              />
            </label>

            <label className="text-xs font-medium text-slate-600">
              Mã SKU đại diện gói Combo *
              <input
                required
                disabled={isEdit}
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold uppercase text-[#163d36] outline-none focus:border-[#16866f] disabled:bg-slate-100"
              />
            </label>

            {!isEdit && (
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Mô tả ngắn
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ưu điểm nổi bật của bộ sản phẩm..."
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#16866f]"
                />
              </label>
            )}
          </div>

          {/* SKU Component Picker */}
          <div className="rounded-xl border border-slate-200 bg-[#fbfcfc] p-4">
            <p className="text-xs font-semibold text-[#163d36]">
              1. Chọn thêm SKU thành phần từ Catalog
            </p>
            <div className="relative mt-2">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Gõ tên sản phẩm hoặc mã SKU để thêm vào gói..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-[#16866f]"
              />
            </div>

            {pickerResults.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {pickerResults.map((v) => (
                  <button
                    key={v.variantId}
                    type="button"
                    onClick={() => addVariantLine(v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#16866f] hover:bg-[#f2fbf6] hover:text-[#147853]"
                  >
                    <Plus size={13} className="text-[#16866f]" />
                    <span>{v.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {v.skuCode}
                    </span>
                    <span className="font-semibold text-[#163d36]">
                      {formatMoney(v.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Lines */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs font-semibold text-[#163d36]">
              2. Danh sách SKU con trong gói ({lines.length} mặt hàng)
            </div>
            {lines.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">
                Chưa có SKU nào. Bấm chọn sản phẩm ở khung phía trên để thêm vào Combo.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <div
                    key={line.childVariantId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#163d36]">
                        {line.variantName}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">
                        {line.skuCode} · Đơn giá lẻ: {formatMoney(line.basePrice)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(line.childVariantId, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center font-bold tabular-nums text-[#163d36]">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.childVariantId, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="w-28 text-right font-semibold tabular-nums text-slate-700">
                      {formatMoney(line.basePrice * line.quantity)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(line.childVariantId)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Savings Live Calculator */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#cce8dc] bg-[#f2fbf6] p-4 sm:grid-cols-12 sm:items-center">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-[#163d36]">
                Giá bán trọn gói Combo (VND) *
                <input
                  required
                  type="number"
                  min={0}
                  step={1000}
                  value={comboPrice}
                  onChange={(e) => setComboPrice(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#16866f]/40 bg-white px-3 text-sm font-bold tabular-nums text-[#163d36] outline-none focus:border-[#16866f]"
                />
              </label>
              {sumRetail > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() =>
                        setComboPrice(
                          String(
                            Math.round((sumRetail * (1 - pct / 100)) / 1000) *
                              1000
                          )
                        )
                      }
                      className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-[#147853] shadow-2xs hover:bg-[#e6f5ee]"
                    >
                      Giảm -{pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs sm:col-span-7 sm:text-right">
              <p className="text-slate-600">
                Tổng giá bán lẻ các SKU con:{" "}
                <strong className="tabular-nums text-slate-800">
                  {formatMoney(sumRetail)}
                </strong>
              </p>
              <p className="text-sm font-bold text-[#147853]">
                {savings > 0
                  ? `Khách mua Combo tiết kiệm ngay ${formatMoney(savings)} (-${savingsPct}%)`
                  : "Chưa áp dụng mức giảm so với mua lẻ"}
              </p>
            </div>
          </div>
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
                ? "Lưu cấu hình Combo"
                : "Tạo gói Combo"}
          </Button>
        </div>
      </form>
    </div>
  )
}
