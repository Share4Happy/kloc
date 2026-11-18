# KOL/KOC Booking Platform — System Documentation

## Cấu trúc thư mục

```
kloc/
├── backend/                       # FastAPI Backend
│   ├── alembic/
│   │   ├── versions/              # Migration scripts
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── app/
│   │   ├── api/
│   │   │   └── auth.py            # Auth endpoints (register/login/me)
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic Settings (đọc .env)
│   │   │   ├── database.py        # SQLAlchemy engine & session
│   │   │   ├── deps.py            # Auth dependencies & RBAC
│   │   │   ├── enums.py           # UserRole enum
│   │   │   └── security.py        # Password hashing & JWT
│   │   ├── models/
│   │   │   ├── base.py            # Base model (UUID PK, timestamps)
│   │   │   ├── user.py            # Users table
│   │   │   └── kol_profile.py     # KOL_Profiles table
│   │   ├── schemas/
│   │   │   └── auth.py            # Pydantic schemas (request/response)
│   │   └── main.py                # FastAPI application entry point
│   ├── .env                       # Biến môi trường (KHÔNG commit)
│   ├── .env.example               # Template biến môi trường
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/                      # Next.js Frontend
│   ├── src/
│   │   └── app/                   # App Router pages & layouts
│   ├── public/                    # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   └── eslint.config.mjs
├── SYSTEM_DOCS.md                 # ← Tài liệu này
└── CHANGELOG.md

```

## Khởi chạy bằng Docker (Môi trường Server / Production)
Hệ thống KLOC được thiết kế kịch bản **Docker hóa** hoàn chỉnh, phù hợp để host trên các Server Linux có sẵn Nginx Proxy Manager.

**Đặc điểm kiến trúc Container:**
1. **DB (`postgres:15-alpine`):** Mapping port `5432:5432`. Cấp phát Named Volume `kloc_pgdata` để đảm bảo dữ liệu **không bao giờ bị mất** khi khởi động lại hoặc xóa Container.
2. **Backend (`kloc_backend`):** Tự động phát hiện và chạy lệnh Migrate Schema Database (`alembic upgrade head`) ngay khi boot lên thông qua file `entrypoint.sh`. Tránh triệt để lỗi thiếu bảng.
3. **Frontend (`kloc_frontend`):** Build theo chuẩn `standalone` (chỉ bóc tách những file NodeJS cần thiết thay vì toàn bộ `node_modules`), tối ưu cực nhẹ. Nginx Proxy Manager vòng ngoài chỉ cần trỏ Domain vào Port `:3000`.

**Lệnh Deploy:**
```bash
# Clone source code, sau đó đứng tại thư mục gốc:
docker-compose up -d --build

# Xem log các dịch vụ
docker-compose logs -f
```

---

## Database Schema (ERD)

### Bảng `users`

```
┌─────────────────────────────────────────────┐
│ users                                       │
├─────────────────────────────────────────────┤
│ id              UUID (PK)                   │
│ email           VARCHAR(255) UNIQUE, INDEX  │
│ hashed_password VARCHAR(255)                │
│ full_name       VARCHAR(255)                │
│ phone           VARCHAR(20) NULLABLE        │
│ role            ENUM(user_role)             │
│ is_active       BOOLEAN DEFAULT true        │
│ created_at      TIMESTAMPTZ                 │
│ updated_at      TIMESTAMPTZ                 │
└─────────────────────────────────────────────┘
```

### Bảng `kol_profiles`

```
┌──────────────────────────────────────────────────────┐
│ kol_profiles                                         │
├──────────────────────────────────────────────────────┤
│ id                  UUID (PK)                        │
│ user_id             UUID (FK → users.id) UNIQUE      │
│ followers           INTEGER DEFAULT 0                │
│ engagement_rate     FLOAT DEFAULT 0.0                │
│ social_links        JSONB NULLABLE                   │
│ bio                 VARCHAR(1000) NULLABLE            │
│ is_public           BOOLEAN DEFAULT false             │
│ verification_status ENUM(pending/approved/rejected)   │
│ verification_notes  TEXT NULLABLE                     │
│ created_at          TIMESTAMPTZ                      │
│ updated_at          TIMESTAMPTZ                      │
└──────────────────────────────────────────────────────┘
```
### Bảng `orders`

