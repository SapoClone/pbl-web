# Tenant web app (pbl-web) E2E inventory

Everything below comes from the source; I did not run the app. `src` means `/home/truong/Code/PBL6/pbl-web/src`. Labels are copied verbatim. `*` marks a required field. Almost no page has `data-testid`, so use role, label and text selectors.

## 0. Cross-cutting

**API base URL** (`src/config/env-config.ts`, `src/api/axios/index.ts`)
- `API_URL` is `VITE_API_URL` with the trailing `/` trimmed, defaulting to `/platform/api/v1`. It is used by `axiosClient` for the platform service: `/auth/*`, `/tenants*`, `/branches`, `/roles`, `/permissions`, `/staff-schedules`.
- `GATEWAY_URL` is `VITE_GATEWAY_URL` if set. Otherwise it is the origin of `API_URL` if that is an absolute URL, else `/`.
- `gatewayClient` calls `/<service>/api/v1/...` with services `sales`, `catalog`, `inventory`, `customer`, `finance`, `insight`, `integration`.
- No `.env` files exist. The only env var in CI is `VITE_API_URL` (`.github/workflows/deploy.yml`).
- Dev server (`vite.config.mts`): port 5174, `host: true`. It proxies `/api`, `/platform`, `/sales`, `/insight`, `/inventory`, `/catalog`, `/static`, `/integration`, `/customer`, `/finance` to `https://api.sapo.makeasy.id.vn` (production gateway). The proxy bypasses requests with `Accept: text/html`, so browser navigations get `index.html`.
- An HTML response to an API call is rejected with an error (`isHtmlResponse`).
- For E2E, mock with `page.route("**/platform/api/v1/**")` and `page.route("**/{sales,catalog,inventory,customer,insight,finance,integration}/api/v1/**")`.

**Token storage**
- localStorage key `pbl-auth` holds JSON `{userId, accessToken, refreshToken, tokenExpires, isDemo?, tenantId?, tenants:[{id,name,subdomain?,role?,roleId?,roleName?}]}`. It is managed by zustand `useStoreAuth` (`src/store/zustand/useStoreAuth.ts`).
- Every request sends `Authorization: Bearer <accessToken>`.
- On a 401 it calls `POST /auth/refresh {refreshToken}` once and retries. If refresh fails it clears tokens. It never refreshes for demo tokens.
- Other localStorage key: `omni_sidebar_collapsed` ("true" or "false").
- To seed a session without the UI, put a token like this in `pbl-auth`. The JWT payload is only decoded, never verified (see `src/test/jwt.ts` `fakeAccessToken({perms:[...]})`).
  - `{"userId":"u","accessToken":"<jwt with claims perms:[\"*\"]>","refreshToken":"r","tokenExpires":9999999999999,"tenantId":"t1","tenants":[{"id":"t1","name":"X"}]}`

**Demo mode (`isDemo`)**
- Logging in with `test1@gmail.com` / `123456` is intercepted client-side with no API call. It stores `createDemoTokens()`: `isDemo:true`, `tenantId:"demo-tenant"`, tenant "Cửa hàng demo", and `accessToken:"demo-access-token"`.
- The login message is "Đang sử dụng chế độ demo vì pbl-api chưa chạy." and it navigates to `/`.
- In demo mode:
  - `usePermissions` returns `perms=null`, so nothing is hidden.
  - Pages skip their queries (`enabled: !isDemo`) and render built-in mock data. Mutations only change local state and call no API.
  - The sidebar card shows "Mộc Store", "Gói Pro", "3/5 chi nhánh". The orders badge is 3. The topbar branch pill reads "CN Quận 1 - Flagship".
  - Several pages show a demo banner: "Đang hiển thị dữ liệu minh họa vì đang dùng tài khoản Demo offline." (overview), "Trải nghiệm Demo" (inventory, suppliers), "Chế độ Demo tương tác" (customers).
- For real E2E, do not use the demo account unless the test is explicitly about demo.

**Route guard** (`src/routes/__root.tsx`)
- Public paths are `/login`, `/register`, `/forgot-password`. Any other path without `accessToken` redirects to `/login`.
- A token with no `tenantId` and no `tenants` redirects to `/onboarding-tenant`.
- `/onboarding-tenant` redirects to `/` if the token already has a tenant.
- `/settings` only checks the token.
- Auth pages and `/onboarding-tenant` render without the Layout (no sidebar or topbar).

**Permissions** (`src/lib/permissions.ts`, `src/components/layout/index.tsx`)
- Permissions come from the JWT claim `perms`: `["*"]` for the owner, else a list of codes like `orders.view`.
- `can(code)` is true if `perms` is null (unknown), contains `"*"`, or contains the code. No code means allowed.
- The sidebar hides nav items without permission. The Layout shows `<NoAccess>` instead of the page.
- NoAccess is `role="alert"` with h1 "Bạn chưa có quyền mở trang này" and the text "Vai trò của bạn không có quyền `<code>`. Hãy nhờ chủ cửa hàng cấp quyền trong mục Nhân viên & Quyền." It has a link "Về trang bạn được phép" (first allowed nav item).
- Nav item to permission:

| Item | Path | Permission |
|---|---|---|
| Tổng quan | `/` | `dashboard.view` |
| Sản phẩm | `/products` | `products.view` |
| Tồn kho | `/inventory` | `inventory.view` |
| Đơn hàng | `/orders` | `orders.view` |
| Bán tại quầy | `/pos` | `pos.view` |
| Khuyến mãi | `/promotions` | `orders.view` (not `promotions.*`) |
| Kênh bán hàng | `/channels` | `channels.view` |
| Khách hàng | `/customers` | `customers.view` |
| Báo cáo | `/reports` | `reports.view` |
| Nhập hàng & NCC | `/suppliers` | `purchasing.view` |
| Nhân viên & Quyền | `/staff` | `staff.view` |
| Cài đặt (footer link) | `/settings` | none |

- In-page gates exist only for staff:
  - `staff.create`: button "Thêm nhân viên".
  - `staff.update`: "Sửa quyền", the lock/unlock icon, "Thêm vai trò", saving roles, and shift edits. Without it the roles panel is read-only and shows "Chỉ xem".
  - `staff.delete`: "Xóa" on a member.
- Every other action is gated by the API (403).

**Sidebar and topbar** (`src/components/layout/Sidebar/Sidebar.tsx`, `src/components/layout/Topbar/Topbar.tsx`)
- Sidebar:
  - Logo text "OmniRetail".
  - Store card button, a `button` with `aria-expanded`, no `aria-label`. Its text is the tenant name, then `Gói {planName}` (a `<b>`) and `{n} chi nhánh`.
    - Real mode: name = context.tenant.name ?? token tenant name ?? "Cửa hàng của bạn". It shows `Gói <plan.name>` and `<branchCount> chi nhánh`.
    - It calls `GET /tenants/current/context` (axiosClient, retry:false, staleTime 60s). If that fails, only the name remains.
  - Clicking the card opens a menu:
    - Heading "Cửa hàng đang quản lý", with one button per `tokens.tenants` (the current one has a check).
    - "Quản lý chi nhánh & gói cước" goes to `/settings`.
    - "Tạo cửa hàng mới" goes to `/onboarding-tenant`, which immediately redirects to `/` because the user already has a tenant.
  - Selecting another tenant only runs `setTokens({...tokens, tenantId})` and invalidates queries. It does NOT call `POST /auth/switch-tenant`, even though `switchTenant` exists in `src/api/auth.ts`.
  - Section label "Không gian làm việc". Nav buttons with children are toggles (`aria-expanded`). Their child links are named by the labels in the navigation table, e.g. `/products?tab=price-lists`.
  - The orders item shows a numeric badge, `needsAction.total + awaitingConfirmation` from `GET /sales/api/v1/orders/summary`.
  - Footer: "Cài đặt cửa hàng" (link to `/settings`), "Đăng xuất" (button), "Trạng thái kết nối kênh" (link to `/channels?tab=overview`), and the text "OmniRetail Cloud · v2.4".
  - Mobile: `aria-label="Mở menu"` and `"Đóng menu"`.
- Logout:
  - Calls `POST /auth/logout`, clears tokens regardless, then goes to `/login`.
  - The button text becomes "Đang đăng xuất...".
  - If the API fails, the warning "Không thể thu hồi phiên trên máy chủ, nhưng tài khoản đã được đăng xuất khỏi thiết bị." appears.
- Topbar:
  - Collapse toggle with `aria-label` "Thu gọn thanh menu" or "Mở rộng thanh menu".
  - Breadcrumb `nav aria-label="Breadcrumb"`: link "OmniRetail" then a title from this map: `/`="Tổng quan điều hành", `/orders`="Quản lý Đơn hàng", `/pos`="Bán tại quầy (POS)", `/products`="Danh mục & Bảng giá", `/inventory`="Quản lý Kho & Tồn", `/customers`="Khách hàng & Loyalty", `/promotions`="Khuyến mãi & Coupon", `/channels`="Kênh bán & Sàn TMĐT", `/reports`="Báo cáo Đa kênh", `/suppliers`="Nhà cung cấp", `/staff`="Nhân viên & Phân quyền", `/settings`="Cài đặt Cửa hàng", otherwise "Không gian làm việc".
  - "Tìm nhanh (Đơn, SP, Khách)..." and the ⌘K kbd are a non-functional static span.
  - **There is no real branch switcher in the layout.** The pill "Chi nhánh: Flagship Store" is hardcoded static text (demo: "CN Quận 1 - Flagship"). Branch selection happens inside pages: Inventory has `select` "Chi nhánh" and "Kho", POS has a branch select, Reports has `aria-label="Chọn chi nhánh báo cáo"`, and Staff/Settings manage branches.
- Shared header (`src/shared/dashboard/DashboardHeader.tsx`) is used by overview, orders, products, inventory and suppliers, with a different h1 per page.
  - A button "Xuất báo cáo" (overview and all others) has no handler, so treat it as inert.
  - A button "Thêm mới" appears only when the page passes `onCreate`. Currently only Products does, and only on the catalog tab.
  - h1 values: Tổng quan kinh doanh / Đơn hàng / Sản phẩm / Tồn kho / Nhập hàng & nhà cung cấp. Overview also shows "Trung tâm điều hành" and "Hôm nay · <date>".

## 1. Auth (`src/features/auth/AuthPage.tsx`, routes `/login`, `/register`, `/forgot-password`)

