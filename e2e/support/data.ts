/**
 * Test data for the whole suite, written the way a real shop would: a coffee shop with named people, products,
 * suppliers and customers, so that a person watching a recording understands what is going on.
 *
 * Only values that must be unique per run (emails, the store's access code) carry the run id.
 */
import { readWorld } from "./world"

const run = () => readWorld().runId

export const people = {
  owner: {
    name: "Nguyễn Minh Anh",
    email: () => `minh.anh.${run()}@cuahang-demo.vn`,
    password: "MatKhau2026!",
  },
  cashier: {
    name: "Lê Hoàng Nam",
    email: () => `hoang.nam.${run()}@cuahang-demo.vn`,
    password: "MatKhau2026!",
  },
  stranger: {
    // Never registered: used for the "wrong sign-in" flows
    email: () => `khong.ton.tai.${run()}@cuahang-demo.vn`,
    password: "SaiMatKhau123!",
  },
}

export const store = {
  name: "Cửa hàng Cà Phê Hạt Mộc",
  // 3-30 chars of a-z 0-9 and "-"
  accessCode: () => `hat-moc-${run()}`,
  phone: "+84901234567",
  email: "xinchao@cafehatmoc.vn",
  address: "25 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  newPhone: "+84283822111",
  newAddress: "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
}

export const branches = {
  main: { name: "Cửa hàng chính" },
  second: { name: "Chi nhánh Quận 3", code: "CN-Q3", address: "88 Võ Văn Tần, Quận 3", phone: "+84283930111" },
}

export const catalog = {
  category: "Cà phê rang xay",
  brand: "Hạt Mộc",
  products: {
    arabica: {
      name: "Cà phê Arabica Cầu Đất 250g",
      sku: "CF-ARA-250",
      price: 135000,
      description: "Hạt Arabica Cầu Đất rang vừa, hương trái cây và hậu vị ngọt.",
    },
    robusta: {
      name: "Cà phê Robusta Buôn Ma Thuột 500g",
      sku: "CF-ROB-500",
      price: 189000,
      description: "Robusta nguyên chất rang đậm, đắng gắt, hợp pha phin.",
    },
    phin: {
      name: "Phin nhôm Hạt Mộc size 2",
      sku: "PHIN-NHOM-02",
      price: 65000,
      description: "Phin nhôm đáy dày dùng cho 1-2 người.",
    },
  },
  priceList: { name: "Bảng giá sỉ cho quán cà phê" },
}

export const inventory = {
  // Opening stock received by the receipt flow
  openingStock: { arabica: 40, robusta: 25, phin: 60 },
  receiptNote: "Nhập hàng đợt 1 tháng 12 từ xưởng rang",
  warehouse: { code: "KHO-Q3", name: "Kho Quận 3" },
}

export const suppliers = {
  caudat: {
    code: "NCC-CAUDAT",
    name: "Công ty TNHH Nông sản Cầu Đất",
    phone: "0263382211",
    email: "kinhdoanh@nongsancaudat.vn",
    address: "Xã Xuân Trường, Đà Lạt, Lâm Đồng",
    taxCode: "5800123456",
  },
  purchaseOrderNote: "Giao trong giờ hành chính, gọi trước 30 phút",
}

export const customers = {
  ngoc: { name: "Trần Thị Bích Ngọc", phone: "0901234567", email: "bichngoc@example.com", address: "45 Pasteur, Quận 1" },
  bao: { name: "Lê Quốc Bảo", phone: "0912345678", email: "quocbao@example.com", address: "9 Hai Bà Trưng, Quận 3" },
  group: { code: "KHACH-THAN-THIET", name: "Khách thân thiết", discountPercent: 5, description: "Khách mua từ 5 lần trở lên" },
}

export const promotions = {
  program: { code: "KM-THANG-12", name: "Khuyến mãi tháng 12 - giảm 10%", percent: 10 },
  coupon: { code: "NOEL2026", maxUses: 100 },
}

export const roles = {
  cashier: {
    name: "Thu ngân ca sáng",
    description: "Chỉ bán hàng tại quầy và xem đơn, khách hàng",
    // Permission matrix cells to tick: [module label as the API names it, action label]
    cells: [
      ["pos", "Xem"],
      ["orders", "Xem"],
      ["customers", "Xem"],
    ] as const,
  },
}

export const pos = {
  registerCode: "QUAY-01",
  openingCash: 500000,
  // Two Arabica + one phin: 2 x 135.000 + 65.000 = 335.000 VND
  cart: [
    { product: "arabica" as const, qty: 2 },
    { product: "phin" as const, qty: 1 },
  ],
  total: 335000,
  tendered: 500000,
  change: 165000,
}

export const shifts = {
  name: "Ca sáng",
  start: "07:00",
  end: "12:00",
}

/** VND the way the app prints it, e.g. 335000 -> "335.000" (the currency sign varies by page, so match the number) */
export const vnd = (n: number) => n.toLocaleString("vi-VN")