```
┌───────────────────────────────────────────────┐
│ orders                                        │
├───────────────────────────────────────────────┤
│ id              UUID (PK)                     │
│ sale_id         UUID (FK → users.id)          │
│ kol_id          UUID (FK → users.id)          │
│ status          ENUM(init/deposited/running/  │
│                      pending_review/completed)│
│ total_amount    INTEGER                       │
│ deposit_amount  INTEGER                       │
│ proof_link      VARCHAR(1000) NULLABLE        │
│ proof_notes     VARCHAR(2000) NULLABLE        │
│ created_at      TIMESTAMPTZ                   │
│ updated_at      TIMESTAMPTZ                   │
└───────────────────────────────────────────────┘
```

### Bảng `ui_configs` (Cấu hình Giao diện)

Bảng Key-Value cho phép Admin thay đổi nội dung hiển thị của Landing Page mà không cần sửa code.

```
┌───────────────────────────────────────────────┐
│ ui_configs                                    │
├───────────────────────────────────────────────┤
│ id              UUID (PK)                     │
│ key             VARCHAR(255) (UNIQUE, INDEX)  │
│ value           JSONB                         │
│ description     TEXT NULLABLE                 │
│ created_at      TIMESTAMPTZ                   │
│ updated_at      TIMESTAMPTZ                   │
└───────────────────────────────────────────────┘
```

#### Các Key-Value mặc định (Auto-seeding)
- `show_banner` (boolean): Bật/Tắt banner sự kiện.
- `hero_title` (string): Tiêu đề ở Hero section.
- `hero_subtitle` (string): Phụ đề ở Hero section.
- `contact_email` (string): Email liên hệ dưới Footer.

### Quan hệ

```
users.id  ──(1:1)──  kol_profiles.user_id  (ON DELETE CASCADE)
users.id  ──(1:N)──  orders.sale_id        (ON DELETE RESTRICT)
users.id  ──(1:N)──  orders.kol_id         (ON DELETE RESTRICT)
```

### Mô tả các Role (`user_role` Enum)

| Role          | Mô tả                                                              |
| ------------- | ------------------------------------------------------------------- |
| `admin`       | Quản trị viên hệ thống — toàn quyền                                |
| `manager`     | Quản lý chiến dịch, duyệt booking                                  |
| `sale`        | Nhân viên kinh doanh — tạo booking, quản lý khách hàng             |
| `kol_manager` | Quản lý KOL — duyệt profile KOL, phân công chiến dịch              |
| `kol`         | KOL/KOC — cập nhật profile, nhận job, gửi link nghiệm thu (proof)  |

---

## Cấu hình UI API

API quản lý các thông số cấu hình giao diện.

| Method | Endpoint    | Auth Role    | Mô tả                                 |
| ------ | ----------- | ------------ | -------------------------------------- |
| GET    | `/configs`  | Public       | Lấy dictionary chứa toàn bộ cấu hình UI|
| PATCH  | `/configs`  | Admin        | Cập nhật các keys cấu hình             |

---

## Authentication API (JWT)

### Endpoints

| Method | Endpoint          | Auth   | Mô tả                                  |
| ------ | ----------------- | ------ | --------------------------------------- |
| POST   | `/auth/register`  | ❌ Không | KOL/KOC tự đăng ký (role luôn là `kol`) |
| POST   | `/auth/login`     | ❌ Không | Đăng nhập (tất cả role)                 |
| GET    | `/auth/me`        | ✅ Bearer | Lấy thông tin user hiện tại             |

### Register Request