**Common elements**
- The email input has label text "Email", placeholder "ban@cuahang.vn", type email, required.
- The submit button text is "Đăng nhập" / "Đăng ký" / "Gửi liên kết" (an arrow icon follows the text; the text becomes disabled while submitting).
- The message and error paragraph has `role="status"` (both success and error, with red or green classes).
- Heading h1 by mode:
  - login: "Chào mừng trở lại"
  - register: "Tạo tài khoản Omniretail"
  - forgot: "Khôi phục mật khẩu"
- Side text: "Dữ liệu được phân tách theo cửa hàng. Chỉ truy cập các chi nhánh được cấp quyền."

**Login `/login`**
- Fields: Email, "Mật khẩu" (placeholder "Nhập mật khẩu", `minLength=6`, required).
- The eye toggle button has `aria-label` "Hiện mật khẩu" or "Ẩn mật khẩu".
- Checkbox "Ghi nhớ đăng nhập" (non-functional).
- Links: "Quên mật khẩu?" goes to `/forgot-password`. "Đăng ký OmniRetail" (under "Chưa có cửa hàng?") goes to `/register`.
- API: `POST /auth/email/login {email(trimmed), password, tenantId: undefined}` returns AuthTokens. It is stored and then navigates to `/`. If `tenantId` and `tenants` are empty, the root guard sends the user to `/onboarding-tenant`.
- Errors, taken from `response.data`:
  - If `details[]` exists, it is joined as "property: message".
  - Else the string `message`.
  - A 401 with no message gives "Email hoặc mật khẩu không chính xác."
  - Non-axios or other errors give "Không thể hoàn tất yêu cầu. Vui lòng thử lại."
  - A message equal to "Validation failed" is replaced with "Thông tin đăng ký chưa đúng. Vui lòng kiểm tra email và mật khẩu."
- Demo: `test1@gmail.com` / `123456` (see section 0).

**Register `/register`**
- Fields: Email, "Tên tài khoản" (placeholder "Tên cửa hàng hoặc người dùng", maxLength 100, optional), "Mật khẩu" (placeholder "Nhập mật khẩu"), "Nhập lại mật khẩu" (placeholder "Nhập lại mật khẩu"). The eye toggle also reveals the confirm field. Link "Quay lại đăng nhập".
- Client validation (checked in order, shown in the `role=status` paragraph):
  1. `password !== confirm` gives "Mật khẩu xác nhận không khớp."
  2. Length under 6, or not matching `/^[\d!#$%&*@A-Z^a-z]*$/`, gives "Mật khẩu phải có ít nhất 6 ký tự và chỉ được dùng chữ cái, số hoặc ! # $ % & * @ ^."
  - Native HTML validation fires first (required, email type, minLength 6).
- API sequence:
  1. `POST /auth/email/register {email, password, name?}`
  2. `POST /auth/email/login {email, password}`
  3. Store tokens and navigate to `/onboarding-tenant`.
- Server errors use the same mapping as login.

**Forgot `/forgot-password`**
- Email only. Submit "Gửi liên kết". API: `POST /auth/forgot-password {email}`.
- Always shows the success message "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi sớm." Errors use the generic mapping.
- Link "Quay lại đăng nhập".

## 2. Onboarding tenant (`/onboarding-tenant`, `src/features/onboarding-tenant/TenantOnboardingPage.tsx`)

- Texts: "Bước cuối", h1 "Tạo cửa hàng của bạn", "Tài khoản chưa thuộc cửa hàng nào. Hãy tạo một cửa hàng để bắt đầu sử dụng OmniRetail."
- Fields:
  - "Tên cửa hàng" (placeholder "Cửa hàng của tôi", required, max 150).
  - "Mã truy cập cửa hàng" (placeholder "cuahang-cua-toi"). It auto-lowercases and strips characters outside `[a-z0-9-]`. Required, min 3, max 30, pattern `[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])`. Hint "3–30 ký tự thường, số hoặc dấu gạch ngang."
  - "Số điện thoại" (placeholder "+84901234567", pattern `\+?[0-9]{8,15}`).
  - "Email cửa hàng" (placeholder "shop@example.com").
  - "Địa chỉ" (placeholder "Địa chỉ cửa hàng (không bắt buộc)", max 255).
- Submit "Tạo cửa hàng và bắt đầu" (shows "Đang tạo cửa hàng..."). Top-right button "Đăng xuất" (runs `POST /auth/logout`, then `/login`).
- API: `POST /tenants {name, subdomain, phone?, email?, address?}` returns `{tenant, auth}`. The page stores `auth` as the new tokens and navigates to `/`.
- Errors are shown in `role="alert"`: the server `message` (string or array joined by a space), else "Không thể tạo cửa hàng. Vui lòng kiểm tra thông tin và thử lại."
- The logout error "Không thể thu hồi phiên trên máy chủ, nhưng tài khoản sẽ được đăng xuất khỏi thiết bị." appears in the same `role=alert` paragraph.

## 3. Overview (`/`, `OverviewPage.tsx`)

- Real-data page. API (real mode only):
  - `GET /insight/api/v1/sales-summary/daily?from&to` (7 days)
  - `GET /sales/api/v1/orders?page=1&limit=1`
  - `GET /sales/api/v1/orders/summary`
  - `GET /inventory/api/v1/stock/summary`
  - `GET /inventory/api/v1/stock-levels`
- Quick links:
  - "Mở quầy POS" goes to `/pos`.
  - "Tạo phiếu nhập kho" goes to `/inventory`.
  - "Đồng bộ sàn TMĐT" goes to `/channels`.
- KPI labels:
  - "Doanh thu 7 ngày" (sub-label "Đồng bộ đa kênh")
  - "Đơn hàng trong kỳ" ("Vận hành ổn định" or "{n} đơn sàn cần xử lý")
  - "Giá trị đơn trung bình" ("Doanh thu / đơn")
  - "SKU chạm ngưỡng / hết tồn" ("Cần bổ sung tồn" or "Đủ định mức")
- Sections:
  - "Biểu đồ doanh thu theo ngày" (empty text "Chưa có dữ liệu doanh thu trong 7 ngày qua.") with link "Báo cáo chi tiết".
  - "Cảnh báo tồn kho & Vận hành" with link "Xử lý", empty text "Tất cả mặt hàng đều đạt trên định mức tồn kho an toàn.", links "Thiết lập định mức" and "Xem toàn bộ tồn kho", and stock labels "Hết hàng" / "Còn {n}".
  - "Đơn hàng gần đây" with link "Xem tất cả".
- Demo shows mock data.

## 4. Products (`/products?tab=catalog|price-lists|combos`, `ProductsPage.tsx` and siblings)

- Tab control: `ariaLabel="Phân mục quản lý Sản phẩm"` with tabs "Danh mục Sản phẩm", "Bảng giá theo Kênh bán", "Sản phẩm Combo (Bundle)". The sidebar children are "Danh mục sản phẩm" / "Bảng giá đa kênh" / "Sản phẩm Combo".
- KPI cards: "Tổng sản phẩm danh mục", "Đã đồng bộ Sàn TMĐT", "Bảng giá Đa kênh", "Gói sản phẩm Combo".
- **Catalog tab** (real API):
  - Header "Thêm mới" opens the create form. Button "Quản lý danh mục & thương hiệu" opens the catalog management dialog.
  - Search placeholder "Tìm tên sản phẩm, mã SKU...". Filter selects: `aria-label` "Lọc theo loại sản phẩm" (Tất cả / SP đơn lẻ / Gói Combo) and "Lọc theo trạng thái sản phẩm" (Tất cả / Đang bán / Lưu nháp / Ngừng kinh doanh / Đã lưu trữ).
  - Row icon buttons carry `aria-label` and `title`: `Xem biến thể của {name}` (title "Xem biến thể"), `Chỉnh sửa {name}` (title "Chỉnh sửa sản phẩm"), `Xóa {name}` (title "Xóa sản phẩm").
  - Delete uses `window.confirm("Xóa sản phẩm {name}? Các biến thể liên quan cũng sẽ được lưu trữ.")`.
  - Empty state title "Không tìm thấy sản phẩm".
  - **Create product dialog** (h2 "Thêm sản phẩm", id `create-product-title`; close button `aria-label="Đóng"`):
    - Fields:
      - "Tên sản phẩm *"
      - "Danh mục" (select, first option "Không…")
      - "Thương hiệu" (select)
      - "Đơn vị cơ bản"
      - "Trạng thái" (select: ACTIVE "Đang…")
      - "Mô tả"
      - Image uploader (see below)
    - Buttons: "Hủy" and the submit button.
    - Validation:
      - empty name gives "Vui lòng nhập tên sản phẩm."
      - uploading in progress gives "Vui lòng chờ tải ảnh hoàn tất."
    - Fallback error "Không thể tạo sản phẩm." and the page-level "Không thể tạo sản phẩm. Vui lòng kiểm tra quyền và dữ liệu nhập."
  - **Image uploader**: "Ảnh sản phẩm", hint "PNG hoặc JPEG, tối đa 5 MB mỗi ảnh. Ảnh đầu tiên là ảnh bìa." It has a file input.
    - Errors: "Mỗi sản phẩm có tối đa {MAX_IMAGES} ảnh.", "Chỉ hỗ trợ ảnh PNG hoặc JPEG.", "Mỗi ảnh phải có dung lượng từ 1 byte đến 5 MB.", "Không thể tải ảnh lên."
    - Per-image controls: `aria-label` "Di chuyển ảnh sang trái", "Di chuyển ảnh sang phải", "Xóa ảnh". The first image has the badge "Ảnh bìa".
    - API: `POST /catalog/api/v1/uploads/images`, then a `PUT` to the returned `uploadUrl` (external storage), then `POST /catalog/api/v1/uploads/{imageId}/complete`.
  - **Edit product dialog**: h2 "Sửa sản phẩm", same fields as create. Subtitle "Chỉ cập nhật thông tin product, không thay đổi biến thể." Save runs `PATCH /products/{id}` (plus status). Errors: "Vui lòng nhập tên sản phẩm.", "Không xác định được sản phẩm cần cập nhật.", "Một ảnh cũ không có mã upload nên chưa thể thay đổi danh sách ảnh của sản phẩm này."
  - **Variants list dialog** (opened by "Xem biến thể…"): "Thêm biến thể" button; "Đang tải danh sách biến thể..."; "Sản phẩm chưa có biến thể."; badge "Mặc định".
    - Row icon buttons: `aria-label` "Sửa biến thể {sku}" and "Xóa biến thể {sku}" (titles "Sửa biến thể", "Xóa biến thể").
    - Inline edit fields: "Tên biến thể", "SKU", "Mã vạch", "Giá bán (VND)" (number, min 0, step 1, required), "Khối lượng (kg)", "URL ảnh", "Trạng thái". Buttons "Hủy" and a save button. Footer "Đóng".
    - Note: attribute combination cannot be changed after creation.
    - Errors: "Không thể cập nhật biến thể.", "Không thể xóa biến thể.", "Không thể tải danh sách biến thể của sản phẩm."
  - **Create variant dialog** (h2 "Thêm biến thể"):
    - Fields:
      - "SKU *" (required)
      - "Mã vạch"
      - "Tên biến thể" (placeholder is the product name)
      - "Giá bán (VND) *" (number, min 0, step 1)
      - "Khối lượng (kg)" (placeholder "Ví dụ: 0.250")
      - "URL ảnh" (type url)
      - "Thuộc tính biến thể" with the hint "Chọn tối đa một giá trị cho mỗi thuộc tính."
      - Per attribute: a select, "Thêm giá trị" input and a "Thêm" button.
      - New attribute: placeholder "Ví dụ: Màu sắc, Kích cỡ, Thể tích" and a button "Thêm thuộc tính".
      - Empty text "Chưa có thuộc tính nào."
    - Buttons: "Hủy" and "Tạo biến thể" ("Đang lưu...").
    - Validation: "Vui lòng nhập SKU cho biến thể.", "Giá bán phải là số nguyên không âm.", "Không xác định được sản phẩm.", "Không thể tạo thuộc tính.", "Không thể tạo giá trị thuộc tính.", "Không thể tạo biến thể."
    - The page also maps API errors, e.g. "Không thể tạo biến thể. Vui lòng kiểm tra SKU, mã vạch và dữ liệu nhập."
  - **Catalog management dialog** (h2 "Quản lý danh mục & thương hiệu", id `catalog-management-title`; close button `aria-label="Đóng"`):
    - Tab buttons "Danh mục" and "Thương hiệu". Inputs: name, plus "Mô tả thương hiệu" on the brands tab. Button "Thêm danh mục" / "Thêm thương hiệu" ("Đang tạo..."). Empty text "Chưa có dữ liệu."
    - Edit dialogs: "Sửa danh mục" (field "Tên danh mục") and "Sửa thương hiệu" (fields "Tên thương hiệu", "Mô tả thương hiệu"). Buttons "Hủy" and "Lưu thay đổi" ("Đang lưu...").
    - Errors: "Vui lòng nhập tên danh mục." / "Vui lòng nhập tên thương hiệu." / "Vui lòng nhập tên {danh mục|thương hiệu}." / "Không thể tạo dữ liệu." / "Không thể sửa/xóa danh mục|thương hiệu."
  - Page-level error `role="alert"` messages: "Không thể tải dữ liệu sản phẩm.", "Không thể xóa sản phẩm.", "Không xác định được sản phẩm.", "Không thể tải thuộc tính của sản phẩm.", "Không thể gắn thuộc tính vào sản phẩm."
