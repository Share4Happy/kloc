# TÀI LIỆU KIỂM THỬ VÀ TỔNG HỢP CHỨC NĂNG HỆ THỐNG BOOKING KLOC (BẢN ĐẦY ĐỦ)

Tài liệu này tổng hợp **TOÀN BỘ** các luồng chức năng, business logic và kịch bản test bảo mật để bộ phận QA tiến hành nghiệm thu hệ thống (End-to-End Test). Checklist này dùng chung cho tất cả các Roles: Khách vãng lai, KOL, Sale, Manager và Admin.

---

## I. MODULE KHÁCH VÃNG LAI (GUEST & LANDING PAGE)

### 1. Xem Thư Viện KOL (KOL Directory)
- [ ] **Smart Filter:** Có thể tìm kiếm/lọc danh sách KOL theo các tiêu chí: Lĩnh vực (Niche), Mức giá (Min/Max), Lượng Followers, Nền tảng (Platform).
- [ ] **Xem chi tiết Profile:** Khách xem được thông tin chung (Bio, Chỉ số tương tác, Giá dự kiến, Link mxh) của các KOL đã được bật "Hiển thị công khai" (`is_public = true`). KHÔNG BÁO LỖI KHI XEM.

### 2. Gửi Yêu Cầu Tư Vấn / Liên Hệ
- [ ] **Submit Form liên hệ:** Khách hàng điền tên, số điện thoại, email, thông tin chiến dịch/KPI mong muốn.
- [ ] **Luồng Tự Động (Auto-Lead):** Hệ thống lập tức tạo một `Order` ở trạng thái `NEW_REQUEST` đẩy vào "Bể Hàng Chờ" (Pool) của hệ thống Sale để chờ xử lý.

---

## II. MODULE XÁC THỰC VÀ TÀI KHOẢN (AUTH & USER MANAGEMENT)

### 1. Đăng ký & Đăng nhập
- [ ] **Đăng ký (Register):** Đăng ký tài khoản hệ thống với các lựa chọn vai trò cơ bản.
- [ ] **Đăng nhập (Login):** Bằng tài khoản và mật khẩu, cấp JWT Token để giữ phiên đăng nhập.
- [ ] **Rate Limiting (Chống Brute-force):** Nhập sai mật khẩu liên tục 5-6 lần. **Mong đợi:** API trả mã `429 Too Many Requests`. Tính năng này áp dụng chặn Spam đăng ký 1 IP tạo nhiều tài khoản.

### 2. Quản Lý Tài Khoản (Dành cho Admin/Manager)
- [ ] Xem danh sách toàn bộ Users trên hệ thống.
- [ ] Cấp quyền/Đổi Role cho User (từ KOL lên Sale hoặc ngược lại).
- [ ] Khóa tài khoản (`Deactivate`) những user nghi ngờ vi phạm hoặc nghỉ việc. Users bị khoá sẽ không thể đăng nhập.

---

## III. MODULE QUẢN LÝ HỒ SƠ KOL (KOL MANAGEMENT)

### 1. Cổng Thông Tin KOL (KOL Portal)
- [ ] **Khai báo thông tin:** KOL tự điền thông tin Giá Min/Max, Lĩnh vực, Lượng Followers, Chỉ số tương tác, Bio.
- [ ] **Kết nối MXH:** Thêm URL các mạng xã hội (Facebook, Tiktok, Instagram).
  - Khởi chạy tính năng **Social Link Verification**: Nút bấm tự động kiểm tra xem Link URL có sống không, thu thập thông số/báo cáo về mức uy tín.
- [ ] **Nhiệm vụ Checklist:** Cập nhật các trạng thái Check-list hướng dẫn tham gia mạng lưới của Agency.

### 2. Định Danh & Tải Lên Minh Chứng (Upload Evidence)
- [ ] **Tải lên Avatar & Hình Ảnh/File CMND:** Màn hình cho KOL đẩy file lên hệ thống.
- [ ] **Kiểm duyệt Bảo mật File (Magic Bytes Check):** Tester thử thao tác đính kèm 1 file text, file `malware.sh` nhưng cố tình đổi đuôi thành `.jpg` hoặc `.png`. **Mong đợi:** Cảnh báo "Định dạng file không hợp lệ" và ngăn chặn tải lên.