```json
POST /auth/register
{
  "email": "kol@example.com",
  "password": "matkhau123",
  "full_name": "Nguyễn Văn A",
  "phone": "0901234567"
}
```

### Login Request

```json
POST /auth/login
{
  "email": "kol@example.com",
  "password": "matkhau123"
}
```

### Response (cả Register & Login)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### JWT Token

Auth Token sử dụng định dạng JSON Web Token (JWT).
Khi gọi `/auth/login`, Client nhận được:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Gắn Token vào Header

Mọi API yêu cầu xác thực cần gửi header:

```
Authorization: Bearer <access_token>
```

Ví dụ với `curl`:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  https://kloc.talab.io.vn/api-backend/auth/me
```

### RBAC — Phân quyền theo Role

- **Admin**: Toàn quyền — luôn được phép truy cập mọi endpoint.
- Các role khác chỉ truy cập được endpoint đã được cấp quyền.
- Tài khoản bị `is_active=false` (soft delete) → trả về `403 Forbidden`.
- Sử dụng dependency `require_roles()` để gắn RBAC vào từng endpoint.

---

## Kiến trúc Frontend (Next.js App Router)

### 1. Phân chia Layout (Route Groups)
Để tách biệt giao diện website public và trang quản trị nội bộ (Dashboard), Next.js App Router được cấu trúc bằng Route Groups:
- `app/(public)`: Các trang như Landing Page, Đăng nhập, Đăng ký. Không yêu cầu đăng nhập. Sử dụng `PublicLayout.tsx` (có Header Navbar, Footer).
- `app/(dashboard)`: Trang portal dành cho Admin, Sale, và KOL. Hệ thống bắt buộc phải đăng nhập. Sử dụng `DashboardLayout.tsx` (có Sidebar và Topbar tùy vào role người dùng).

### 2. Quản lý trạng thái (Zustand Auth Store)
Sử dụng **Zustand** (`src/store/authStore.ts`) làm State Manager.
- Lưu trữ 2 object chính: `user` (id, email, full_name, role) và `token` (cho Axios call).
- Kết hợp plugin `persist` tự động ghim auth state lại dưới LocalStorage.
- Người dùng refresh trang F5 vẫn giữ nguyên thông tin đăng nhập.

### 3. API Axios & JWT Interceptor
Logic gửi API được tập trung tại `src/lib/axios.ts`:
- Tự động bắt state Token (từ LocalStorage của Zustand) đính vào Header `Authorization: Bearer`.
- Tự động bắt phản hồi từ Backend. Nếu Backend báo `401 Unauthorized` (do phiên bản lỗi hoặc hết hạn), Axios Interceptor sẽ xóa sạch Storage và ép trình duyệt chuyển hướng về trang `/login`.

### 4. Data Fetching & Caching (SSR / SSG)
Để tối ưu hóa Tốc độ Tải trang (Page Speed) và Tối ưu hóa Công cụ Tìm kiếm (SEO) cho **Landing Page**, chúng tôi áp dụng chiến lược Static Site Generation (SSG) với Incremental Static Regeneration (ISR).

- **Không dùng Axios trên Server Components:** Trên giao diện Public `app/(public)/page.tsx`, hệ thống dùng hàm `fetch()` tiêu chuẩn thay vì Axios. Việc này nhắm mục tiêu móc nối với bộ Cache siêu mạnh của Next.js (Axios không tự có).
- **Cơ chế Cache (`next: { revalidate: 3600 }`)**: 
  - Khi có một User bất kỳ vào Web lần đầu trong 1 giờ, Next.js sẽ gọi thẳng DB Backend (`/configs` hoặc `/kol/filters`), nướng sẵn ra 1 file HTML, và ném cho User.
  - Từ mốc đó, hàng nghìn users khác vào Landing Page trong vòng 1 tiếng tới sẽ nhận ngay bản HTML tĩnh (cache) siêu nhẹ mà không cần gọi rát máy chủ Backend. Quá thời gian, Next.js ngầm gọi lại DB làm mới cache cho 1 giờ tiếp theo.

### 5. Phân quyền cấp bậc và Portals Nội bộ (Dashboards)
Hệ thống sử dụng lõi HOC bảo mật `RoleRouteGuard` để kẹp chặn phân mảnh Route. Từ đó, ta có một bộ hệ sinh thái **Micro-portals** hoàn chỉnh phục vụ riêng cho từng bộ phận:
- **Admin Portal (`/portal/admin`)**: Quản trị chỉ số toàn hệ thống, truy cập màn hình `/portal/admin/settings` (Cấu hình UI).
- **Manager Portal (`/portal/manager`)**: Kiểm soát luồng tiền toàn công ty, có quyền duyệt lệnh Đơn Đặt Hàng.
- **Sale Portal (`/portal/sale`)**: Chế độ Focus dành cho người dùng Sale chuyên nghiệp. Cung cấp tab Công cụ (`/portal/sale/tools`) để chạy Smart Filter và tải file DOCX.
- **KOL Manager Portal (`/portal/kol_manager`)**: Khu vực Cấp tích xanh (Verify) cho các tài khoản KOL đăng kí vào hệ thống. Là nơi quyết định KOL nào được lên kệ mặt tiền Landing Page (Bật Toggle Public).
- **KOL Workspace (`/portal/kol`)**: Thiết kế dạng Tabs UI. Trạm Onboarding tự khai báo Profile (Youtube, giá Min/Max). Và là trạm tiếp nhận Đơn Hàng (Job), nơi KOL nộp "Link chứng minh" hoàn trả tiến độ để xin duyệt nhận thù lao. 

---

## KOL Management API

### Endpoints

| Method | Endpoint                        | Auth Role            | Mô tả                                    |
| ------ | ------------------------------- | -------------------- | ----------------------------------------- |
| PUT    | `/kol/profile`                  | KOL                  | KOL cập nhật profile (onboarding)         |
| GET    | `/kol/profile`                  | KOL                  | KOL xem profile của mình                  |
| POST   | `/kol/profile/verify-links`     | KOL                  | Kiểm tra tự động social links             |
| PATCH  | `/kol/{profile_id}/verify`      | KOL_Manager / Admin  | Duyệt hoặc từ chối profile                |
| PATCH  | `/kol/{profile_id}/visibility`  | KOL_Manager / Admin  | Bật/Tắt hiển thị trên Landing Page        |
| PATCH  | `/kol/{user_id}/deactivate`     | KOL_Manager / Admin  | Vô hiệu hóa KOL (soft delete)            |
| PATCH  | `/kol/{user_id}/reactivate`     | KOL_Manager / Admin  | Kích hoạt lại KOL                         |
| GET    | `/kol/profiles`                 | KOL_Manager / Admin  | Danh sách KOL (lọc theo status)           |

### Quy trình Verification

```
KOL đăng ký → Cập nhật profile (PUT /kol/profile)
       ↓