- **Combos tab** (`ProductCombosPanel.tsx`):
  - Button "Tạo gói Combo mới". Search placeholder "Tìm theo tên gói Combo, mã SKU Combo hoặc SKU thành phần...".
  - Dialog `role="dialog"`, `aria-label` "Tạo sản phẩm Combo" or "Cấu hình Combo". h2 "Tạo gói Sản phẩm Combo mới" or "Cấu hình thành phần: {name}", with eyebrow "Thiết kế Gói sản phẩm (Combo Builder)".
  - Fields:
    - name, placeholder "VD: Combo Quà Tặng Xanh Eco"
    - description, placeholder "Ưu điểm nổi bật của bộ sản phẩm..."
    - component search, placeholder "Gõ tên sản phẩm hoặc mã SKU để thêm vào gói..."
    - combo price (VND)
  - Savings text "Khách mua Combo tiết kiệm ngay {x} (-{y}%)" or "Chưa áp dụng mức giảm so với mua lẻ".
  - Buttons: "Hủy bỏ" and "Tạo gói Combo" / "Lưu cấu hình Combo" ("Đang lưu...").
  - Validation: "Vui lòng nhập tên sản phẩm Combo.", "Gói Combo cần ít nhất 1 biến thể SKU thành phần.", "Giá bán Combo phải là số nguyên VND không âm.", fallback "Không thể lưu sản phẩm Combo."
  - API: product create, then `GET/PUT /catalog/api/v1/products/{id}/combo-items`, plus `GET /catalog/api/v1/variants`.
- **Price lists tab** (`PriceListsPanel.tsx`):
  - Button "Tạo bảng giá mới". Search placeholder "Tìm tên bảng giá...". Select `aria-label="Lọc trạng thái bảng giá"` (Tất cả trạng thái / Đang áp dụng / Tạm ngưng).
  - Dialog `aria-label` "Tạo bảng giá mới" or "Chỉnh sửa bảng giá". Fields: "Tên bảng giá *" (placeholder "VD: Bảng giá Sàn Shopee & Lazada (+12%)", maxLength 120), "Hiệu lực từ ngày", "Đến hết ngày", plus channel types. Buttons "Đóng" and "Tạo bảng giá" / "Cập nhật bảng giá".
  - Validation: "Vui lòng nhập tên bảng giá.", "Ngày bắt đầu không được sau ngày kết thúc.", fallback "Không thể lưu bảng giá."
  - Variant-price matrix dialog:
    - Search placeholder "Tìm biến thể hoặc mã SKU...".
    - Bulk adjust select: "Tăng + (%) so với Giá gốc", "Giảm - (%) so với Giá gốc", "Cộng thêm + (VND)", "Trừ bớt - (VND)", then a button "Áp dụng cho {n} SKU đang lọc". Per-row text "Dùng giá gốc".
    - Errors: "Tất cả mức giá nhập phải là số nguyên VND không âm.", "Vui lòng thiết lập giá cho ít nhất 1 biến thể SKU.", "Không thể lưu ma trận giá biến thể."
  - API: `GET/POST /catalog/api/v1/price-lists`, `GET/PATCH /catalog/api/v1/price-lists/{id}`, `PUT /catalog/api/v1/price-lists/{id}/items`.
- **API summary for products**:
  - Reads: `GET /catalog/api/v1/{products,categories,brands,attributes,variants}`, `GET /catalog/api/v1/products/{id}/variants`, `GET /catalog/api/v1/products/{id}/attributes`.
  - Products: `POST /catalog/api/v1/products`, `PATCH /catalog/api/v1/products/{id}`, `PATCH /catalog/api/v1/products/{id}/status`, `DELETE /catalog/api/v1/products/{id}`.
  - Variants: `POST /catalog/api/v1/products/{id}/variants`, `PATCH /catalog/api/v1/variants/{id}`, `PATCH /catalog/api/v1/variants/{id}/status`, `DELETE /catalog/api/v1/variants/{id}`.
  - Attributes: `PUT /catalog/api/v1/products/{id}/attributes`, `POST /catalog/api/v1/attributes`, `POST /catalog/api/v1/attributes/{id}/values`.
  - Categories and brands: `POST /catalog/api/v1/categories`, `PATCH /catalog/api/v1/categories/{id}`, `DELETE /catalog/api/v1/categories/{id}`, and the same three for `/catalog/api/v1/brands`.
  - The "demo only" caveat: the tab badges show a hardcoded 2 in demo mode.

## 5. Inventory (`/inventory?tab=…`, `InventoryPage.tsx`, `InventoryForms.tsx`, `InventoryExtras.tsx`, `InventoryAdvanced.tsx`, `InventoryTables.tsx`)

- Tab ids: stock, balances, receipts, issues, transfers, stocktakes, ledger, movements, thresholds, reconcile, warehouses. Sidebar labels are in the navigation table. The in-page tabs component reads `?tab=` on load. Tab labels in `InventoryTables.tsx` include "Tồn kho", "Tồn theo kho", "Sổ kho", "Biến động kho", "Định mức".
- Toolbar selects: "Chi nhánh" (first option "Chọn chi nhánh" / "Đang tải chi nhánh...") and "Kho" (first option "Chọn kho" / "Đang tải kho..."). Real mode needs a branch selected for stock-level queries.
- Create buttons per tab:
  - receipts: "Tạo phiếu nhập"
  - issues: "Tạo phiếu xuất"
  - transfers: "Tạo phiếu chuyển"
  - stocktakes: "Tạo phiếu kiểm"
  - warehouses: "Thêm kho"
  - They are disabled in demo.
- Stock tab: "Xuất tồn kho" (`GET /inventory/api/v1/stock/export`, disabled without a branch). Stock lookup field has placeholder "Nhập chính xác SKU hoặc quét mã vạch..." and a submit button (the lookup is disabled unless a branch is selected).
- Thresholds tab: buttons "Theo chi nhánh" and a warehouse-level threshold button.
- Reconcile tab: a run button that calls `POST /inventory/api/v1/stocks/reconcile`.
- **Create document modal** (title by mode):
  - "Tạo phiếu nhập kho" (subtitle "Thêm một hoặc nhiều dòng SKU. Có thể lưu nháp hoặc ghi sổ tăng tồn ngay."), "Tạo phiếu xuất kho", "Tạo phiếu chuyển kho", "Tạo phiếu kiểm kho", "Thêm kho mới" (subtitle "Tạo kho chi nhánh, kho trung tâm hoặc kho cách ly hàng lỗi.").
  - Fields:
    - Warehouse: "Kho *" or, for transfers, "Kho xuất *"; transfers also have "Kho nhận *"; first options "Chọn kho" / "Chọn kho nhận".
    - Issue reason: "Lý do xuất" with options Xuất thủ công, Hàng hỏng, Tiêu hủy, Hàng mẫu, Trả nhà cung cấp.
    - Line items: button "Thêm dòng SKU"; per row "Sản phẩm #{n} *" (select, first option "Chọn sản phẩm"), "Số lượng *", "Giá vốn / ĐV (₫)" (placeholder "Tùy chọn", receipts only).
    - Note: "Ghi chú chứng từ" (placeholder "Nhập số hóa đơn gốc, người giao nhận hoặc ghi chú nội bộ...").
    - Stocktake: "Chọn kiểm toàn kho ({n} đã chọn)".
    - New warehouse: "Mã kho *" (placeholder "WH-HCM-01", uppercased), "Tên kho" (placeholder "Kho chi nhánh HCM"), kind select (Kho chi nhánh / Kho trung tâm / Kho cách ly), "Chọn chi nhánh" select, plus default-warehouse and address fields.
  - Buttons: "Hủy" and "Tạo phiếu" / "Tạo & Ghi sổ ngay" (receipts) / "Tạo kho".
  - Validation (inline error): "Vui lòng nhập mã, tên kho và chi nhánh.", "Vui lòng chọn kho thao tác.", "Vui lòng chọn kho nhận.", "Vui lòng chọn sản phẩm và nhập số lượng dương cho tất cả các dòng.", "Giá vốn phải là số nguyên không âm (VND)."
  - Close button `aria-label="Đóng"`.
