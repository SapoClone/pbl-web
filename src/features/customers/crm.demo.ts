import type { CustomerAddressItem } from "@/api/customer/customers"
import type {
  CustomerGroupItem,
  LoyaltySettingsConfig,
  LoyaltyTransactionItem,
  MembershipTierItem
} from "@/api/customer/crm"
import type { CustomerDebtSummary } from "@/api/finance/receivables"
import type { OrderApi } from "@/api/sales/orders"

export type CrmCustomerRecord = {
  id: string
  code: string
  memberCode?: string
  source: string
  name: string
  phone: string
  email: string
  address: string
  birthday: string
  note: string
  createdAt: string
  customerGroupId?: string | null
  membershipTierId?: string | null
  pointsBalance: number
  currentDebt: number
  debtLimit: number
}

export const DEMO_CUSTOMER_GROUPS: CustomerGroupItem[] = [
  {
    id: "22222222-2222-4222-8222-222222222200",
    code: "RETAIL",
    name: "Khách lẻ tiêu chuẩn",
    description: "Nhóm mặc định áp dụng cho khách mua lẻ tại POS & Website",
    defaultDiscountRate: 0,
    status: "ACTIVE",
    customerCount: 2,
    isSeeded: true
  },
  {
    id: "22222222-2222-4222-8222-222222222201",
    code: "VIP-OMNI",
    name: "Khách VIP OmniClub",
    description: "Khách hàng chi tiêu trên 10 triệu/năm, hưởng chiết khấu tự động tại quầy",
    defaultDiscountRate: 5,
    status: "ACTIVE",
    customerCount: 2,
    isSeeded: false
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    code: "WHOLESALE-B2B",
    name: "Đại lý & Khách sỉ B2B",
    description: "Đối tác nhập sỉ định kỳ, cấp hạn mức công nợ & chiết khấu sỉ",
    defaultDiscountRate: 12,
    status: "ACTIVE",
    customerCount: 1,
    isSeeded: true
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    code: "STAFF-FAMILY",
    name: "Nội bộ & Đối tác chiến lược",
    description: "Ưu đãi phúc lợi nội bộ có giới hạn theo quý",
    defaultDiscountRate: 8,
    status: "INACTIVE",
    customerCount: 0,
    isSeeded: false
  }
]

export const DEMO_MEMBERSHIP_TIERS: MembershipTierItem[] = [
  {
    id: "tier-member-01",
    code: "MEMBER",
    name: "Thành viên Mới",
    minPoints: 0,
    discountRate: 0,
    benefitsJson: {
      freeShipping: false,
      birthdayVoucherVnd: 30000,
      prioritySupport: false,
      note: "Tích điểm mọi kênh bán hàng POS, Website & Sàn TMĐT"
    },
    status: "ACTIVE"
  },
  {
    id: "tier-silver-02",
    code: "SILVER",
    name: "Hạng Bạc (Silver)",
    minPoints: 200,
    discountRate: 2,
    benefitsJson: {
      freeShipping: false,
      birthdayVoucherVnd: 50000,
      prioritySupport: false,
      note: "Giảm thêm 2% trên hóa đơn lẻ & quà sinh nhật 50.000đ"
    },
    status: "ACTIVE"
  },
  {
    id: "tier-gold-03",
    code: "GOLD",
    name: "Hạng Vàng (Gold)",
    minPoints: 600,
    discountRate: 5,
    benefitsJson: {
      freeShipping: true,
      birthdayVoucherVnd: 150000,
      prioritySupport: true,
      note: "Miễn phí giao hàng nội thành & ưu tiên xử lý đơn đa kênh"
    },
    status: "ACTIVE"
  },
  {
    id: "tier-diamond-04",
    code: "DIAMOND",
    name: "Kim Cương (Diamond)",
    minPoints: 1800,
    discountRate: 10,
    benefitsJson: {
      freeShipping: true,
      birthdayVoucherVnd: 300000,
      prioritySupport: true,
      note: "Chiết khấu VIP 10%, quà sinh nhật 300K & CSKH 1-1 chuyên biệt"
    },
    status: "ACTIVE"
  }
]