Bước 1 (Auto): KOL chạy POST /kol/profile/verify-links
       ↓
Bước 2 (Manual): KOL_Manager duyệt PATCH /kol/{id}/verify
       ↓
Nếu approved → Toggle PATCH /kol/{id}/visibility → Hiển thị Landing Page
```

### Onboarding Request

```json
PUT /kol/profile
{
  "followers": 150000,
  "engagement_rate": 5.8,
  "social_links": {
    "tiktok": "https://tiktok.com/@handle",
    "youtube": "https://youtube.com/@channel"
  },
  "bio": "Content creator chuyên về công nghệ"
}
```

### Verification (Manual)

```json
PATCH /kol/{profile_id}/verify
{
  "status": "approved",
  "notes": "Đã kiểm tra, đạt tiêu chí"
}
```

> `status` nhận giá trị: `pending`, `approved`, `rejected`.

### Visibility Toggle

```json
PATCH /kol/{profile_id}/visibility
{
  "is_public": true
}
```

> Chỉ profile đã `approved` mới được bật `is_public = true`.

### Offboarding (Soft Delete)

```
PATCH /kol/{user_id}/deactivate    → is_active=false, is_public=false
PATCH /kol/{user_id}/reactivate    → is_active=true
```

---

## Contract Engine API

Module hỗ trợ tự động điền dữ liệu vào file Word (`.docx`) và tải xuống hợp đồng.

### API Endpoint

| Method | Endpoint              | Auth Role            | Mô tả                                 |
| ------ | --------------------- | -------------------- | -------------------------------------- |
| POST   | `/contracts/generate` | Sale, KOL_Manager    | Tạo và tải xuống file DOCX hợp đồng    |

### Payload Khởi tạo Hợp đồng
Hệ thống sử dụng `python-docx` và `docxtpl` để sinh file DOCX động dựa trên template có chứa biến.

**Endpoint:** `POST /contracts/generate`
- **Request (JSON):**
  ```json
  {
    "customer_name": "Công ty TNHH XYZ",
    "kpi": "1 video dài 5 phút trên YouTube, 2 bài post Facebook",
    "deposit_amount": 5000000
  }
  ```
- **Response:** File `.docx` nhị phân (stream). Header `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