- **Document row actions by status** (`InventoryTables.tsx`):
  - receipt DRAFT: "Gửi duyệt", "Ghi sổ ngay"
  - receipt PENDING_APPROVAL: "Duyệt", "Trả lại"
  - issue DRAFT: "Ghi sổ", "Hủy"
  - transfer DRAFT: "Xuất chuyển", "Hủy"
  - transfer DISPATCHED / PARTIALLY_RECEIVED: "Nhận hàng", "Hủy"
  - stocktake DRAFT: "Nhập số đếm", "Hủy"
  - stocktake COUNTING: "Sửa số đếm", "Duyệt", plus cancel
  - Warehouse table headers: Mã kho, Tên kho, Loại, Địa chỉ, Mặc định, Trạng thái; each row has an edit button.
- Detail modal title "Chi tiết phiếu {code}". Update warehouse modal "Cập nhật kho {code}". Branch-threshold modal "Định mức tồn theo chi nhánh". Other modals: "Chi tiết tồn kho theo SKU", "Thiết lập định mức tồn", "Nhận chuyển kho {code}" (partial receive).
- Errors: "Không thể tải đầy đủ dữ liệu từ KrakenD." (load failure), "Không thể thực hiện thao tác." / "Không thể thực hiện thao tác. Hãy kiểm tra quyền tài khoản và trạng thái phiếu." (action failure; the API `message` or `errorCode` is shown when present). Loading is `role="status" aria-label="Đang tải"`.
- API (`src/api/inventory/stock.ts`, base `/inventory/api/v1`):
  - Lists and reads:
    - `GET /stock-levels`
    - `GET /stock/summary`
    - `GET /warehouses`
    - `GET /stocks`
    - `GET /stocks/{skuId}`
    - `GET /stock-movements`
    - `GET /stock-thresholds`
    - `GET /stock/lookup`
    - ledger entries
  - Receipts:
    - `GET/POST /stock-receipts`
    - `POST /stock-receipts/{id}/{submit|approve|reject|post|cancel}`
  - Issues:
    - `GET/POST /stock-issues`
    - `POST /stock-issues/{id}/{post|cancel}`
  - Transfers:
    - `GET/POST /stock-transfers`
    - `POST /stock-transfers/{id}/{dispatch|receive|cancel}`
  - Stocktakes:
    - `GET/POST /stocktakes`
    - `POST /stocktakes/{id}/counts`
    - `POST /stocktakes/{id}/{approve|cancel}`
  - Warehouses and thresholds:
    - `POST/PATCH /warehouses`
    - `PUT /stock-thresholds`
  - Also uses `GET /branches` (platform).
  - Creating a receipt, issue or transfer sends an idempotency header.

## 6. Suppliers + purchase orders (`/suppliers`, `SuppliersPage.tsx`)

- Header buttons: "Xuất đơn mua" (`GET /inventory/api/v1/purchase-orders/export`), "+ Nhà cung cấp", "Tạo đơn mua". Local tabs (buttons, not routed): "Đơn mua hàng" and "Nhà cung cấp".
- Search placeholder: "Mã đơn mua, tên NCC..." (PO tab) or "Tên hoặc mã NCC..." (supplier tab). PO status filter options: Tất cả trạng thái, Nháp, Đã duyệt (Chờ nhận), Nhận một phần, Đã nhận đủ, Đã hủy.
- KPI label "Giá trị phải trả".
- Supplier table headers: Nhà cung cấp, Liên hệ, Địa chỉ, Trạng thái. Row buttons: "Sửa", "Ngừng" / "Kích hoạt", "Xóa".
- PO table headers: Mã đơn, Nhà cung cấp, Kho nhận, Dự kiến, Giá trị, Trạng thái. Row buttons: "Duyệt", "Nhận hàng", "Hủy".
- **Supplier form** (title "Thêm nhà cung cấp" or "Cập nhật nhà cung cấp"):
  - Fields: "Mã NCC *" (required, disabled when editing), "Tên NCC *" (required), "Điện thoại", "Email", "Địa chỉ", "Mã số thuế".
  - Submit "Lưu nhà cung cấp".
- **PO form** (title "Tạo đơn mua hàng (PO)"):
  - Fields:
    - "Nhà cung cấp *" (first option "Chọn NCC")
    - "Kho nhận *" (first option "Chọn kho")
    - "Ngày giao dự kiến"
    - "Ghi chú đơn mua" (placeholder "Điều khoản giao hàng, chiết khấu...")
    - Line items: button "Thêm dòng sản phẩm"; each row has a product select (first option "Chọn sản phẩm"), quantity and unit price.
  - Validation: "Vui lòng chọn sản phẩm, số lượng (>0) và đơn giá hợp lệ cho mọi dòng." plus the API error.
- **Receive modal** (title "Nhận hàng từ đơn mua {code}"):
  - Per-line received quantity; note placeholder "Số phiếu giao hàng của NCC, tình trạng kiện hàng...".
  - Submit "Xác nhận nhận hàng & Nhập kho" ("Đang nhập kho..."); "Hủy".
  - Validation: "Vui lòng nhập số lượng thực nhận lớn hơn 0 cho ít nhất 1 mặt hàng."
  - Partial receipt moves the order to "Nhận một phần".
- Detail modal titled "Chi tiết nhà cung cấp" or "Chi tiết đơn mua", with rows "Tên:", "Điện thoại:", "Email:", "Địa chỉ:", "Trạng thái:", "Tổng tiền:", "Ngày tạo:". The detail table headers include "Sản phẩm" and "Đã nhận" / "Còn lại" / "Đơn giá".
- API (base `/inventory/api/v1`):
  - Suppliers: `GET/POST /suppliers`, `GET /suppliers/directory`, `GET/PATCH/DELETE /suppliers/{id}`.
  - Purchase orders: `GET/POST /purchase-orders`, `GET /purchase-orders/directory`, `GET /purchase-orders/summary`, `GET /purchase-orders/export`, `GET /purchase-orders/{id}`.
  - PO actions: `POST /purchase-orders/{id}/{approve|receive|cancel}`.
- Demo banner "Trải nghiệm Demo": with demo data the export button is disabled.

## 7. Customers (`/customers`, `CustomersPage.tsx`, `CustomerGroupsPanel.tsx`, `CustomerLoyaltyPanel.tsx`, `CustomerDetailsDrawer.tsx`)

- Header: h1 "Khách hàng & Tích điểm", subtitle "Đồng bộ hồ sơ 360°, phân nhóm chiết khấu...". Buttons "Làm mới" (real mode: reload) and "Thêm khách hàng". Status text switches between "Chế độ Demo tương tác" and "Đang dùng bộ nhớ đệm" (real).
- Tabs (the tab control reads `?tab=`; the sidebar children are "Danh sách khách hàng" / "Nhóm khách hàng" / "Hạng thành viên & Điểm"): the in-page tab labels are "Danh sách khách hàng", "Nhóm khách hàng", "Hạng thành viên & Tích điểm".
- KPI label "Tổng dư nợ phải thu".
- List tab:
  - Search placeholder "Tìm tên, mã KH, thẻ thành viên, SĐT, email...". Select `aria-label="Lọc theo nhóm khách hàng"` (Mọi nhóm khách hàng / Chưa phân nhóm / each group).
  - Source chips: "Tất cả (n)", "Tại cửa hàng", "Lazada (n)", "Shopee", "Website".
  - Table headers: "Khách hàng", "Liên hệ", "Điểm thưởng", "Dư nợ hiện tại".
  - Row buttons: `Chỉnh sửa {name}` (title "Chỉnh sửa"), `Xóa {name}` (title "Xóa").
  - Delete uses `window.confirm("Xóa khách hàng {name}?")`. Empty state title "Không tìm thấy khách hàng".
  - Clicking a row opens the details drawer (`CustomerDetailsDrawer`).
- **Create/edit dialog** (h2 "Thêm khách hàng mới" / "Chỉnh sửa hồ sơ khách hàng", subtitle "Số điện thoại là định danh xuyên suốt POS, Website & Sàn TMĐT."):
  - Fields:
    - "Họ và tên *"
    - "Số điện thoại *"
    - email (type email)
    - "Ngày sinh" (date)
    - "Nguồn khách hàng" (Tại cửa hàng (POS) / Lazada / Shopee / Website / TikTok Shop)
    - "Nhóm khách hàng" (first option "-- Chưa phân nhóm --")
    - "Địa chỉ mặc định" (placeholder "Số nhà, đường, quận/huyện, tỉnh/thành...")
    - "Hạn mức công nợ tối đa (VNĐ)" (number)
    - "Ghi chú chăm sóc khách hàng"
  - Buttons: "Hủy" and "Lưu khách hàng" / "Lưu thay đổi"; close `aria-label="Đóng"`.
  - Validation: "Vui lòng nhập tên và số điện thoại hợp lệ (8-15 chữ số)." Duplicate phone gives "Số điện thoại đã tồn tại trong danh sách khách hàng."
  - Toasts: "Đã tạo khách hàng mới", "Đã lưu thay đổi khách hàng", "Đã cập nhật hồ sơ khách hàng", "Đã xóa hồ sơ {name}".
- **Groups tab**:
  - Search placeholder "Tìm mã nhóm, tên nhóm (VIP, Đại lý, B2B)...". Create button "Tạo nhóm khách hàng". Headers: Mã nhóm, Tên nhóm & Mô tả, Chiết khấu mặc định, Số khách hàng, Trạng thái, Thao tác. Row buttons titles "Chỉnh sửa nhóm" and "Xóa nhóm".
  - Form placeholders: code "VD: VIP-GOLD, B2B-NORTH", name "VD: Khách VIP OmniClub, Đại lý Miền Bắc...", description "Mô tả tiêu chí xếp nhóm hoặc ưu đãi đi kèm...".
  - Validation: "Vui lòng nhập tên nhóm khách hàng.", "Tỷ lệ chiết khấu mặc định phải từ 0% đến 100%."
  - Delete confirm: `Xóa vĩnh viễn nhóm khách hàng "{name}"?` Warnings "Vui lòng kiểm tra khách hàng đang thuộc nhóm này." and "Vui lòng chuyển khách hàng sang nhóm khác trước khi xóa."