export const DEMO_LOYALTY_SETTINGS: LoyaltySettingsConfig = {
  enabled: true,
  earnAmountPerPoint: 10000,
  redeemValuePerPoint: 1000,
  pointsExpireMonths: 12,
  minRedeemPoints: 20,
  maxRedeemPointsPerOrder: 1500,
  holdTtlSeconds: 900,
  version: 1
}

export const DEMO_CUSTOMERS: CrmCustomerRecord[] = [
  {
    id: "cus-1",
    code: "KH000001",
    memberCode: "MEM20260001",
    source: "POS",
    name: "Nguyễn Minh Anh",
    phone: "0901234567",
    email: "minhanh@example.com",
    address: "18 Lý Thường Kiệt, Phường Phan Chu Trinh, Quận Hoàn Kiếm, Hà Nội",
    birthday: "1995-04-12",
    note: "Khách hàng thân thiết hay mua combo trà & bình giữ nhiệt tại POS",
    createdAt: "2026-10-12",
    customerGroupId: "22222222-2222-4222-8222-222222222201",
    membershipTierId: "tier-gold-03",
    pointsBalance: 740,
    currentDebt: 1450000,
    debtLimit: 5000000
  },
  {
    id: "cus-2",
    code: "KH000002",
    memberCode: "MEM20260002",
    source: "LAZADA",
    name: "Đặng Minh Khôi",
    phone: "0906112233",
    email: "minhkhoi.dang@lazada.vn",
    address: "85 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh",
    birthday: "1994-03-19",
    note: "Khách hàng đồng bộ từ Lazada Mall — Đơn LZD-8899202612",
    createdAt: "2026-11-10",
    customerGroupId: "22222222-2222-4222-8222-222222222200",
    membershipTierId: "tier-silver-02",
    pointsBalance: 320,
    currentDebt: 0,
    debtLimit: 3000000
  },
  {
    id: "cus-3",
    code: "KH000003",
    memberCode: "MEM20260003",
    source: "LAZADA",
    name: "Lý Thanh Thảo",
    phone: "0917223344",
    email: "thanhthao.ly@lazada.vn",
    address: "214 Võ Văn Tần, Phường 5, Quận 3, TP. Hồ Chí Minh",
    birthday: "1997-07-24",
    note: "Khách hàng VIP Lazada Flagship — Đơn LZD-8899202613",
    createdAt: "2026-11-12",
    customerGroupId: "22222222-2222-4222-8222-222222222201",
    membershipTierId: "tier-diamond-04",
    pointsBalance: 2150,
    currentDebt: 0,
    debtLimit: 10000000
  },
  {
    id: "cus-4",
    code: "KH000004",
    memberCode: "MEM20260004",
    source: "SHOPEE",
    name: "Trần Quốc Bảo (Đại lý Mộc Bắc)",
    phone: "0988776655",
    email: "quocbao.b2b@mocbac.vn",
    address: "42 Nguyễn Văn Cừ, Quận Long Biên, Hà Nội",
    birthday: "1989-11-05",
    note: "Đại lý nhập sỉ định kỳ đầu tháng, thanh toán công nợ 15 ngày",
    createdAt: "2026-09-20",
    customerGroupId: "22222222-2222-4222-8222-222222222202",
    membershipTierId: "tier-gold-03",
    pointsBalance: 980,
    currentDebt: 14800000,
    debtLimit: 20000000
  },
  {
    id: "cus-5",
    code: "KH000005",
    memberCode: "MEM20260005",
    source: "WEBSITE",
    name: "Phạm Khánh Linh",
    phone: "0933445566",
    email: "khanhlinh.pham@gmail.com",
    address: "102 Điện Biên Phủ, Quận Hải Châu, Đà Nẵng",
    birthday: "1999-02-14",
    note: "Đặt hàng qua Website chính thức, ưu tiên giao giờ hành chính",
    createdAt: "2026-11-14",
    customerGroupId: "22222222-2222-4222-8222-222222222200",
    membershipTierId: "tier-member-01",
    pointsBalance: 115,
    currentDebt: 0,
    debtLimit: 2000000
  }
]

