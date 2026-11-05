export const businesses = [
  ["Mộc Store", "Minh Anh", "Pro", "Hoạt động", "TH0001", "24"],
  ["Nhà Gốm An Nhiên", "Ngọc Hà", "Basic", "Hoạt động", "TH0002", "12"],
  ["Lá Xanh Market", "Hoàng Nam", "Pro", "Hoạt động", "TH0003", "18"],
  ["Mây Boutique", "Thu Trang", "Free", "Đang thử", "TH0004", "6"],
  ["Bếp Mộc", "Quỳnh Chi", "Basic", "Đã khóa", "TH0005", "9"],
  ["Nắng Studio", "Đức Long", "Basic", "Hoạt động", "TH0006", "15"]
] as const

export const businessDetails = {
  TH0001: {
    id: "TH0001",
    name: "Mộc Store",
    ownerName: "Minh Anh",
    ownerEmail: "minhanh@mocstore.vn",
    taxCode: "0312345678",
    createdAt: "12/03/2025 · 09:15",
    plan: "Pro",
    billingCycle: "Chu kỳ tháng",
    price: "599.000đ / tháng",
    subscriptionStatus: "Hết hạn sau 7 ngày",
    subscriptionNotice: "Mộc Store · TH0001"
  }
} as const

export const dashboardBars = [44, 62, 50, 76, 88, 70, 100]

export const dashboard = {
  metrics: [
    {
      label: "Doanh nghiệp hoạt động",
      value: "86 / 100",
      change: "+8 doanh nghiệp trong tháng"
    },
    { label: "Thuê bao sắp hết hạn", value: "12", change: "Trong 7 ngày tới" },
    {
      label: "Giao dịch hôm nay",
      value: "12.840",
      change: "+14,2% so với hôm qua"
    },
    { label: "Job cần xử lý", value: "8", change: "3 job đã vượt số lần thử" }
  ],
  transactionBars: dashboardBars,
  services: [
    { name: "API Gateway", detail: "142 ms · p95" },
    { name: "Cơ sở dữ liệu", detail: "42 kết nối đang sử dụng" },
    { name: "Hàng đợi", detail: "28 job đang chờ" },
    { name: "Webhook", detail: "98,7% thành công" }
  ],
  attention: [
    {
      subject: "Mộc Store",
      description: "Gói Pro hết hạn ngày 25/10/2026",
      status: "Sắp hết hạn",
      target: "business-detail"
    },
    {
      subject: "Nhà Gốm An Nhiên",
      description: "Sử dụng 98% dung lượng lưu trữ",
      status: "Gần hạn mức",
      target: "business-detail"
    },
    {
      subject: "Shopee · Đồng bộ tồn kho",
      description: "3 job lỗi cùng mã E_RATE_LIMIT",
      status: "Cần xử lý",
      target: "jobs"
    },
    {
      subject: "Lá Xanh Market",
      description: "Sử dụng 92% số lượng sản phẩm",
      status: "Gần hạn mức",
      target: "business-detail"
    },
    {
      subject: "Mây Boutique",
      description: "Chưa xác thực email chủ tài khoản",
      status: "Cần xử lý",
      target: "business-detail"
    },
    {
      subject: "Bếp Mộc",
      description: "Doanh nghiệp đang bị khóa",
      status: "Đã khóa",
      target: "business-detail"
    },
    {
      subject: "Nắng Studio",
      description: "Thuê bao sẽ hết hạn trong 3 ngày",
      status: "Sắp hết hạn",
      target: "business-detail"
    },
    {
      subject: "TikTok Shop · Đồng bộ đơn hàng",
      description: "Webhook phản hồi chậm hơn 5 phút",
      status: "Cần xử lý",
      target: "jobs"
    },
    {
      subject: "Mộc Store",
      description: "Có 2 phiên hỗ trợ đang mở",
      status: "Đang xử lý",
      target: "business-detail"
    },
    {
      subject: "Nhà Gốm An Nhiên",
      description: "Thanh toán kỳ tiếp theo chưa xác nhận",
      status: "Cần xử lý",
      target: "business-detail"
    },
    {
      subject: "Shopee · Cập nhật sản phẩm",
      description: "5 job đang chờ thử lại",
      status: "Cần xử lý",
      target: "jobs"
    },
    {
      subject: "Lá Xanh Market",
      description: "Sử dụng 88% dung lượng lưu trữ",
      status: "Theo dõi",
      target: "business-detail"
    },
    {
      subject: "Mây Boutique",
      description: "Gói dùng thử còn 2 ngày",
      status: "Sắp hết hạn",
      target: "business-detail"
    },
    {
      subject: "Bếp Mộc",
      description: "Có thay đổi cấu hình gói dịch vụ",
      status: "Cần kiểm tra",
      target: "business-detail"
    },
    {
      subject: "Nắng Studio",
      description: "Đồng bộ tồn kho lần cuối 4 giờ trước",
      status: "Cần xử lý",
      target: "jobs"
    },
    {
      subject: "Nắng Studio",
      description: "Đồng bộ tồn kho lần cuối 4 giờ trước",
      status: "Cần xử lý",
      target: "jobs"
    },
    {
      subject: "Webhook · Lazada",
      description: "Tỷ lệ thành công giảm dưới 95%",
      status: "Cảnh báo",
      target: "jobs"
    }
  ]
} as const