- **Loyalty tab** (`CustomerLoyaltyPanel.tsx`):
  - Button "Thêm hạng thành viên"; edit icon title "Chỉnh sửa hạng"; save button "Lưu chính sách tích điểm".
  - Tier form placeholders: "VD: GOLD, PLATINUM", "VD: Hạng Bạch Kim", "Để trống nếu không giới hạn", "Để trống = điểm không hết hạn", "Mô tả ngắn hiển thị trên thẻ thành viên...". Preview text "Tạm tính đơn hàng".
  - Validation: "Vui lòng nhập tên hạng thành viên." and "Vui lòng kiểm tra lại giá trị quy đổi hợp lệ."
- **Details drawer** (title is the customer name, subtitle "Mã KH: {code} · Tiếp nhận từ kênh {source}"):
  - Select "Nhóm khách hàng" (first option "-- Chưa phân nhóm --").
  - Stats: "Tổng chi tiêu ghi nhận", "Điểm thưởng khả dụng", "Dư nợ phải thu hiện tại".
  - Tabs: "Lịch sử đơn hàng", "Điểm thưởng", "Dư nợ & Công nợ", "Sổ địa chỉ".
  - Orders tab: icon `aria-label="Xem chi tiết mặt hàng"`; item table headers "SKU / Sản phẩm", "Đơn giá", "Thành tiền".
  - Points tab: select "+ Cộng điểm" / "- Trừ điểm"; reason placeholder "VD: Bù điểm sự cố đơn hàng, Quà tri ân..."; button "Xác nhận điều chỉnh điểm" ("Đang ghi sổ..."). Ledger labels: Tích điểm, Đổi điểm, Điều chỉnh, Hết hạn, Hoàn điểm. Validation: "Vui lòng nhập số điểm lớn hơn 0", "Vui lòng kiểm tra số dư điểm hoặc quyền thao tác."
  - Debt tab:
    - "Hạn mức tín dụng & Dư nợ phải thu (AR)", "Thu nợ nhanh (Tự động cấn trừ FIFO vào chứng từ phải thu)".
    - Amount placeholder "VD: 1450000"; button "Điền tất toán ({amount})"; method select (Chuyển khoản NH / Tiền mặt tại quầy / Quẹt thẻ POS / Ví điện tử); note placeholder "VD: UNC Vietcombank đợt 2...".
    - "Chứng từ phải thu khách hàng ({n})"; empty text "Không có khoản phải thu nào đang mở."
    - Validation: "Số tiền thu nợ phải lớn hơn 0đ" and "Kiểm tra chi nhánh thu quỹ hoặc khoản phải thu đang mở."
  - Addresses tab: button "Thêm địa chỉ", placeholder "VD: 18 Lý Thường Kiệt", button "Lưu địa chỉ" ("Đang lưu..."), icon titles "Sửa địa chỉ" and "Xóa địa chỉ". Delete confirm "Xóa địa chỉ giao hàng này khỏi sổ địa chỉ?" Validation: "Vui lòng nhập địa chỉ chi tiết".
- API:
  - Customers: `GET /customer/api/v1/customers?page=1&limit=100`, `GET /customer/api/v1/customers/summary`, `GET /customer/api/v1/customers/{id}`, `POST /customer/api/v1/customers`, `PATCH /customer/api/v1/customers/{id}`, `DELETE /customer/api/v1/customers/{id}`, `GET /customer/api/v1/customers/{id}/summary`.
  - Addresses: `/customer/api/v1/customers/{id}/addresses[/{addrId}[/set-default]]`.
  - Groups: `/customer/api/v1/customer-groups[/{id}]`, `POST /customer/api/v1/customers/{id}/assign-group`.
  - Loyalty and tiers: `/customer/api/v1/membership-tiers[/{id}]`, `/customer/api/v1/loyalty-settings`, `/customer/api/v1/loyalty/reconcile`, `/customer/api/v1/customers/{id}/{loyalty|loyalty-adjustments|membership}`.
  - Health: `GET /customer/health`.
  - Debt: `GET /finance/api/v1/finance/customers/{id}/debt` and `POST .../debt/payments`.
- **Dead code**: `CustomerAdvanced.tsx` (dialogs "Quản lý nhóm và thẻ", "Nhập khách hàng từ CSV", "Phát hiện và gộp hồ sơ trùng", and a details dialog) is not imported by any page, so these flows are unreachable from the UI. Related endpoints are `/customers/import`, `/customers/export`, `/customers/merge`, `/customer-tags`.

## 8. Orders (`/orders`, `OrdersPage.tsx`, `OrderTable.tsx`)

- h1 "Đơn hàng". KPI labels: "Tổng đơn hàng hôm nay", "Đang đóng gói & Giao vận", "Đã hoàn tất", and "Đơn hàng Sàn TMĐT (Lazada/Shopee)" (demo) or "Đơn sàn cần xử lý SKU/Tồn" (real).
- Banner "Có {n} đơn hàng từ sàn TMĐT (Lazada) đang chờ liên kết mã hàng hóa (SKU)…" with link "Mở Xử lý xung đột kênh bán →".
- List:
  - Channel tabs (buttons): "Tất cả (n)", "Lazada (n)", "Shopee (n)", "Tại cửa hàng (n)", "Website (n)".
  - Search placeholder "Tìm số đơn, mã sàn, tên KH, SKU...".
  - Status select `aria-label="Lọc trạng thái đơn hàng"` with options "Tất cả trạng thái", "Chờ xử lý / Đóng gói", "Đã giao thành công", "Chờ thanh toán", "Đã hủy".
  - Channel select `aria-label="Lọc kênh bán hàng"` ("Tất cả kênh bán" plus channels).
  - Sort options: "Thời hạn hoàn thành ngắn nhất", "Thời gian tạo mới nhất", "Tổng giá trị đơn cao nhất".
  - Column headers: "Sản phẩm", "Tổng cộng", "Giao hàng", "Trạng thái", "Thao tác".
  - Row checkbox `aria-label="Chọn đơn hàng {id}"`. Copy button title "Sao chép số đơn hàng" (then "Đã chép").
  - Bulk/toolbar buttons: "Đóng gói & In", "In danh sách chọn", "Xuất khẩu CSV" (client-side CSV from `handleExportOrdersCsv`, not the API export), "Lọc theo".
  - Footer text "Hiển thị 1 - {n} trên tổng {m} đơn hàng".
- Row action menu ("Thêm lựa chọn") items and their API effect, with status gating:
  - "Xem chi tiết đơn hàng" gives `GET /sales/api/v1/orders/{id}`.
  - "Xác nhận & Giữ tồn" gives `POST .../confirm {version}`.
  - "Đóng gói & In AWB" gives `.../pack` then `.../ship`.
  - "Xác nhận Đã giao hàng" gives `.../complete`.
  - "Đổi trả hàng & Hoàn tiền" gives `POST .../returns`.
  - "Hủy đơn & Hoàn giữ tồn" gives `POST .../cancel`.
- **Cancel** uses `window.prompt("Nhập lý do hủy đơn hàng {code}:", "Khách yêu cầu hủy đơn")`. Playwright must handle it with `page.once('dialog', d => d.accept('reason'))`.
- Packing dialog: `role="dialog"`, h2 "Đóng gói & In Phiếu Gửi Hàng (AWB)". Carrier select options: "LEX VN (Lazada Express)", "Giao Hàng Nhanh (GHN)", "SPX Express", "ViettelPost", "J&T Express". Field "Mã vận đơn (Tracking Number)". Buttons "Đóng" and "Xác nhận Đóng gói & In phiếu".
- Return dialog: h2 "Đổi trả hàng & Hoàn tiền ({channel})", "SL trả:", "Phương thức hoàn tiền" (Chuyển khoản ngân hàng / Tiền mặt tại quầy / Ví điện tử / Ví sàn TMĐT / Hoàn thẻ POS), "Lý do trả hàng", checkbox "Nhập lại hàng trả vào tồn kho khả dụng (Restock vào kho chi nhánh)", "Tổng tiền hoàn trả cho khách:". Buttons "Hủy" and "Xác nhận Trả hàng & Hoàn tiền" ("Đang xử lý..."). Validation: "Vui lòng chọn ít nhất 1 sản phẩm có số lượng trả > 0."
- Detail dialog: h2 "Chi tiết đơn hàng đa kênh ({channel})", with "Số đơn hàng:", "Mã đơn nội bộ:", "Khách hàng", "Đơn vị vận chuyển", "Trạng thái", "Thanh toán", "Tổng cộng", "Thời gian tạo". Buttons "Đóng gói & In AWB", "Đã giao thành công", "Đổi trả / Hoàn tiền", "Đóng".
- Loading / error: `role="status" aria-label="Đang tải"`.
- API: `GET /sales/api/v1/orders?page=1&limit=100`, `GET /sales/api/v1/orders/summary`, `GET /sales/api/v1/orders/{id}`, plus the action endpoints above. `GET /sales/api/v1/orders/export` and `POST /sales/api/v1/orders` exist in `src/api/sales/orders.ts` but have **no UI**. **There is no "create order" screen in Orders.** Orders are created through POS checkout or marketplace sync.

## 9. POS (`/pos`, `PosPage.tsx`)

- h1 "Bán tại quầy", eyebrow "POS Thu Ngân Tại Quầy", subtitle "Tạo đơn bán trực tiếp, lưu tạm đa đơn hàng, áp mã giảm giá và in phiếu K80." Branch select "Chi nhánh:" (loads `GET /branches`; shows "Đang tải..."; auto-selects the first). Demo shows a fixed branch.
- Shift status button (opens the shift modal):
  - Text is `Ca: {registerCode} (Đang mở)`, `Ca {code} đang mở: bán vào ca này` or "Chưa có ca: mở ca để bán".
  - The shift data comes from `GET /sales/api/v1/pos/shifts/active` and `GET /sales/api/v1/pos/shifts/available?branchId`.