export function buildDemoCustomerOrders(customer: CrmCustomerRecord): OrderApi[] {
  if (customer.id === "cus-4") {
    return [
      {
        id: "ord-b2b-01",
        code: "SO-202611-0192",
        branchId: "11111111-1111-4111-8111-111111111101",
        status: "COMPLETED",
        orderStatus: "COMPLETED",
        paymentStatus: "PARTIALLY_PAID",
        paymentMethod: "transfer",
        customerName: customer.name,
        totalAmount: 18800000,
        itemCount: 40,
        createdBy: "admin",
        createdAt: "2026-11-15T09:20:00.000Z",
        channel: { id: "ch-pos", type: "POS", name: "Bán sỉ Chi nhánh Q1" },
        items: [
          {
            id: "it-1",
            sku: "TERRA-500-GRN",
            name: "Bình giữ nhiệt Terra 500ml Xanh Rừng",
            quantity: 25,
            unitPrice: 420000,
            lineTotal: 10500000
          },
          {
            id: "it-2",
            sku: "TEA-OOLONG-250",
            name: "Trà Ô Long Thượng Hạng Mộc Châu 250g",
            quantity: 15,
            unitPrice: 553333,
            lineTotal: 8300000
          }
        ]
      }
    ]
  }

  return [
    {
      id: `ord-${customer.id}-1`,
      code: customer.source === "LAZADA" ? "SO-LZD-889912" : "SO-202611-0084",
      externalOrderCode:
        customer.source === "LAZADA" ? "508877665544" : undefined,
      branchId: "11111111-1111-4111-8111-111111111101",
      status: "COMPLETED",
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      paymentMethod: customer.source === "POS" ? "card" : "e_wallet",
      customerName: customer.name,
      totalAmount: 1290000,
      discountAmount: 65000,
      itemCount: 3,
      createdBy: "cashier.01",
      createdAt: "2026-11-16T14:35:00.000Z",
      channel: {
        id: "ch-1",
        type: customer.source || "POS",
        name:
          customer.source === "LAZADA"
            ? "Mộc Store Official Lazada"
            : customer.source === "SHOPEE"
              ? "Mộc Store Shopee Mall"
              : "Cửa hàng Flagship Quận 1"
      },
      items: [
        {
          id: "oi-1",
          sku: "TERRA-500-GRN",
          name: "Bình giữ nhiệt Terra 500ml Xanh Rừng",
          quantity: 2,
          unitPrice: 495000,
          lineTotal: 990000
        },
        {
          id: "oi-2",
          sku: "CERAMIC-CUP-01",
          name: "Ly gốm thủ công Bát Tràng men mộc",
          quantity: 1,
          unitPrice: 300000,
          lineTotal: 300000
        }
      ]
    },
    {
      id: `ord-${customer.id}-2`,
      code: "SO-202610-0411",
      branchId: "11111111-1111-4111-8111-111111111101",
      status: "COMPLETED",
      orderStatus: "COMPLETED",
      paymentStatus: "PAID",
      paymentMethod: "cash",
      customerName: customer.name,
      totalAmount: 680000,
      itemCount: 2,
      createdBy: "cashier.02",
      createdAt: "2026-10-28T10:15:00.000Z",
      channel: {
        id: "ch-pos",
        type: "POS",
        name: "Cửa hàng Flagship Quận 1"
      },
      items: [
        {
          id: "oi-3",
          sku: "GIFT-SET-AUTUMN",
          name: "Hộp quà Trà Thu Hội An Đặc Biệt",
          quantity: 1,
          unitPrice: 680000,
          lineTotal: 680000
        }
      ]
    }
  ]
}

export function buildDemoLoyaltyTransactions(
  customer: CrmCustomerRecord
): LoyaltyTransactionItem[] {
  return [
    {
      id: `ltx-${customer.id}-1`,
      type: "earn",
      points: 129,
      balanceAfter: customer.pointsBalance,
      orderCode:
        customer.source === "LAZADA" ? "SO-LZD-889912" : "SO-202611-0084",
      reason: "Tích điểm hoàn tất đơn hàng (10.000đ = 1 điểm)",
      createdAt: "2026-11-16T14:40:00.000Z"
    },
    {
      id: `ltx-${customer.id}-2`,
      type: "redeem",
      points: -50,
      balanceAfter: Math.max(0, customer.pointsBalance - 129),
      orderCode: "SO-202611-0040",
      reason: "Đổi 50 điểm giảm 50.000đ trực tiếp tại quầy POS",
      createdAt: "2026-11-05T17:10:00.000Z"
    },
    {
      id: `ltx-${customer.id}-3`,
      type: "adjust",
      points: 100,
      balanceAfter: Math.max(0, customer.pointsBalance - 79),
      orderCode: null,
      reason: "Thưởng điểm tri ân sinh nhật hội viên OmniClub",
      createdAt: "2026-10-20T09:00:00.000Z"
    }
  ]
}