export const userRows = [
  ["Lan Anh", "Nền tảng", "Quản trị viên", "Hoạt động", "26/10/2026 · 09:42"],
  ["Minh Anh", "Mộc Store", "Chủ cửa hàng", "Hoạt động", "26/10/2026 · 08:15"],
  [
    "Trần Bảo Long",
    "Bếp Mộc",
    "Quản lý chi nhánh",
    "Hoạt động",
    "25/10/2026 · 22:08"
  ],
  ["Ngọc Hà", "Nhà Gốm An Nhiên", "Chủ cửa hàng", "Chưa xác thực", "—"],
  ["Thu Trang", "Mây Boutique", "Nhân viên", "Đang khóa", "18/10/2026 · 16:20"]
] as const

export const plans = [
  ["Free", "0 đ", "1 chi nhánh", "3 người dùng", "100 sản phẩm"],
  ["Basic", "299.000 đ", "2 chi nhánh", "10 người dùng", "1.000 sản phẩm"],
  ["Pro", "599.000 đ", "5 chi nhánh", "30 người dùng", "10.000 sản phẩm"]
] as const

export const subscriptions = [
  ["SUB-0001", "Mộc Store", "Pro", "01/10 – 01/11/2026", "Hoạt động"],
  [
    "SUB-0002",
    "Nhà Gốm An Nhiên",
    "Basic",
    "12/10 – 12/11/2026",
    "Đang hoạt động"
  ],
  ["SUB-0003", "Lá Xanh Market", "Pro", "25/09 – 25/10/2026", "Sắp hết hạn"],
  ["SUB-0004", "Bếp Mộc", "Basic", "01/09 – 01/10/2026", "Đã hết hạn"]
] as const

export const jobs = [
  [
    "JOB-00984",
    "Mộc Store",
    "E_RATE_LIMIT",
    "3 / 3",
    "26/10 · 22:01",
    "pending"
  ],
  [
    "JOB-00981",
    "Lá Xanh Market",
    "E_TIMEOUT",
    "2 / 3",
    "26/10 · 21:58",
    "retrying"
  ],
  [
    "JOB-00978",
    "Nhà Gốm An Nhiên",
    "E_TOKEN_EXPIRED",
    "1 / 3",
    "26/10 · 21:42",
    "retrying"
  ],
  [
    "JOB-00975",
    "Bếp Mộc",
    "E_INVALID_SKU",
    "3 / 3",
    "26/10 · 21:30",
    "pending"
  ],
  [
    "JOB-00972",
    "Mây Boutique",
    "E_WEBHOOK_TIMEOUT",
    "2 / 3",
    "26/10 · 20:55",
    "retrying"
  ],
  [
    "JOB-00969",
    "Nắng Studio",
    "E_RATE_LIMIT",
    "3 / 3",
    "26/10 · 20:40",
    "pending"
  ],
  [
    "JOB-00966",
    "Mộc Store",
    "E_TOKEN_EXPIRED",
    "3 / 3",
    "26/10 · 20:12",
    "pending"
  ],
  [
    "JOB-00961",
    "Lá Xanh Market",
    "E_TIMEOUT",
    "3 / 3",
    "26/10 · 19:48",
    "pending"
  ],
  [
    "JOB-00958",
    "Nhà Gốm An Nhiên",
    "E_INVALID_PAYLOAD",
    "1 / 3",
    "26/10 · 19:20",
    "retrying"
  ],
  [
    "JOB-00951",
    "Bếp Mộc",
    "E_RATE_LIMIT",
    "1 / 3",
    "26/10 · 18:42",
    "retrying"
  ],
  [
    "JOB-00944",
    "Mây Boutique",
    "E_TOKEN_EXPIRED",
    "1 / 3",
    "26/10 · 17:30",
    "resolved"
  ],
  [
    "JOB-00938",
    "Nắng Studio",
    "E_TIMEOUT",
    "2 / 3",
    "26/10 · 16:15",
    "resolved"
  ],
  [
    "JOB-00931",
    "Mộc Store",
    "E_INVALID_SKU",
    "3 / 3",
    "26/10 · 15:50",
    "resolved"
  ],
  [
    "JOB-00925",
    "Lá Xanh Market",
    "E_WEBHOOK_TIMEOUT",
    "2 / 3",
    "26/10 · 14:25",
    "resolved"
  ],
  [
    "JOB-00918",
    "Nhà Gốm An Nhiên",
    "E_RATE_LIMIT",
    "1 / 3",
    "26/10 · 13:10",
    "resolved"
  ]
] as const