- Tabs of draft orders: "Đơn #1…", close `aria-label="Đóng {label}"`, button "Thêm đơn", "Tìm SP", note "Tối đa 5 đơn lưu tạm" (limit error "Tối đa 5 hóa đơn lưu tạm cùng lúc trên một quầy.").
- Product search placeholder: "Tìm tên sản phẩm, mã SKU hoặc quét mã vạch (F2 để tìm, Enter thêm nhanh)...". Hotkeys F2 (find) and F9 (pay). Product grid status "Đang tải sản phẩm..." (`role=status aria-label="Đang tải sản phẩm"`) and "{n}/{m} SKU còn hàng". Stock error "Sản phẩm đã hết tồn khả dụng tại chi nhánh này."
- Cart line remove button `aria-label="Xóa {item.name}"`.
- Customer field placeholder "Khách lẻ (Bỏ trống nếu khách vãng lai)" (datalist of `GET /customer/api/v1/customers`).
- Discount: input placeholder "VD: 10%" or "Số tiền ₫", label "Chiết khấu / Mã giảm", coupon label "Mã giảm giá", coupon placeholder "SALE10, VIP50K...". The client coupon presets are SALE10, VIP50K, OMNI20K (this is client-side; real coupons are validated by the server).
- Payment method buttons: "Tiền mặt", "Chuyển khoản QR", "Quẹt thẻ POS", "Ship COD". Cash tender quick buttons "Đưa đủ", "100k", "200k", "500k", "1 triệu". Texts "Tiền thừa trả khách:" and "Khách phải trả".
- Checkout button: `Thanh toán và tạo đơn ({amount})` ("Đang xử lý đơn hàng...").
- **Checkout validation**:
  - "Vui lòng chọn chi nhánh."
  - "Vui lòng thêm ít nhất một sản phẩm vào giỏ hàng."
  - No open shift opens the shift modal and shows "Chưa có ca thu ngân đang mở ở chi nhánh này. Hãy mở ca trước khi bán."
  - "Không xác định được biến thể của {sku}. Hãy tải lại trang để lấy danh mục mới."
- Server error map (`src/api/sales/orders.ts`), keyed by `errorCode`:
  - SHIFT_REQUIRED: "Chưa có ca thu ngân đang mở ở chi nhánh này. Hãy mở ca trước khi bán."
  - SHIFT_NOT_OPEN: "Bạn chưa có ca thu ngân đang mở."
  - SHIFT_NOT_FOUND: "Ca thu ngân không còn tồn tại hoặc đã đóng. Hãy chọn lại ca."
  - SHIFT_ALREADY_OPEN: "Quầy này đã có ca đang mở. Hãy bán vào ca đó hoặc kết ca trước."
  - INSUFFICIENT_STOCK: "Không đủ tồn khả dụng ở kho bán hàng của chi nhánh."
  - COUPON_INVALID: "Mã giảm giá không hợp lệ hoặc đã hết hiệu lực."
  - VARIANCE_REASON_REQUIRED: "Chênh lệch kiểm quỹ vượt dung sai: hãy chọn lý do chênh lệch."
  - Otherwise the response `message`, else the page fallback.
- Receipt dialog (`role=dialog`, "OMNIRETAIL STORE", "TỔNG THANH TOÁN:", "Tạm tính:", "Tiền thừa trả khách:") with buttons "Đóng" and "In hóa đơn (K80)" (browser print).
- **Shift modal** (`role=dialog`):
  - Open mode: h2 "Mở ca thu ngân POS". Fields: "Mã máy thu ngân (Register)" and "Tiền mặt đầu ca (VND) *" (number), plus a note (placeholder "Ghi chú bàn giao ca..."). Submit "Mở ca bán hàng" ("Đang xử lý...").
  - Close mode: h2 "Kết ca & Bàn giao quỹ tiền mặt". Fields "Tiền mặt thực đếm cuối ca (VND) *", info rows "Quầy / Giờ mở:" and "Tiền kỳ vọng trong két:", variance "Chênh lệch kiểm quỹ:", and a reason select ("(chỉ bắt buộc khi vượt dung sai)", "Thối nhầm tiền", "Bán hàng chưa ghi nhận", "Hoàn tiền chưa ghi nhận", "Nghi mất tiền", "Khác"). Submit "Xác nhận kết ca".
  - If the variance exceeds tolerance the shift becomes PENDING_APPROVAL and the notice reads "Đã gửi kết ca. Chênh lệch vượt dung sai nên ca chờ quản lý (quyền duyệt kết ca) xác nhận."
  - Footer button "Đóng". Error is `role="alert"`, notice is `role="status"`.
- API:
  - `GET /branches`
  - `GET /catalog/api/v1/variants`
  - `GET /inventory/api/v1/stock-levels`
  - `GET /customer/api/v1/customers`
  - `GET /sales/api/v1/pos/shifts/active`
  - `GET /sales/api/v1/pos/shifts/available`
  - `POST /sales/api/v1/pos/shifts/open {branchId, registerCode (default REG-01), openingCash, note}`
  - `POST /sales/api/v1/pos/shifts/{id}/close {actualCash, version, reason?, note?}`
  - `POST /sales/api/v1/pos/checkout {branchId, shiftId, customerName?, lines[{variantId,qty}], orderDiscountType?, orderDiscountValue?, couponCode?, paymentMethod: CASH|CARD|BANK_TRANSFER|COD, tenderedCash?, note?}`
- Demo: opening/closing a shift and checkout are local only, with the success text "Đã tạo đơn bán tại quầy {code} thành công."

## 10. Promotions (`/promotions`, `PromotionsPage.tsx`)

- h1 "Khuyến mãi & Mã giảm giá" (eyebrow "Phân hệ Khuyến mãi & Coupon Đa kênh"). Header buttons "Làm mới", "Phát hành Coupon" (disabled when there are no promotions), "Tạo chương trình KM".
- Tabs: "Chương trình khuyến mãi", "Kho Mã giảm giá (Coupon)", "Kiểm thử áp mã trực tiếp". The sidebar children are "Chương trình KM" / "Mã giảm giá (Coupon)" / "Kiểm thử áp mã". Uses `?tab=programs|coupons|simulator`.
- Programs list filters: placeholder "Tìm theo mã chiến dịch, tên chương trình...". `aria-label` selects: "Lọc loại chiết khấu" (Mọi loại giảm / Theo phần trăm (%) / Số tiền cố định (₫)), "Lọc theo kênh bán" (Mọi kênh bán), "Lọc theo chi nhánh" (Tất cả chi nhánh), "Lọc trạng thái hiệu lực" (Mọi trạng thái / Đang áp dụng / Sắp diễn ra / Đã kết thúc / Tạm ngưng).
- Status labels: Tạm ngưng, Sắp diễn ra, Đã kết thúc, Đang áp dụng. Channels: POS Tại quầy, Lazada, Shopee, TikTok Shop, Website.
- **Program dialog** (`role=dialog`, `aria-label` "Tạo chương trình khuyến mãi" or "Chỉnh sửa khuyến mãi"):
  - Fields:
    - "Mã chương trình *" (a button titled "Sinh mã tự động")
    - "Tên chiến dịch khuyến mãi *" (placeholder "VD: Ưu đãi Hè Đa Kênh - Giảm 15%")
    - "Mô tả / Ghi chú nội bộ" (placeholder "Điều kiện truyền thông hoặc hướng dẫn cho thu ngân...")
    - "Hình thức giảm giá *" (Theo phần trăm (%) / Số tiền cố định (VND))
    - "Mức giảm (%) *" or "Số tiền giảm (VND) *"
    - "Giá trị đơn hàng tối thiểu (VND)"
    - "Trần giảm tối đa (VND, cho loại %)"
    - "Chi nhánh áp dụng" (first option "Toàn bộ chi nhánh cửa hàng")
    - "Từ ngày", "Đến ngày"
    - "Kênh bán hàng được áp dụng" (chip toggles, "Đang chọn: Mọi kênh bán")
    - "Nhóm khách hàng đủ điều kiện" ("Đang chọn: Mọi khách hàng")
  - Buttons: "Hủy bỏ" and "Tạo chương trình" / "Lưu thay đổi" ("Đang lưu...").
  - Validation (`role=alert`):
    - "Vui lòng nhập tên chương trình khuyến mãi."
    - "Giá trị chiết khấu phải lớn hơn 0."
    - "Phần trăm chiết khấu không được vượt quá 100%."
    - "Số tiền giảm VND phải là số nguyên."
    - "Ngày bắt đầu không được lớn hơn ngày kết thúc."
- **Coupon dialog** (`aria-label` "Phát hành mã Coupon" or "Cập nhật hạn mức Coupon"; h2 "Quản lý Voucher & Hạn mức" / "Phát hành mã giảm giá (Coupon)"):
  - Fields:
    - "Thuộc chương trình khuyến mãi *"
    - "Mã Coupon khách nhập khi thanh toán *" (placeholder "VD: HE2026", with a "Sinh mã" button)
    - "Tổng số lượt dùng tối đa" (placeholder "Trống = Không giới hạn")
    - "Giới hạn lượt / 1 Khách hàng" (same placeholder)
  - Buttons: "Đóng" and "Phát hành mã ngay" / "Cập nhật hạn mức".
  - Validation:
    - "Vui lòng chọn chương trình khuyến mãi gốc."
    - "Vui lòng nhập mã Coupon."
    - "Tổng lượt dùng tối đa phải là số nguyên dương."
    - "Giới hạn mỗi khách hàng phải là số nguyên dương."
- Coupon list filters: placeholder "Tìm mã giảm giá (VD: HE2026, VIP100K)...". `aria-label` selects: "Lọc theo chương trình gốc" (Tất cả chương trình KM) and "Lọc theo tình trạng lượt dùng" (Mọi tình trạng lượt dùng / Còn lượt sử dụng / Sắp chạm trần (≥80%) / Đã hết lượt (100%) / Đang bị khóa). Headers include "Mã Coupon" and "Trạng thái".
- **Simulator tab**:
  - Fields: "Mã Coupon cần kiểm tra *", "Giá trị giỏ hàng (VND) *", sample chips ("Mức giỏ hàng mẫu:"), "Chi nhánh bán hàng *", "Kênh phát sinh đơn", "Nhóm khách hàng (tuỳ chọn)" (first option "Khách lẻ vãng lai (Chưa phân nhóm)").
  - Button "Kiểm tra áp dụng mã" ("Đang kiểm tra...").
  - Result panel: "Hóa đơn mô phỏng thanh toán", "Tạm tính giỏ hàng", "Khách cần thanh toán". Rejection card `role=alert` titled "Từ chối áp dụng mã giảm giá".
  - Validation:
    - "Vui lòng nhập mã giảm giá cần kiểm tra."
    - "Giá trị đơn hàng phải là số nguyên không âm (VND)."
    - "Vui lòng chọn chi nhánh áp dụng để kiểm thử."
    - Demo-only rejections: "Mã giảm giá {code} không tồn tại hoặc đang bị khóa.", "Chương trình khuyến mãi của mã {code} đã tạm ngưng.", "Mã {code} chỉ áp dụng tại {branch}."
