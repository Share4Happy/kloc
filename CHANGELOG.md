 # Changelog

Tất cả các thay đổi đáng chú ý của dự án sẽ được ghi lại tại đây.

## [0.13.0] — 2026-03-13

### Xác Thực (Authentication) & Điểm Chạm Vãng Lai (Public Pages)
- Dứt điểm toàn bộ lỗi `404 Not Found` trên cụm Frontend NextJS.
- Triển khai **Trang Đăng Nhập (`/login`)**: Tích hợp luồng Auth Store với Zustand, gọi API đổi lấy Token và điều phối góc dựa trên Role của tài khoản (Manager, Sale, KOL...).
- Triển khai **Trang Đăng Ký (`/register`)**: Cung cấp Onboarding Form, liên kết API tự tạo KOL và luân chuyển tài khoản thẳng vào Workspace đăng nhập bằng Access Token.
- Triển khai **Mạng Lưới KOL (`/kols`)**: Màn hình liệt kê Dynamic Data dựa trên những cá nhân đã được KOL Manager Verify.
- Triển khai Màn tĩnh **Về Chúng Tôi (`/about`)** và **Liên Hệ (`/contact`)**: Gia tăng Mockup UI và UI/UX tương tác (Component Loading Spinner).

## [1.0.0] — 2026-03-13

### Production-ready Dockerization 🚀
Bản phát hành chính thức đóng gói toàn bộ hệ thống KLOC Booking Platform thành kiến trúc Container chuẩn:
- **`docker-compose.yml`**: Khởi chạy 3 trụ cột (Database, FastAPI, NextJS) chỉ bằng một câu lệnh `docker compose up -d`.
- **Bảo toàn dữ liệu (Database)**: Ứng dụng `Named Volume` (`kloc_pgdata`) vào PostgreSQL Container. Đảm bảo dữ liệu sống sót qua mọi đợt Restart/Update.
- **Backend Entrypoint**: Viết Bash script `entrypoint.sh` cho Backend, tự động chọc xuống gõ Schema Migration (`alembic upgrade head`) với kiến trúc Enum xử lý Exception hoàn hảo trước khi Boot Server. Giải quyết rắc rối khi Update Database.
- **Frontend Standalone Build**: Config `next.config.ts` để nén App NextJS lại thành bản build cực nhẹ, tự Host Server NodeJS Node:20-alpine mà không cần Nginx phụ thuộc (Phù hợp cắm vào Nginx Proxy Manager của Host).

## [0.12.0] — 2026-03-13

### Hệ sinh thái KOL (Workspace & Manager) - Đóng gói Dự án (Final)
- Triển khai **KOL Manager Portal (`/portal/kol_manager`)**: Bảng điều khiển kiểm duyệt Profile cho hàng loạt KOL. Gắn sự kiện `PATCH /kol/verify` và điều khiển Toggle `PATCH /kol/visibility` để đưa KOL ra mặt Landing Page.
- Triển khai **KOL Workspace (`/portal/kol`)** sử dụng React Tabs:
  - **Tab Profile:** Trạm Onboarding khai báo thông tin MXH, Ngách (Niche) và giá Min/Max của KOL.
  - **Tab My Jobs:** Trạm nhận Order từ Sale, trang bị Module Form cho phép nộp đường link minh chứng Video/Bài đăng nghiệm thu gọi API `PATCH /orders/*/proof`.
- Hoàn thiện luồng Sidebar Navigation động dựa trên Role của hệ thống.
- Cập nhật, Finalize luồng Workflow tổng quan tất cả Portal vào `SYSTEM_DOCS.md`.

## [0.11.0] — 2026-03-13

### Manager Portal & Sale Workflow
- Nâng cấp cơ chế phân quyền: Ra mắt `RoleRouteGuard` cho phép truyền mảng kiểm tra nhiều Role (VD: `['manager', 'admin']`) để bảo vệ Component cực kỳ bảo mật và dễ nhúng.
- Xây dựng **Manager Dashboard (`/portal/manager`)**: Cung cấp cái nhìn bao quát về tất cả luồng tiền của công ty, bao gồm các Button *Mockup Duyệt lệnh (Approve)* xử lý chuyển đổi trạng thái Đơn Hàng.
- Xây dựng **Sale Dashboard (`/portal/sale`)**: Chế độ view thu gọn chỉ tải các Order liên quan đến tài khoản Sale đang đăng nhập.
- Xây dựng **Công cụ Sale (`/portal/sale/tools`)**:
  - Tích hợp cụm Component _Smart Filter_ để Form nội bộ chạy GET Filters gọi KOL theo tham số `niche`, `min_price`.
  - Tích hợp luồng Payload Blob gọi Endpoint `POST /contracts/generate` để tự động tải Hợp Đồng Word (`.docx`) điền sẵn thông số về máy tính chỉ với 1 click.

