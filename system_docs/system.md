# Tài liệu Mô tả Hệ thống (System Specification)

* **Tên dự án:** [Đang cập nhật] - Nền tảng Quản lý và Booking KOL/KOC
* **Phong cách thiết kế:** Tối giản (minimal), clean, mang lại trải nghiệm mượt mà, tập trung sâu vào dữ liệu và tối ưu hiệu suất.

---

## 1. Tổng quan kiến trúc (High-Level Architecture)

Hệ thống được chia làm hai phân hệ độc lập để tối ưu bảo mật và hiệu năng:

* **Public Landing Page:** Mặt tiền của doanh nghiệp. Tối ưu SEO cực hạn, load siêu tốc. Nơi khách hàng vãng lai xem profile công ty, danh sách KOL/KOC (đã được duyệt hiển thị) và gửi yêu cầu booking.
* **Internal Web App (SaaS/CRM Portal):** Trái tim của hệ thống. Nơi các role (Admin, Manager, Sale, KOL) tương tác, xử lý nghiệp vụ, quản lý vòng đời đơn hàng và sinh tài liệu tự động.

---

## 2. Đặc tả các Module nghiệp vụ chính

### Module 1: Quản lý nhân sự (KOL/KOC Lifecycle)

* **Onboarding (Đăng ký & Xác thực):** KOL tự tạo tài khoản. Hệ thống cung cấp checklist các tiêu chí cần đạt (VD: >100k followers, tỷ lệ tương tác >5%). KOL tick chọn và upload ảnh/link minh chứng.
* **Verification Workflow:**
* *Bước 1 (Auto):* Hệ thống chạy script kiểm tra sơ bộ các đường link mạng xã hội được cung cấp.
* *Bước 2 (Manual):* Nhân viên check chéo dữ liệu và click "Duyệt".


* **Public Visibility:** Nhân viên có nút toggle (Bật/Tắt) để đưa profile của KOL này xuất hiện lên Landing Page hoặc gỡ xuống ngay lập tức.
* **Offboarding & Risk Management:** Khi KOL ngừng hợp tác, hệ thống áp dụng cơ chế Soft Delete (ẩn đi, vô hiệu hóa quyền đăng nhập, ngừng nhận job mới) thay vì xóa hẳn khỏi database. Toàn bộ lịch sử hợp đồng, hóa đơn cũ vẫn được giữ nguyên vẹn để đối soát.

### Module 2: Quản lý Gói Booking & Engine Hợp đồng

* **Phân loại Booking:**
* *Gói Custom:* Khách hàng tự build (Sale tư vấn 1-1).
* *Gói Combo:* Hệ thống set sẵn (1-30 KOLs, 2-60 KOLs, chiến dịch viral...).


* **Smart Filter:** Công cụ tìm kiếm nội bộ mạnh mẽ giúp Sale lọc KOL theo ngách (Giáo dục, Công nghệ, F&B...), khoảng giá, nền tảng (TikTok, YouTube).
* **Contract Generation Engine (Cốt lõi):** Tự động hóa hoàn toàn việc làm hợp đồng. Hệ thống lưu trữ các mẫu hợp đồng dưới định dạng template. Khi chốt deal, hệ thống (có thể dùng một thư viện xử lý backend bằng Python) sẽ tự động map thông tin khách hàng, số tiền cọc, KPI vào template (dạng Markdown) và xuất thẳng ra file DOCX chuẩn format pháp lý để in hoặc ký điện tử.

### Module 3: Quản lý Đơn hàng (Order & Campaign Execution)

* **Pipeline Tracking:** Trạng thái đơn hàng trôi theo luồng: `Khởi tạo` ➔ `Đã Cọc` ➔ `Đang chạy` ➔ `Chờ nghiệm thu` ➔ `Hoàn thành`.
* **Proof Management:** Nơi KOL đăng nhập vào để trả task. KOL dán link video PR đã lên sóng hoặc upload file báo cáo. Dữ liệu tập trung tại một ID đơn hàng duy nhất giúp Sale và Khách hàng dễ dàng nghiệm thu.
* **Scalability:** Thiết kế database sẵn sàng cho phase 2 thêm các chức năng Upsale/Cross-sale khi khách hàng chuẩn bị kết thúc chiến dịch cũ.

---

## 3. Ma trận Phân quyền (RBAC - Role-Based Access Control)

Hệ thống cấp quyền theo cơ chế chặt chẽ, không ai phận sự được can thiệp vùng dữ liệu của người khác:

| Vai trò (Role) | Số lượng | Quyền hạn & Chức năng |
| --- | --- | --- |
| **Admin** <br>

<br>*(System Owner)* | 1 tài khoản duy nhất | **Toàn quyền dữ liệu.** <br>

<br>**Dynamic UI Control:** Cho phép bật/tắt các block trên Landing Page, thay đổi banner, tinh chỉnh layout cơ bản thông qua các nút toggle (config-driven UI) mà không cần can thiệp source code. |
| **Quản lý** | ~5 tài khoản | Nhìn thấy toàn bộ luồng tiền, đơn hàng, hợp đồng của tất cả Sale. <br>

<br>Quyền chốt duyệt cuối cùng cho các case hoàn tiền/hủy job. <br>

<br>*Không có quyền sửa UI hệ thống.* |
| **Sale** | Số lượng lớn | Tạo đơn, tư vấn, xuất file hợp đồng DOCX, chăm sóc khách. <br>

<br>*Chỉ nhìn thấy đơn hàng của mình.* |
| **Nhân viên Quản lý** | Số lượng lớn | Lọc hồ sơ KOL, verify minh chứng, điều phối job cho KOL. |
| **Nhân sự** <br>

<br>*(KOL/KOC)* | Không giới hạn | **Dashboard cá nhân:** Xem profile, xem job được giao, upload minh chứng hoàn thành job, theo dõi dòng tiền thanh toán cá nhân. |