- API: `GET/POST /sales/api/v1/promotions`, `PATCH /sales/api/v1/promotions/{id}`, `GET/POST /sales/api/v1/coupons`, `PATCH /sales/api/v1/coupons/{id}`, `POST /sales/api/v1/coupons/evaluate`, `GET /branches`, `GET /customer/api/v1/customer-groups`.
- Permission: gated by `orders.view` (not by a promotions permission).

## 11. Channels (`/channels?tab=…`, `ChannelsPage.tsx`, `LazadaPanels.tsx`, `LazadaIntegrationModals.tsx`, `ChannelAdvancedModals.tsx`)

- Tabs: "Tổng quan & Gian hàng Lazada" (overview), "Ánh xạ SKU Lazada" (sku-mappings), "Lịch sử đồng bộ" (sync-jobs), "Xung đột đồng bộ" (conflicts), "Đối soát đa kênh" (reconciliation). The sidebar labels differ slightly ("Tiến trình đồng bộ", "Đối soát vận hành", "Tổng quan & Lazada").
- Overview, empty state: "Chưa có gian hàng Lazada nào được kết nối." with the button "Bắt đầu kết nối Lazada ngay". Other buttons: "Thêm gian hàng Lazada", "Thêm gian hàng Shopee", "Kết nối gian hàng Lazada", "Gợi ý nối SKU", "Thiết lập kết nối" / "Thêm gian hàng khác".
  - Row icon buttons (title only): "Chỉnh sửa Buffer tồn an toàn, % phân bổ & Tự động đẩy tồn", "Trạng thái kết nối & Cấu hình Webhook", "Ngắt kết nối gian hàng". Pause/resume text "Tạm dừng đồng bộ" / "Tiếp tục đồng bộ".
  - Status labels: Đang kết nối, Chờ cấp quyền trên sàn, Kết nối chập chờn, Hết hạn phiên kết nối, Cần ủy quyền lại, Đang tạm dừng, Đã ngắt kết nối.
  - Dismiss buttons `aria-label` "Đóng thông báo" and "Đóng lỗi".
- **Connect modal**:
  - h2 "Kết nối gian hàng Lazada" or "Kết nối gian hàng Shopee", eyebrow "Liên kết sàn thương mại điện tử".
  - Fields:
    - "Tên gian hàng trên hệ thống" (placeholder "VD: Mộc Store Official Lazada")
    - "Mã gian hàng / Seller ID" (placeholder "VD: VN10928374 hoặc 200192837")
    - branch select
    - "Tồn kho dự phòng giữ lại (Chống bán vượt tồn)"
    - "Tỷ lệ đẩy tồn kho lên sàn (%)"
    - "App Key / Partner ID riêng (Tùy chọn)" (placeholder "Để trống để dùng cấu hình mặc định của hệ thống")
    - "Seller Access Token *" (placeholder "Dán access_token từ Lazada Open Platform")
    - "Seller Refresh Token" (placeholder "Dán refresh_token để tự động gia hạn")
  - Submit "Tiếp tục tới Cấp quyền Gian hàng" (OAuth path) or "Hoàn tất Kết nối Gian hàng" (token path). Close `aria-label="Đóng"`.
  - Validation: "Vui lòng chọn chi nhánh ghi nhận đơn hàng và trừ tồn kho.", "Vui lòng nhập Access Token của nhà bán hàng khi chọn kết nối bằng Token trực tiếp."
  - Success text "Đã khởi tạo kết nối {code}. Vui lòng mở link Ủy quyền Lazada Seller Center."
- **Authorize modal**: placeholder "VD: 0_128491_xYzAbC123456 hoặc https://.../lazada/callback?code=0_128491_xYz&state=...". Validation: "Vui lòng dán mã Ủy quyền (Authorization Code) hoặc đường dẫn Callback URL trả về từ Lazada."
  - The OAuth callback is handled when the URL carries `code` and `state` query params (not in demo).
- SKU mappings: search placeholder "Tìm tên SP, mã Item/SKU Lazada, mã SKU nội bộ...", selects `aria-label` "Lọc gian hàng" and "Lọc trạng thái ánh xạ". Create-mapping form placeholders "VD: 13504402059_VNAMZ-117553898643", "VD: 13504402059", "VD: 117553898643", "VD: TER-500-GRN", "VD: Bình giữ nhiệt Terra 500ml", "VD: 420000". Suggestions checkbox `aria-label="Chọn nối {sku}"`.
- Sync jobs: selects `aria-label` "Lọc gian hàng cho tiến trình", "Lọc loại tiến trình", "Lọc trạng thái tiến trình".
- Conflicts: selects `aria-label` "Lọc gian hàng cho xung đột" and "Lọc trạng thái xung đột"; resolution note placeholder "VD: Đã liên kết đúng biến thể và nhập bổ sung tồn kho".
- Reconciliation: `aria-label` "Chọn gian hàng đối soát" and "Chọn loại đối soát".
- Generic error: "Không thể thực hiện thao tác tích hợp." and "Không thể kết nối tới Integration Service. Vui lòng kiểm tra quyền hạn hoặc cấu hình Lazada."
- API base `/integration/api/v1/integrations`:
  - `GET/POST /connections`
  - `PATCH/DELETE /connections/{id}`
  - `POST /connections/{id}/{authorize|pause|resume|health}`
  - `POST /connections/{id}/sync/{products|orders|inventory}`
  - `GET /sku-mappings`, `PATCH/DELETE /sku-mappings/{id}`
  - `GET /sync-jobs`, `POST /sync-jobs/{id}/retry`
  - `GET /conflicts`, `PATCH /conflicts/{id}`
  - `GET/POST /reconciliation-runs`, `GET /reconciliation-runs/{id}`
  - `/api/v1/integrations/lazada/callback`
  - `GET /integration/health`
- Real Lazada OAuth cannot be E2E'd without an external Lazada app, so mock the integration endpoints for UI-only coverage.

## 12. Reports (`/reports?tab=…`, `ReportsPage.tsx`)

- Real-data, read-only plus a client-side CSV export. h1 eyebrow "Insight BI · Phân tích Kinh doanh Đa kênh". Buttons "Làm mới" (real) and "Xuất CSV tab hiện tại" (client-side CSV download).
- Range chips: "7 ngày qua", "30 ngày qua", "Tháng này". Dates `aria-label` "Từ ngày" and "Đến ngày". Branch select `aria-label="Chọn chi nhánh báo cáo"` (first option "Toàn chuỗi cửa hàng").
- Tabs: "Bán hàng theo Kênh", "Báo cáo theo Sản phẩm (SKU)", "Giá trị Tồn kho & Xuất nhập tồn", "Tài chính & Lợi nhuận gộp" (sidebar children use different wording).
  - Channels: table headers "Kênh bán", "Tỷ trọng".
  - Products: filter placeholder "Lọc mã SKU hoặc tên sản phẩm...". Selects `aria-label`: "Tiêu chí xếp hạng Top SKU" (Xếp theo Doanh thu thuần / Lợi nhuận gộp / Số lượng bán), "Khung ngày đánh giá tồn đọng" (Trong 15/30/60/90 ngày), "Ngưỡng số lượng bán chậm" (Không bán được (0 SP), Bán ≤ 2/5 sản phẩm). Header "SKU / Sản phẩm".
  - Inventory: headers "Kho hàng", "Số SKU", "SL Khả dụng", "Tổng giá trị vốn"; movement filter chips "Tất cả", "Nhập mua", "Xuất bán", "Điều chuyển", "Nhập trả", "Kiểm kê"; headers "Thời gian", "Nghiệp vụ", "Mã SKU".
  - Finance: header "Chi nhánh".
  - Loading is `role="status" aria-label="Đang tải báo cáo"`.
- API (`src/api/insight/reports.ts`, base `/insight/api/v1/insight`):
  - `GET /reports/sales/by-channel`
  - `GET /dashboard/revenue-trend`
  - `GET /reports/sales/by-product`
  - `GET /reports/inventory/slow-moving`
  - `GET /reports/inventory/valuation`
  - `GET /reports/inventory/movements`
  - `GET /reports/gross-profit`
  - Also `GET /branches`.
- Demo shows mock data.

## 13. Staff (`/staff?tab=members|roles|shifts`, `StaffPage.tsx`, `RolesPanel.tsx`, `ShiftsPanel.tsx`)

- Tabs: `div role="tablist" aria-label="Nhân viên và quyền"` with `role="tab"` items "Nhân viên", "Vai trò & phân quyền", "Ca làm việc" (`aria-selected`). Clicking navigates to `/staff?tab=…`.
- **Members**:
  - h1 "Nhân viên & Quyền". Button "Thêm nhân viên" (needs `staff.create`).
  - Summary cards "Tổng thành viên", "Đang hoạt động", "Đang khóa", "Đang làm việc".
  - Search placeholder "Tìm tên, email, mã nhân viên..." and a status select (Tất cả trạng thái / Đang hoạt động / Đang khóa).
  - Row buttons: "Sửa quyền", icon `title` "Khóa nhân viên" / "Mở khóa nhân viên", "Xóa" (`window.confirm("Xóa {name} khỏi cửa hàng?")`). The owner row shows the badge "Chủ cửa hàng" with no actions. Empty text "Không tìm thấy nhân viên."
  - Dialog `role=dialog`: h2 "Thêm nhân viên" or "Sửa quyền nhân viên". Fields: "Email tài khoản" (placeholder "nhanvien@example.com", create only, required), "Vai trò" (select, first option "Chọn vai trò", options `{name} ({n} quyền)`), a fieldset "Phạm vi chi nhánh" with the hint "(bỏ chọn tất cả để áp dụng mọi chi nhánh)" and one checkbox per branch name. Buttons "Hủy" and "Thêm nhân viên" / "Lưu thay đổi" ("Đang lưu...").
  - Errors:
    - "Vui lòng chọn vai trò."
    - "Không thể thêm nhân viên. Tài khoản phải đăng ký trước và bạn cần quyền phù hợp."
    - "Không thể cập nhật vai trò hoặc phạm vi chi nhánh."
    - "Không thể thay đổi trạng thái nhân viên."
    - "Không thể xóa nhân viên. Không thể xóa chủ cửa hàng hoặc tài khoản hiện tại."
    - "Không thể tải danh sách thành viên."
  - Note: if the members query errors, demo members are shown as a fallback.
  - API: `GET/POST /tenants/current/members`, `GET /tenants/current/members/summary`, `PATCH /tenants/current/members/{accountId}`, `POST .../{accountId}/lock`, `POST .../{accountId}/unlock`, `DELETE .../{accountId}`, plus `GET /roles` and `GET /branches`.