export function buildDemoCustomerDebt(
  customer: CrmCustomerRecord
): CustomerDebtSummary {
  const current = customer.currentDebt
  const limit = customer.debtLimit || 5000000
  const available = Math.max(0, limit - current)

  if (current <= 0) {
    return {
      customerId: customer.id,
      creditLimit: limit,
      postedDebt: 0,
      heldCredit: 0,
      availableCredit: limit,
      prepaymentBalance: 0,
      openReceivablesCount: 0,
      receivables: [],
      ledger: [
        {
          id: `ldg-${customer.id}-0`,
          customerId: customer.id,
          entryType: "PAYMENT_APPLIED",
          amountDelta: -850000,
          balanceBefore: 850000,
          balanceAfter: 0,
          paymentMethod: "BANK_TRANSFER",
          note: "Đã tất toán công nợ kỳ trước qua chuyển khoản",
          occurredAt: "2026-10-30T15:20:00.000Z"
        }
      ]
    }
  }

  return {
    customerId: customer.id,
    creditLimit: limit,
    postedDebt: current,
    heldCredit: 0,
    availableCredit: available,
    prepaymentBalance: 0,
    openReceivablesCount: 1,
    receivables: [
      {
        id: `rec-${customer.id}-1`,
        code: customer.id === "cus-4" ? "AR-2026-0089" : "AR-2026-0042",
        customerId: customer.id,
        sourceType: "SALES_ORDER",
        sourceId:
          customer.id === "cus-4" ? "SO-202611-0192" : "SO-202611-0061",
        originalAmount: current + 4000000,
        paidAmount: 4000000,
        outstandingAmount: current,
        status: "PARTIALLY_PAID",
        dueDate: "2026-12-05T00:00:00.000Z",
        note: "Công nợ đơn hàng bán sỉ / trả chậm 15 ngày",
        createdAt: "2026-11-15T09:25:00.000Z"
      }
    ],
    ledger: [
      {
        id: `ldg-${customer.id}-2`,
        customerId: customer.id,
        receivableId: `rec-${customer.id}-1`,
        entryType: "PAYMENT_APPLIED",
        amountDelta: -4000000,
        balanceBefore: current + 4000000,
        balanceAfter: current,
        paymentMethod: "BANK_TRANSFER",
        note: "Thanh toán đợt 1 theo hợp đồng đại lý",
        occurredAt: "2026-11-16T11:00:00.000Z"
      },
      {
        id: `ldg-${customer.id}-1`,
        customerId: customer.id,
        receivableId: `rec-${customer.id}-1`,
        entryType: "RECEIVABLE_RECOGNIZED",
        amountDelta: current + 4000000,
        balanceBefore: 0,
        balanceAfter: current + 4000000,
        paymentMethod: null,
        note: "Ghi nhận khoản phải thu từ đơn hàng bán chịu",
        occurredAt: "2026-11-15T09:25:00.000Z"
      }
    ]
  }
}

export function buildDemoCustomerAddresses(
  customer: CrmCustomerRecord
): CustomerAddressItem[] {
  const base: CustomerAddressItem[] = []
  if (customer.address) {
    base.push({
      id: `addr-${customer.id}-1`,
      recipientName: customer.name,
      phone: customer.phone,
      addressLine: customer.address,
      ward: "Phường Bến Nghé",
      district: "Quận 1",
      province: customer.address.includes("Hà Nội")
        ? "Hà Nội"
        : customer.address.includes("Đà Nẵng")
          ? "Đà Nẵng"
          : "TP. Hồ Chí Minh",
      isDefault: true
    })
  }
  base.push({
    id: `addr-${customer.id}-2`,
    recipientName: `${customer.name} (Văn phòng)`,
    phone: customer.phone,
    addressLine: "Tòa nhà Vietcombank Tower, Số 5 Công Trường Mê Linh",
    ward: "Phường Bến Nghé",
    district: "Quận 1",
    province: "TP. Hồ Chí Minh",
    isDefault: base.length === 0
  })
  return base
}