### 3. Kiểm Duyệt Hồ Sơ Bài Đăng (Dành cho Manager)
- [ ] Manager nhận thông báo KOL "Submit for Review".
- [ ] Manager duyệt trạng thái Xác Thực: `Pending` -> `Approved` hoặc `Rejected` (Kèm lý do/ghi chú lỗi để KOL sửa lại).
- [ ] Tính năng Bật/Tắt Hiển Thị (Toggle Public) KOL lên trang chủ Public Booking.

---

## IV. MODULE ORDER & BOOKING (LUỒNG XỬ LÝ ĐƠN HÀNG)

### 1. Hàng Chờ & Sale Nhận Khách (Lead Pool & Claiming)
- [ ] Sale truy cập "Bể Khách" (Pool) nhìn thấy chung các form đăng ký vãng lai (`NEW_REQUEST`).
- [ ] Nhấn nút **Nhận Đơn/Nhận Tư Vấn (Claim)**: Hệ thống mở form yêu cầu Sale đính kèm chọn KOL phù hợp và báo giá cơ bản.
- [ ] Sale "Nhận độc quyền": Đơn sẽ thuộc về Sale đó và biến mất khỏi Bể Khách. Chờ Manager `Approve Claim`. 
- [ ] \**Bảo mật IDOR*: Cố tình mở Network/F12 đổi tham số `order_id` sang mã đơn mà Sale khác đang sở hữu. **Mong đợi:** Trả về lỗi 403 Forbidden.

### 2. Luồng Thiết lập Báo Giá Customize & Tạo Chiến Dịch Đa KOL
- [ ] **Khởi tạo Chiến Dịch (Campaign):** Manager/Sale gộp nhiều KOL thành một dự án booking (vd: Mega Campaign). Tham số: Campaign Name, Tổ hợp Combo Group.
- [ ] **Ẩn Đơn Hàng (Invisible Scope):** Suốt thời gian đơn ở trạng thái "Mới" (`INIT`) hoặc "Đã Cọc" (`DEPOSITED`), **KOL tuyệt đối không nhìn thấy công việc trong Dashboard của họ**.
- [ ] **Tùy chỉnh Bảng Giá:** Trong trang quản trị Chiến Dịch, Sale ấn nút `Edit` để tự gõ lại `Deposit Amount` (Tiền cọc) và `Total Amount` (Tổng thù lao) Tách Biệt Cho Từng KOL. Lưu trữ realtime chống double-click rác dữ liệu.

### 3. Vòng Đời Trạng Thái Booking (Order Lifecycle)
Luồng trạng thái phải đi lần lượt, bao gồm:
1. `new_request` / `pending_approval`: Lead từ form.
2. `init`: Mới (Khởi tạo, đang trong lò edit).
3. `deposited`: Kế toán ghi nhận Khách đã cọc tiền.
4. `running`: Bấm "Run / Launch".  Lúc này, KOL MỚI NHÌN THẤY ĐƠN VÀ THÙ LAO TỪNG TASK Ở DASHBOARD.
5. `pending_review`: KOL làm xong, nộp bài (Submit Proof). Cần duyệt nghiệm thu.
6. `completed`: Kế toán/Manager duyệt xong thành phẩm nghiệm thu. Kết thúc vòng đời.

### 4. Báo Cáo Công Việc Của KOL (Proof Of Work)
- [ ] KOL vào Đơn ở góc nhìn của mình -> Nộp Link Thành Phẩm (Video, Kênh) + Đính kèm hình ảnh/file chụp thông số View, Insight...
- [ ] Tính năng tải (Upload/Download) File Proof an toàn. Sale/Manager tải về File sạch.
- [ ] Sale tiến hành Review: Đánh giá Proof có đạt chuẩn không, duyệt hoặc bắt làm lại.