## [0.10.0] — 2026-03-13

### Admin Portal & Quản lý Truy cập
- Tạo HOC `AdminRouteGuard` (Role-Based Access Control trên Frontend) để chặn đứng những người dùng không có `role === 'admin'`.
- Chuyển link gốc của Admin Dashboard sang `/portal/admin`. Dựng Layout Grid Tổng quan mockup (tổng đơn, tổng KOL, tổng doanh thu).
- Xây dựng màn hình `Cấu hình UI` (`/portal/admin/settings`): Đọc cấu hình Auto-seed từ Backend lên React State.
- Tích hợp Toggle Switch Component giả lập iOS và luồng lưu API `PATCH /configs` cho Admin chỉnh UI Landing Page không cần dev.

## [0.9.0] — 2026-03-13

### Trải nghiệm Trang Chủ (Landing Page) & SEO
- Xây dựng hoàn thiện Trang chủ `app/(public)/page.tsx` sử dụng **Server Components** dành riêng cho tối ưu hóa SEO.
- Sử dụng hàm `fetch` Server-side với tham số `next: { revalidate: 3600 }`. Việc này áp dụng cơ chế Caching Data 1 tiếng/lần (ISR), giúp load trang chủ với tốc độ của File tĩnh (SSG) mà không gọi mòn Database.
- Dựng UI Minimal cho *Hero Banner*, hiển thị text động dựa trên API `/configs`.
- Dựng UI hiển thị *KOL Spotlight* xếp dạng Grid từ API `/kol/filters`.
- Dựng Client Component `BookingForm.tsx` Mockup tương tác Submit cho Khách vãng lai gửi yêu cầu nhanh.
- Document lại cơ chế Caching và Fetching trên Next.js nội bộ tại `SYSTEM_DOCS.md`.

## [0.8.0] — 2026-03-13

### Frontend Next.js Architecture
- Khởi tạo kiến trúc Routing: Nhóm các route vào Route Groups `(public)` và `(dashboard)`.
- Tạo `PublicLayout.tsx` cho các Page dạng Landing, Header, Footer public.
- Tạo `DashboardLayout.tsx` cho các Page màn hình nội bộ (Sidebar điều khiển động theo role user).
- Tích hợp `axios` config (`lib/axios.ts`): Cắm Auto JWT Interceptor và Auto-Redirect (401 về `/login`).
- Tích hợp `zustand` (`store/authStore.ts`): State Global quản lý phiên đăng nhập `user`, `role`, kết hợp `persist` localStorage chống rớt session.
- Document lại hệ thống State và Cấu trúc Next.js App Router.

## [0.7.0] — 2026-03-13

### Module Cấu hình Giao diện (UI Configs)
- Tạo bảng `ui_configs` dạng Key-Value store (sử dụng JSONB cho cột value) để Admin cấu hình nội dung Landing Page.
- Tự động mồi (auto-seed) các cấu hình mặc định: `show_banner`, `hero_title`, `hero_subtitle`, `contact_email`.
- Xây dựng API `/configs` (GET - Public) trả về Dict cấu hình cho Frontend Next.js.
- Xây dựng API `/configs` (PATCH - Admin) để cập nhật và thêm mới key linh hoạt.
- Cập nhật tài liệu UI Configs vào `SYSTEM_DOCS.md`.

## [0.6.0] — 2026-03-13

### Module Quản lý Đơn hàng (Orders) & Smart Filter
- Tạo enum `OrderStatus` (INIT, DEPOSITED, RUNNING, PENDING_REVIEW, COMPLETED).
- Mở rộng model `KOLProfile` hỗ trợ Smart Filter: thêm mảng `niche`, `min_price`, `max_price`.
- Tạo model `Order` quản lý thông tin booking giữa `Sale` và `KOL`, trạng thái, số tiền (total, deposit), link proof.
- Khởi tạo Alembic migrate `add_order_table_and_kol_filters`.
- Tạo các schema quản lý Order (`OrderCreate`, `OrderStatusUpdate`, `OrderProofSubmit`, `OrderResponse`).
- Xây dựng **Order API**: 
  - `POST /orders`: Sale/Manager tạo đơn.
  - `PATCH /orders/{id}/status`: Cập nhật trạng thái đơn (Sale, Manager, KOL_Manager).
  - `PATCH /orders/{id}/proof`: KOL tự nộp file báo cáo / nghiệm thu.
  - `GET /orders`: Lấy danh sách booking (RBAC: Admin/Manager thấy tất cả, KOL chỉ thấy đơn mình).