- **Roles permission matrix**:
  - h1 "Vai trò & phân quyền", subtitle "Chọn một vai trò, tick các chức năng mà vai trò đó được làm. Chủ cửa hàng luôn có đủ quyền." Button "Thêm vai trò" (needs `staff.update`).
  - Left list: `nav aria-label="Danh sách vai trò"`. A new role shows "Vai trò mới" with "Chưa lưu". Badges "Chủ cửa hàng" / "Mặc định" / "Tùy chỉnh". Empty texts "Chưa có vai trò nào." and "Chưa có danh mục quyền."
  - Editor:
    - h2 is the role name or "Vai trò mới". Select `aria-label="Sao chép quyền từ vai trò"`. Inputs `aria-label="Tên vai trò"` (maxLength 100, placeholder starts "Ví dụ: Thu ngân…") and `aria-label="Mô tả vai trò"` (maxLength 255).
    - Matrix table: columns `th scope=col` "Chức năng" and "Cả hàng", plus one column per action.
    - Action labels: view "Xem", create "Tạo", update "Sửa", delete "Xóa", approve "Duyệt". Rows are `th scope=row` with the module label from `GET /permissions` (not hard-coded).
    - Cell checkbox `aria-label` `{module.label}: {actionLabel}`; non-applicable cells show a span `aria-label="Không áp dụng"` with "—". Column select-all checkbox `aria-label` `Chọn cả cột {actionLabel}`. The row checkbox label is built in `RolesPanel` (the "Cả hàng" column).
    - Read-only view shows the badge "Chỉ xem".
    - Diff bar: "Chưa lưu: thêm {a} quyền, bỏ {b} quyền" (+ " (chỉ đổi tên hoặc mô tả)"). Note "Quyền thay đổi có hiệu lực khi nhân viên đăng nhập lại hoặc làm mới phiên."
    - Buttons "Lưu thay đổi" / "Tạo vai trò" ("Đang lưu..."), "Hoàn tác", "Về mặc định", "Xóa vai trò" (`window.confirm('Xóa vai trò "{name}"? Không thể hoàn tác.')`).
    - Switching roles with unsaved edits triggers `window.confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi và chuyển vai trò?")`.
  - Errors:
    - R001 "Tên vai trò đã tồn tại. Hãy chọn tên khác."
    - R002 "Không thể sửa vai trò Chủ cửa hàng."
    - R003 "Có quyền không tồn tại trong danh mục."
    - R004 "Không thể xóa vai trò mặc định."
    - R005 "Vai trò đang được gán cho nhân viên. Hãy chuyển họ sang vai trò khác trước khi xóa."
    - R006 "Vai trò không còn tồn tại. Hãy tải lại trang."
    - Fallbacks "Không thể lưu vai trò. Vui lòng thử lại.", "Không thể xóa vai trò. Vui lòng thử lại.", "Không thể sao chép quyền từ vai trò đã chọn.", "Không thể tải quyền của vai trò này."
    - Errors are `role="alert"`.
  - API: `GET /roles`, `GET /permissions`, `GET/PATCH/DELETE /roles/{id}`, `POST /roles`.
- **Shifts/schedules**:
  - h1 "Ca làm việc". Selects `aria-label="Chi nhánh"` and `aria-label="Lọc theo phụ trách"` (Tất cả plus the duty options). Weekly grid with caption "Lịch làm việc trong tuần của chi nhánh"; columns start "Nhân viên"; day headers use short labels T2..T7, CN.
  - Cell buttons: `aria-label` "Sửa ca {staffName} {Thứ …} {range} {duty}" and "Thêm ca cho {staffName} {Thứ …}". Empty text "Chưa có nhân viên nào làm ở chi nhánh này." and "Chưa có chi nhánh đang hoạt động."
  - Section `aria-label="Đang trực"` shows "Hiện không có ca nào đang chạy ở chi nhánh này." and loading `role=status aria-label="Đang tải"`.
  - Dialog `role=dialog`, `aria-label` "Thêm ca làm việc" or "Sửa ca làm việc". Fields (all with `aria-label`): "Nhân viên" (select), a fieldset "Các ngày trong tuần" with checkboxes `aria-label` "Thứ hai" … "Chủ nhật", "Giờ bắt đầu" (time, step 300), "Giờ kết thúc" (time), "Phụ trách" (options `{label}: {hint}`: Trưởng ca, Thu ngân, Bán hàng, Kho, Giao hàng, Khác), "Tên ca" (placeholder "Ví dụ: Ca sáng", max 50), "Ghi chú" (max 200).
  - Buttons: "Hủy", "Thêm ca" / "Lưu thay đổi" ("Đang lưu..."), "Xóa ca" (`window.confirm("Xóa ca {range} của {staffName}?")`).
  - Validation: "Chọn nhân viên.", "Chọn ít nhất một ngày trong tuần.", "Nhập giờ bắt đầu và giờ kết thúc.", "Giờ kết thúc phải sau giờ bắt đầu. Ca qua đêm chưa được hỗ trợ: hãy tách thành hai ca."
  - Server error S001: "Nhân viên đã có ca trùng giờ trong ngày này (ở bất kỳ chi nhánh nào). Hãy đổi giờ hoặc xóa ca cũ."
  - Fallbacks "Không thể lưu ca làm việc. Vui lòng thử lại." and "Không thể xóa ca làm việc."
  - The weekly total shows e.g. "7,5 giờ".
  - API: `GET /staff-schedules` (filter), `GET /staff-schedules/on-duty`, `POST /staff-schedules` (creates one entry per weekday), `PATCH /staff-schedules/{id}`, `DELETE /staff-schedules/{id}`.
  - Open POS shifts require the cashier to be scheduled (`GET /sales/api/v1/pos/shifts/available` returns open shifts).

## 14. Settings (`/settings`, `SettingsPage.tsx`, `SubscriptionPlans.tsx`)

- No permission gate beyond login. h1 "Cài đặt cửa hàng", eyebrow "Hệ thống / Cài đặt", subtitle "Quản lý thông tin cửa hàng và các chi nhánh thuộc cửa hàng hiện tại."
- **Store info** ("Thông tin cửa hàng"):
  - Fields: "Tên cửa hàng", "Mã cửa hàng" (read-only, hint "Mã cửa hàng không thể thay đổi."), "Số điện thoại" (pattern `\+?[0-9]{8,15}`), "Email cửa hàng", "Địa chỉ". Status text "Đang hoạt động".
  - Button "Lưu thông tin" ("Đang lưu...").
  - Error "Không thể cập nhật thông tin cửa hàng. Hãy kiểm tra dữ liệu và quyền tài khoản." Load texts "Đang tải thông tin cửa hàng..." and "Không thể tải thông tin cửa hàng."
  - API: `GET /tenants/current` and `PATCH /tenants/current {name, phone, email, address}`.
- **Branches** ("Chi nhánh", "Danh sách chi nhánh"):
  - Button "Thêm chi nhánh". Table headers: Chi nhánh, Địa chỉ, Số điện thoại, Kho, Trạng thái, Thao tác. Row buttons "Sửa" and "Ngừng hoạt động" / "Kích hoạt" (PATCH status), and delete.
  - Dialog `role=dialog` (h2 id `create-branch-title`: "Thêm chi nhánh" or "Sửa chi nhánh"; close `aria-label="Đóng"`). Fields:
    - "Tên chi nhánh" (placeholder "Chi nhánh trung tâm", required, max 150)
    - "Mã chi nhánh" (placeholder "CN02", required, max 20, pattern `[A-Za-z0-9_-]+`)
    - "Địa chỉ" (placeholder "Địa chỉ (không bắt buộc)")
    - "Số điện thoại" (placeholder "+84901234567", pattern `\+?[0-9]{8,15}`)
    - checkbox "Dùng làm kho"
  - Buttons: "Hủy" and "Tạo chi nhánh" / "Lưu thay đổi" ("Đang lưu...").
  - Errors:
    - "Không thể tạo chi nhánh. Hãy kiểm tra mã chi nhánh và quyền tài khoản."
    - "Không thể cập nhật chi nhánh. Hãy kiểm tra dữ liệu và quyền tài khoản."
    - "Không thể xóa chi nhánh cuối cùng hoặc chi nhánh đang được sử dụng."
    - "Chưa có chi nhánh." / "Không thể tải danh sách chi nhánh."
  - API: `GET/POST /branches`, `PATCH /branches/{id}`, `DELETE /branches/{id}`.
- **Subscription plans** (`SubscriptionPlans.tsx`, rendered inside Settings):
  - Heading "Gói dịch vụ", subtitle "Gói hiện tại và hạn mức sử dụng của cửa hàng.", badge `Đang dùng: {plan.name}`, plan card tags "Gói hiện tại" / "Phổ biến".
  - Quota lines `{n} chi nhánh`, `{n} người dùng`, `{n} sản phẩm`, `{n} GB lưu trữ`. Usage labels "Chi nhánh", "Người dùng", "Sản phẩm", "Dung lượng (GB)".
  - Read-only note: "Việc đổi gói hiện do quản trị viên hệ thống thực hiện; owner chỉ xem gói và hạn mức của cửa hàng."
  - Loading "Đang tải thông tin gói dịch vụ..."; error "Không thể tải gói dịch vụ từ KrakenD."
  - API: `GET /platform/api/v1/plans` (via gatewayClient) and `GET /platform/api/v1/subscription/current`.
  - Falls back to demo plans if the API errors.

## 15. Unreachable or inert (do not write tests for these)

- `CustomerAdvanced.tsx`: import CSV, merge duplicates, tags and segments dialogs are not mounted.
- Topbar search "Tìm nhanh (Đơn, SP, Khách)... ⌘K", the "Ghi nhớ đăng nhập" checkbox, and the "Xuất báo cáo" button in `DashboardHeader` do nothing.
- Orders has no create-order UI. `POST /sales/api/v1/orders` and `GET /sales/api/v1/orders/export` are unused by the UI.
- The sidebar tenant switch does not call `switchTenant`.
- Topbar branch pill is hardcoded text ("Flagship Store").
- Marketplace OAuth: the `PUT` upload to the returned `uploadUrl` (product images) and the Lazada authorize flow depend on external services.
- `/promotions` uses `orders.view`; `/settings` has no permission code.
- Existing E2E scaffold: `/home/truong/Code/PBL6/pbl-web/e2e/` has `package.json` (`@playwright/test` 1.65.1), `playwright.config.ts` and `tsconfig.json`. No specs exist yet. The e2e README does not exist; the app's own port is 5174.