### 5. Tạo Hợp Đồng Tự Động (Contract Generation)
- [ ] Từ một Order hoặc Campaign, bấm **"Tạo Hợp Đồng (Generate Contract)"**.
- [ ] Hệ thống xuất ra bản **PDF Contract File**, tải xuống trình duyệt ngay lập tức thông qua Dữ liệu Order (Tên khách, SĐT, Kpi, Số tiền...).

### 6. Luồng Hủy và Hoàn Tiền (Cancel/Refund Workflow)
- [ ] **Yêu Cầu Hủy (Request Cancel/Refund):** Sale tạo request báo huỷ/Hoàn tiền với ghi chú chi tiết lý do. Order chuyển trạng thái sang `cancel_requested` hoặc `refund_requested`.
- [ ] **Quản Lý Bấm Duyệt (Approve Cancel/Refund):** Manager nhận thông báo, kiểm tra và ấn Xác Nhận. Đơn chuyển hẳn về `cancelled` hoặc `refunded`. 
- [ ] \**Check góc hẹp*: Lúc Order báo `refunded`, tài chính và thống kê báo cáo không được cộng dồn doanh thu của đơn này.

---

## V. MODULE TÀI CHÍNH & VÍ (PAYOUT & WALLET)

### 1. Số Dư Khả Dụng
- [ ] **Cộng tiền tự động:** Bất cứ khi nào Đơn Booking của KOL chuyển sang `COMPLETED`, phần `Total_Amount` được tự động cộng vào Ví Khả Dụng (Balance) của KOL trong hệ thống.
  
### 2. Yêu Cầu Rút Tiền (Withdrawal Flow)
- [ ] **Tạo Lệnh Rút:** KOL bấm nút rút, nhập Số tiền và Tài Khoản Ngân Hàng. 
- [ ] **Block Rút Quá Mức (Overdraw Validation):** Giả lập trên Postman: Nếu có 1.000.000đ nhưng gửi Api rút 2.000.000đ. **Mong đợi:** Chặn lệnh 400 Bad Request, báo không đủ số dư.
- [ ] Số dư của KOL sẽ "Bị trừ tạm tính (Frozen)" chờ kế toán giải ngân.
- [ ] **Kế Toán Duyệt Lệnh (Approve Payout):** Trạng thái `Pending` -> `Approved` (Ghi nhận đã ck tiền) hoặc `Rejected` (Hoàn tiền ngược lại vào ví ảo KOL). Cả 2 nhánh số dư đều phải chính xác.

---

## VI. BẢO MẬT & SETTINGS CHUNG (GLOBAL SECURITY & CONFIGURATION)

### 1. Giao Diện Settings (Tùy chỉnh Landing UI)
- [ ] Quản trị CMS cấu hình Slogan, banner, văn bản hiển thị Homepage mà không cần dev can thiệp vào mã nguồn (App Config Module).

### 2. Security Defense (Pentest Tiêu Chuẩn)
- [ ] **Bảo Mật File Máy Chủ (Chmod Flag):** Toàn bộ file Upload (Ảnh nền, Avatar, Evidence, Tệp Hợp đồng PDF) ở phía máy chủ đều bị tước quyền Thực Thi (Executable flag). Dev đã chặn. QA có thể thử tấn công RCE (Remote Code Execution) qua đường Upload.
- [ ] **SQL Injection Prevention:** Test điền Parameter tìm kiếm/Lọc tên Chiến Dịch/Khách chứa chuỗi SQL hiểm hóc `'; DROP TABLE users;--`. (ORM Backend đã sanitize, confirm test không rò rỉ hay lỗi Server).
- [ ] **Tàng Hình Lỗi Khung Nền (Global Exception Hiding):** Dùng công cụ phá Request gửi dữ liệu Data hỏng nát nhừ (vd: Payload Body String sai dạng JSON). Hệ thống bắt lỗi Validation hoặc 500 nhưng CHỈ QUY TRỌN VỀ MỘT CÂU THÔNG BÁO. Cấm tuyệt đối trình lướt Web để lộ dòng Tracktrace Python Code hoặc Postgres Database Structure.