- Xây dựng **Smart Filter API**: `GET /kol/filters` hỗ trợ lọc theo query params `niche`, `min_price`, `max_price`, `platform`.
- Cập nhật tài liệu API và Pipeline đơn hàng trong `SYSTEM_DOCS.md`.

## [0.5.0] — 2026-03-13

### Contract Engine Module

- Cài đặt `python-docx` và `docxtpl` qua `uv` để trích xuất và render file Word.
- Tạo API `POST /contracts/generate` trả về trực tiếp file tải xuống (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
- RBAC: endpoint này chỉ dành cho `Sale`, `KOL_Manager` (và `Admin`).
- `ContractEngine`: service đọc file `contract_template.docx` (sử dụng Jinja2 tags `{{ }}`) và tự động map dữ liệu từ payload API.
- Tích hợp thêm các biến tự tạo: `{{ day }}`, `{{ month }}`, `{{ year }}` và tự động nhóm ba dấu phẩy cho tiền VND (`total_amount`, `deposit_amount`).
- Viết document mô tả Payload khởi tạo và Hướng dẫn cú pháp template vào `SYSTEM_DOCS.md`.

## [0.4.0] — 2026-03-13

### Module Quản lý KOL

- **Onboarding**: `PUT /kol/profile` — KOL tự cập nhật profile (followers, engagement_rate, social_links, bio).
- **Verification (Auto)**: `POST /kol/profile/verify-links` — Kiểm tra tự động định dạng social links.
- **Verification (Manual)**: `PATCH /kol/{profile_id}/verify` — KOL_Manager duyệt/từ chối profile.
- **Public Visibility**: `PATCH /kol/{profile_id}/visibility` — Toggle hiển thị Landing Page (chỉ khi approved).
- **Offboarding**: `PATCH /kol/{user_id}/deactivate` — Soft delete (is_active=false, ẩn Landing Page).
- **Reactivate**: `PATCH /kol/{user_id}/reactivate` — Kích hoạt lại KOL.
- **Read**: `GET /kol/profiles` (danh sách, lọc theo status), `GET /kol/profile` (xem profile cá nhân).
- Thêm `VerificationStatus` enum (`pending`/`approved`/`rejected`) vào model `KOLProfile`.
- Migration `597aa5bba74e`: thêm cột `verification_status`, `verification_notes`.
- Tạo `services/social_verifier.py` — mock function kiểm tra link social.
- Cập nhật `SYSTEM_DOCS.md` với ERD mới và KOL Management API endpoints.

## [0.3.0] — 2026-03-13

### Authentication & RBAC

- Hệ thống xác thực JWT: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- KOL tự đăng ký qua `/auth/register` (role luôn là `kol`).
- Password hashing bằng `bcrypt` (trực tiếp, không dùng passlib).
- JWT token: `python-jose`, thuật toán HS256, hết hạn 60 phút.
- RBAC middleware: `get_current_user` (dependency xác thực), `require_roles()` (factory kiểm tra role).
- Admin toàn quyền, các role khác bị giới hạn theo `system_docs/system.md`.
- Soft-delete: tài khoản `is_active=false` bị chặn đăng nhập (403).
- Cập nhật `SYSTEM_DOCS.md` với danh sách endpoint Auth, hướng dẫn gắn token.

## [0.2.0] — 2026-03-13

### Database Schema & Alembic

- Thiết kế bảng `users` (SQLAlchemy): email, hashed_password, full_name, phone, role (Enum: admin/manager/sale/kol_manager/kol), is_active (soft delete), timestamps.
- Thiết kế bảng `kol_profiles` (1-1 với Users): followers, engagement_rate, social_links (JSONB), bio, is_public, timestamps.
- Tạo module `app/core/` (config, database, enums).
- Cấu hình Alembic: `env.py` đọc `DATABASE_URL` từ `.env`, autogenerate từ models.
- Tạo migration đầu tiên: `4b02e78d99ab_create_users_and_kol_profiles`.
- Tạo `.env` production với mật khẩu database mạnh.
- Cập nhật `SYSTEM_DOCS.md` với ERD và mô tả Role.

## [0.1.0] — 2026-03-13

### Khởi tạo dự án

- Tạo cấu trúc monorepo với hai thư mục chính: `backend/` và `frontend/`.
- **Backend**: Khởi tạo project Python FastAPI bằng `uv`.
  - Cài đặt dependencies: `fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `alembic`, `python-dotenv`.
  - Tạo `app/main.py` với endpoint `/health`.
  - Tạo `.env.example` với các biến môi trường mẫu.
- **Frontend**: Khởi tạo Next.js App Router.
  - TypeScript, Tailwind CSS, ESLint.
  - Sử dụng `src/` directory.
- Tạo `SYSTEM_DOCS.md` (tài liệu hệ thống) và `CHANGELOG.md`.
