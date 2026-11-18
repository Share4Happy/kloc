# 📋 Quy chuẩn tạo file Changelog

## 1. Vị trí file

- Tạo file mới trong thư mục: `system_docs/changelog/`
- Tên file: `v{major}.{minor}.md` (VD: `v0.9.md`, `v1.0.md`)
- **KHÔNG** đặt tên file bắt đầu bằng `_` (sẽ bị hệ thống bỏ qua)

## 2. Frontmatter (bắt buộc)

Phần đầu file PHẢI có frontmatter với format YAML giữa 2 dòng `---`:

```yaml
---
version: "0.9"
date: "2026-04-06"
title: "Tên ngắn gọn của phiên bản"
---
```

### Quy tắc:

| Field | Kiểu | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| `version` | string | ✅ | Phiên bản theo dạng `"X.Y"` (VD: `"0.9"`, `"1.0"`) |
| `date` | string | ✅ | Ngày phát hành theo format `YYYY-MM-DD` |
| `title` | string | ✅ | Tên mô tả ngắn gọn tính năng chính của phiên bản |

### ⚠️ Lưu ý quan trọng:

- Giá trị string PHẢI đặt trong dấu ngoặc kép `"..."`
- `version` phải tăng dần so với phiên bản trước (dùng để sắp xếp)
- `date` phải là ngày hợp lệ (sẽ hiển thị tiếng Việt trên giao diện)

## 3. Cấu trúc nội dung (body)

Sau phần frontmatter, chia nội dung thành **3 section chính** (nếu có):

### 3.1. `## Tính năng mới`

Danh sách tính năng mới được thêm vào. Mỗi item:
- Bắt đầu bằng `- ` (dash + space)
- Viết hoa chữ cái đầu
- Kết thúc bằng dấu chấm `.`
- Mô tả ngắn gọn, rõ ràng

```markdown
## Tính năng mới

- **Tách biệt vai trò Sale và KOL Manager**: Sale tạo đơn, KOL Manager phân bổ KOL.
- **Xuất báo cáo nghiệm thu Excel**: 3 chế độ (Tổng quan, Chờ nghiệm thu, Đã hoàn thành).
```

### 3.2. `## Cải tiến`

Những tính năng cũ được nâng cấp, tối ưu lại.

```markdown
## Cải tiến

- **Upsale đơn hàng**: lưu lịch sử thay đổi, so sánh TRƯỚC/SAU trực quan.
- **Manager Portal** thêm cột "Minh chứng" để tải proof file/link.
```

### 3.3. `## Fix bug`

Những lỗi đã được sửa.

```markdown
## Fix bug

- Fix lỗi thông tin form Landing bị nhét hết vào ô KPI.
- Fix migration chain bị multiple heads.
```

## 4. Quy tắc viết nội dung

### ✅ NÊN:

| Quy tắc | Ví dụ |
|---------|-------|
| **Bôi tên tính năng** ở đầu dòng | `**Phân bổ nhiều KOL**: mô tả...` |
| Viết tiếng Việt có dấu | `Phân bổ`, `nghiệm thu` |
| Dùng code format cho tên field/API | `` `kol_booking_price` ``, `` `platform` `` |
| Mô tả ngắn gọn (1-2 dòng) | `Tự động clone order khi chọn nhiều KOL.` |
| Ghi rõ module/role bị ảnh hưởng | `**KOL Portal**: KOL chỉ thấy...` |

### ❌ KHÔNG:

| Sai | Đúng |
|-----|------|
| `sửa lỗi export` | **Fix bug**: Fix lỗi export báo cáo nghiệm thu Excel |
| `thêm api mới cho order` | **API endpoint mới**: `PATCH /orders/{id}/assign-kol` cho KOL Manager |
| Viết tắt không giải thích | Viết đầy đủ: `KOL Manager` (không viết `KOLMgr`) |
| Nội dung quá dài (>3 dòng/item) | Tách thành nhiều item ngắn hơn |

## 5. Ví dụ hoàn chỉnh

```markdown
---
version: "1.0"
date: "2026-05-01"
title: "Ra mắt hệ thống thanh toán tự động"
---

## Tính năng mới

- **Thanh toán tự động qua VNPay**: Tích hợp cổng thanh toán VNPay cho đơn hàng.
- **Webhook callback**: Tự động cập nhật trạng thái đơn khi nhận được thanh toán thành công.
- **API endpoint mới**: `POST /payments/vnpay-return` xử lý callback từ VNPay.

## Cải tiến

- **Gửi email tự động**: Khách hàng nhận email xác nhận thanh toán ngay sau khi giao dịch thành công.
- **Dashboard Sale**: Thêm card "Doanh thu hôm nay" để Sale theo dõi real-time.

## Fix bug

- Fix lỗi `integer out of range` khi nhập giá trị hợp đồng > 2 tỷ.
- Fix nút toggle password không hoạt động trên trang Login.
```

## 6. Quy trình thêm phiên bản mới

1. **Tạo file mới**: Copy `_TEMPLATE.md` → đổi tên thành `v{version}.md`
2. **Điền frontmatter**: `version`, `date`, `title`
3. **Viết nội dung**: Theo 3 section (Tính năng mới / Cải tiến / Fix bug)
4. **Commit & Push**: Đẩy lên repository
5. **Rebuild frontend**: Chạy `docker compose build frontend && docker compose up -d`
6. **Kiểm tra**: Vào `/portal/admin/system/changelog` → xác nhận hiển thị đúng

## 7. Version naming

- **Minor update** (fix bug, cải tiến nhỏ): Tăng `Y` → `v0.9` → `v0.10`
- **Major update** (tính năng lớn, thay đổi workflow): Tăng `X` → `v0.9` → `v1.0`
- **HOTFIX** (lỗi nghiêm trọng cần fix gấp): Thêm patch → `v0.9.1`

## 8. File đặc biệt

| File | Mục đích |
|------|----------|
| `_TEMPLATE.md` | Template rỗng để copy tạo phiên bản mới |
| `RULES.md` | File này - quy chuẩn tạo changelog |

**Các file bắt đầu bằng `_` sẽ KHÔNG được hệ thống đọc.**