export const limits = [
  {
    business: "Mộc Store",
    plan: "Pro",
    branches: "1 / 5",
    users: "8 / 30",
    products: "1.200 / 10.000",
    storage: "12 / 50 GB",
    alert: "Bình thường",
    detail: []
  },
  {
    business: "Nhà Gốm An Nhiên",
    plan: "Basic",
    branches: "2 / 5",
    users: "10 / 30",
    products: "1.630 / 10.000",
    storage: "21 / 50 GB",
    alert: "Bình thường",
    detail: []
  },
  {
    business: "Lá Xanh Market",
    plan: "Pro",
    branches: "3 / 5",
    users: "12 / 30",
    products: "2.060 / 10.000",
    storage: "30 / 50 GB",
    alert: "Gần hạn mức",
    detail: []
  },
  {
    business: "Mây Boutique",
    plan: "Free",
    branches: "4 / 5",
    users: "14 / 30",
    products: "2.490 / 10.000",
    storage: "39 / 50 GB",
    alert: "Vượt hạn mức",
    detail: [
      { resource: "Chi nhánh", percent: 100, value: "2 / 2" },
      { resource: "Người dùng", percent: 100, value: "10 / 10" },
      { resource: "Sản phẩm", percent: 86, value: "860 / 1.000" },
      { resource: "Dung lượng", percent: 64, value: "6,4 / 10 GB" }
    ]
  }
] as const

export const services = [
  ["API Gateway", "Ổn định", "142 ms · p95", "22:01:06"],
  ["PostgreSQL", "Ổn định", "42 / 100 kết nối", "22:01:02"],
  ["Redis", "Ổn định", "61% bộ nhớ", "22:00:58"],
  ["Integration Worker", "Cảnh báo", "9 job lỗi", "22:00:54"]
] as const

export const auditLogs = [
  ["AUD-0024", "26/10 · 22:05", "Lan Anh", "Nền tảng", "Thử lại job", "JOB-00984", "Thành công"],
  ["AUD-0023", "26/10 · 21:43", "Lan Anh", "Mộc Store", "Sửa cấu hình gói", "SUB-0001", "Thành công"],
  ["AUD-0022", "26/10 · 20:18", "Hệ thống", "Nhà Gốm An Nhiên", "Gửi cảnh báo", "TH0002", "Thành công"],
  ["AUD-0021", "26/10 · 18:02", "Lan Anh", "Mây Boutique", "Khóa đăng nhập", "USR-0038", "Thành công"],
  ["AUD-0020", "26/10 · 17:45", "Lan Anh", "Nền tảng", "Cập nhật quyền người dùng", "USR-0042", "Thất bại"],
  ["AUD-0019", "26/10 · 16:30", "Hệ thống", "Lá Xanh Market", "Đồng bộ thuê bao", "SUB-0003", "Thành công"],
  ["AUD-0018", "26/10 · 15:12", "Lan Anh", "Mộc Store", "Kiểm tra kết nối sàn", "INT-0001", "Thành công"],
  ["AUD-0017", "26/10 · 14:08", "Hệ thống", "Nắng Studio", "Tạo job đồng bộ", "JOB-00925", "Thành công"],
  ["AUD-0016", "26/10 · 13:20", "Lan Anh", "Nền tảng", "Đăng nhập quản trị", "USR-0001", "Thành công"],
  ["AUD-0015", "26/10 · 11:52", "Lan Anh", "Bếp Mộc", "Khóa doanh nghiệp", "TH0005", "Thất bại"]
] as const

export const integrations = [
  ["Mộc Store", "Shopee", "Official Sandbox", "Đã kết nối", "26/10 · 21:58"],
  [
    "Nhà Gốm An Nhiên",
    "TikTok Shop",
    "Development Shop",
    "Xác thực lại",
    "26/10 · 21:32"
  ],
  [
    "Lá Xanh Market",
    "Shopee",
    "Official Sandbox",
    "Đã kết nối",
    "26/10 · 21:30"
  ],
  [
    "Mây Boutique",
    "TikTok Shop",
    "Development Shop",
    "Chưa đồng bộ",
    "Chưa có dữ liệu"
  ]
] as const

export const settings = {
  platformName: "Omniretail",
  supportEmail: "support@omniretail.vn",
  timezone: "Asia/Ho_Chi_Minh · UTC+7",
  dateFormat: "dd/mm/yyyy",
  currency: "VND",
  language: "Tiếng Việt",
  loginLockPolicy: "Sau 5 lần sai liên tiếp trong 15 phút.",
  resetLinkPolicy: "Hiệu lực 15 phút · Dùng một lần.",
  auditRetention: "Lưu tối thiểu 12 tháng · Không sửa, xóa.",
  emailSender: "Omniretail Admin",
  emailReplyTo: "no-reply@omniretail.vn",
  emailFooter: "Thông báo từ hệ thống quản trị Omniretail."
} as const