### Luồng Gọi Từ Frontend (Sale Tools)
Vì endpoint trả về một luồng Byte nhị phân thay vì JSON, Client (Sale Tools) sử dụng cấu hình Axios Response:
1. `responseType: 'blob'` báo cho Axios không Parse `res.data` thành JSON.
2. Dùng hàm Browser `window.URL.createObjectURL(new Blob([res.data]))` tạo một đường link tạm thời.
3. Tạo thẻ `<a>` ảo để bắt trình duyệt force Download file với tên tương ứng `Contract_[Tên KH].docx`. Mọi thao tác đều thực thi phía Client-side.

### Hướng dẫn tạo Template DOCX

Hệ thống sử dụng thư viện `docxtpl` (dựa trên Jinja2) để map dữ liệu.

1. **Vị trí file:** Đặt file mẫu tại `backend/app/templates/contract_template.docx`.
2. **Cú pháp biến (Variables):** Để chèn dữ liệu, sử dụng cặp ngoặc nhọn `{{ }}` trực tiếp trong file Word.
   Ví dụ trong file Word bạn gõ:
   - Tên khách hàng: `{{ customer_name }}`
   - KOL: `{{ kol_name }}`
   - Nền tảng: `{{ platform }}`
   - Tổng tiền: `{{ total_amount }}` VNĐ

*Lưu ý: Hệ thống sẽ tự động thêm các biến thời gian hiện tại (`{{ day }}`, `{{ month }}`, `{{ year }}`) và tự động format tiền tệ thành chuỗi có dấu phẩy.*

---

## Lệnh khởi chạy

### Backend (FastAPI)

```bash
cd backend

# Tạo môi trường ảo & cài dependencies
uv sync

# Chạy development server
uv run uvicorn app.main:app --reload --port 8000

# Health check
curl https://kloc.talab.io.vn/api-backend/health

# Alembic — Migration
uv run alembic upgrade head     # Chạy migration
uv run alembic downgrade -1     # Rollback 1 bước
uv run alembic revision --autogenerate -m "mô_tả"  # Tạo migration mới
```

### Frontend (Next.js)

```bash
cd frontend

# Cài dependencies
npm install

# Chạy development server
npm run dev
# → http://<frontend-host>:3000

# Build production
npm run build
```

---

## Công nghệ sử dụng

| Layer    | Stack                                                              |
| -------- | ------------------------------------------------------------------ |
| Backend  | Python 3, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Alembic          |
| Auth     | JWT (python-jose), bcrypt                                          |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, ESLint             |
| Database | PostgreSQL (psycopg2)                                              |
| Package  | `uv` (backend), `npm` (frontend)                                  |
