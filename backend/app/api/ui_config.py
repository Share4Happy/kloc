from typing import Any
import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.enums import UserRole
from app.models.ui_config import UIConfig
from app.schemas.ui_config import UIConfigResponse

router = APIRouter(prefix="/configs", tags=["UI Configuration"])
logger = logging.getLogger(__name__)
REVALIDATE_TIMEOUT_SECONDS = 3

DEFAULT_UI_CONFIGS = {
    # ── Hero Banner ─────────────────────────────────────────────────────────
    "show_banner": {"value": True, "desc": "Hiển thị Hero Banner (boolean)"},
    "hero_badge_text": {"value": "Khoi chay Nen tang KLOC v1.0", "desc": "Badge text cua Hero section (string)"},
    "hero_title": {"value": "Kết nối Brand và KOL dễ dàng", "desc": "Tiêu đề Hero section (string)"},
    "hero_subtitle": {"value": "Nền tảng booking hàng đầu Việt Nam. Tối ưu chi phí, minh bạch hiệu quả.", "desc": "Phụ đề Hero section (string)"},
    "hero_primary_button_label": {"value": "Khám phá KOL ngay", "desc": "Nhãn CTA chính ở Hero (string)"},
    "hero_secondary_button_label": {"value": "Tôi là KOL/KOC", "desc": "Nhãn CTA phụ ở Hero (string)"},
    # ── KOL Section ─────────────────────────────────────────────────────────
    "show_kol_section": {"value": True, "desc": "Hiển thị khu vực KOL Nổi Bật (boolean)"},
    "kol_section_title": {"value": "KOL Nổi Bật", "desc": "Tiêu đề section KOL (string)"},
    "kol_section_subtitle": {"value": "Những gương mặt sáng giá nhất trên hệ thống KLOC", "desc": "Mô tả section KOL (string)"},
    # ── Booking CTA ─────────────────────────────────────────────────────────
    "show_booking_cta": {"value": True, "desc": "Hiển thị khối Booking CTA (boolean)"},
    "booking_cta_title": {"value": "Bạn đã nhắm được KOL phù hợp?", "desc": "Tiêu đề CTA section (string)"},
    "booking_cta_subtitle": {"value": "Gửi ngay số liệu chiến dịch, chúng tôi sẽ setup cuộc hẹn và chốt hợp đồng trong chớp mắt.", "desc": "Nội dung giới thiệu CTA (string)"},
    "booking_cta_button_label": {"value": "Gửi yêu cầu", "desc": "Nhãn nút CTA (string)"},
    "booking_cta_point_1": {"value": "Hợp đồng pháp lý minh bạch", "desc": "Điểm nổi bật số 1 của Booking CTA (string)"},
    "booking_cta_point_2": {"value": "Chi phí rõ ràng, không phụ phí ẩn", "desc": "Điểm nổi bật số 2 của Booking CTA (string)"},
    "booking_cta_point_3": {"value": "Cam kết KPI hiệu suất chiến dịch", "desc": "Điểm nổi bật số 3 của Booking CTA (string)"},
    # ── Company Profile / About ─────────────────────────────────────────────
    "about_page_title": {"value": "Về Chúng Tôi", "desc": "Tiêu đề trang About (string)"},
    "about_page_subtitle": {"value": "KLOC - Nền tảng Booking KOL/KOC chuyên nghiệp, minh bạch và hiệu quả nhất Việt Nam. Chúng tôi tin rằng mọi chiến dịch Marketing đều xứng đáng với những gương mặt xuất sắc nhất.", "desc": "Mô tả mở đầu trang About (string)"},
    "about_value_1_title": {"value": "Minh bạch tuyệt đối", "desc": "Tiêu đề value card 1 ở About page (string)"},
    "about_value_1_desc": {"value": "Mọi quy trình từ báo giá, xét duyệt hợp đồng đến nghiệm thu KPIs đều được quản lý chặt chẽ. Khách hàng luôn biết chính xác nguồn tiền của mình đang được tối ưu như thế nào.", "desc": "Nội dung value card 1 ở About page (string)"},
    "about_value_2_title": {"value": "Tốc độ chớp nhoáng", "desc": "Tiêu đề value card 2 ở About page (string)"},
    "about_value_2_desc": {"value": "Hợp đồng điện tử ký duyệt trong 1 click. Đội ngũ Sale tinh nhuệ luôn trực sẵn cùng bộ công cụ lọc thông minh giúp tìm đúng KOL chỉ trong chưa đầy 30 phút.", "desc": "Nội dung value card 2 ở About page (string)"},
    "about_value_3_title": {"value": "Đúng Niche, Đúng Target", "desc": "Tiêu đề value card 3 ở About page (string)"},
    "about_value_3_desc": {"value": "Với tệp Data sâu rộng, KLOC không chỉ book KOL theo danh tiếng mà còn dựa trên mức độ phù hợp bối cảnh, insight người xem và khả năng chuyển đổi thực tế.", "desc": "Nội dung value card 3 ở About page (string)"},
    "about_value_4_title": {"value": "Đồng hành sát sao", "desc": "Tiêu đề value card 4 ở About page (string)"},
    "about_value_4_desc": {"value": "Trạm quản lý riêng biệt cho Manager và KOL đảm bảo không một báo cáo nào bị bỏ sót hay sai lệch so với điều khoản nghiệm thu ban đầu.", "desc": "Nội dung value card 4 ở About page (string)"},
    "show_about_stats": {"value": True, "desc": "Hiển thị khối social proof / metrics ở About page (boolean)"},
    "about_stat_1_value": {"value": "300+", "desc": "Giá trị social proof 1 ở About page (string)"},
    "about_stat_1_label": {"value": "Chiến dịch đã khởi chạy", "desc": "Nhãn social proof 1 ở About page (string)"},
    "about_stat_2_value": {"value": "120+", "desc": "Giá trị social proof 2 ở About page (string)"},
    "about_stat_2_label": {"value": "Nhãn hàng đồng hành", "desc": "Nhãn social proof 2 ở About page (string)"},
    "about_stat_3_value": {"value": "1.000+", "desc": "Giá trị social proof 3 ở About page (string)"},
    "about_stat_3_label": {"value": "KOL/KOC trong hệ sinh thái", "desc": "Nhãn social proof 3 ở About page (string)"},
    "about_cta_title": {"value": "Bạn đã sẵn sàng khởi chạy chiến dịch?", "desc": "Tiêu đề CTA cuối trang About (string)"},
    "about_cta_subtitle": {"value": "Hàng trăm nhãn hàng đã tin tưởng lựa chọn KLOC để mở rộng quy mô. Hãy để chúng tôi đồng hành cùng sự đột phá của bạn.", "desc": "Mô tả CTA cuối trang About (string)"},
    "about_cta_primary_label": {"value": "Book Lịch Tư Vấn", "desc": "Nhãn CTA chính cuối trang About (string)"},
    "about_cta_secondary_label": {"value": "Tôi là KOL/KOC", "desc": "Nhãn CTA phụ cuối trang About (string)"},
    # ── Navigation Labels ────────────────────────────────────────────────────
    "nav_kols_label": {"value": "Khám phá KOL", "desc": "Nhãn mục KOL trên thanh điều hướng (string)"},
    "nav_about_label": {"value": "Về chúng tôi", "desc": "Nhãn mục Giới thiệu trên thanh điều hướng (string)"},
    "nav_contact_label": {"value": "Liên hệ", "desc": "Nhãn mục Liên hệ trên thanh điều hướng (string)"},
    # ── Contact Page ─────────────────────────────────────────────────────────
    "contact_page_title": {"value": "Kết nối với\nĐội ngũ KLOC", "desc": "Tiêu đề chính trang Contact (string)"},
    "contact_page_subtitle": {"value": "Bạn cần tư vấn giải pháp Booking KOL tổng thể, hay đang gặp khó khăn trong quá trình đăng ký trở thành đối tác? Đừng ngần ngại để lại lời nhắn.", "desc": "Mô tả mở đầu trang Contact (string)"},
    "contact_form_title": {"value": "Gửi yêu cầu trực tuyến", "desc": "Tiêu đề form ở trang Contact (string)"},
    "contact_success_message": {"value": "Cảm ơn bạn đã liên hệ. Đội ngũ KLOC sẽ phản hồi vào hòm thư của bạn trong vòng 24 giờ tới.", "desc": "Thông điệp thành công ở trang Contact (string)"},
    "contact_partner_email": {"value": "partners@kloc.vn", "desc": "Email dành cho đối tác / KOL ở trang Contact (string)"},
    "contact_hotline_secondary": {"value": "0987 654 321 (Zalo doanh nghiệp)", "desc": "Hotline phụ / Zalo ở trang Contact (string)"},
    # ── Footer & Contact ─────────────────────────────────────────────────────
    "contact_email": {"value": "contact@kloc.vn", "desc": "Email liên hệ dưới Footer (string)"},
    "contact_phone": {"value": "", "desc": "Số điện thoại liên hệ (string)"},
    "contact_address": {"value": "", "desc": "Địa chỉ công ty (string)"},
    "footer_facebook_url": {"value": "", "desc": "URL trang Facebook (string)"},
    "footer_tiktok_url": {"value": "", "desc": "URL trang TikTok (string)"},
    "footer_copyright": {"value": "© 2026 KLOCPlatform. All rights reserved.", "desc": "Văn bản Copyright Footer (string)"},
}


def _trigger_frontend_revalidate(paths: list[str] | None = None) -> None:
    """Best-effort ISR invalidation on frontend after UI config changes."""
    revalidate_url = os.getenv("FRONTEND_REVALIDATE_URL", "").strip()
    if not revalidate_url:
        return

    secret = os.getenv("REVALIDATE_SECRET", "kloc-revalidate-secret").strip()
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["x-revalidate-secret"] = secret

    payload = {"paths": paths or ["/", "/kols", "/about", "/contact", "/privacy"]}
    request = Request(
        url=revalidate_url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with urlopen(request, timeout=REVALIDATE_TIMEOUT_SECONDS) as response:
            if response.status >= 400:
                logger.warning(
                    "Frontend revalidate returned non-success status: %s",
                    response.status,
                )
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        logger.warning("Failed to trigger frontend revalidate: %s", exc)


def seed_default_configs_if_empty(db: Session):
    """Seed / backfill mặc định: chèn các key bị thiếu vào bảng ui_configs."""
    existing_keys = {
        row.key
        for row in db.scalars(select(UIConfig)).all()
    }
    missing = {
        key: meta
        for key, meta in DEFAULT_UI_CONFIGS.items()
        if key not in existing_keys
    }
    if missing:
        for key, meta in missing.items():
            db.add(UIConfig(key=key, value=meta["value"], description=meta["desc"]))
        db.commit()

@router.get(
    "",
    summary="Lấy toàn bộ cấu hình giao diện (Public)",
    response_model=dict[str, Any],
)
def get_ui_configs(db: Session = Depends(get_db)):
    """
    Public API: Gọi lấy tất cả cấu hình UI.
    Tự động seed các key mặc định nếu database trống.
    Trả về định dạng siêu gọn: { "key": value, ... }
    """
    seed_default_configs_if_empty(db)
    
    configs = db.scalars(select(UIConfig)).all()
    
    # Return a direct key-value mapping for the frontend to consume easily
    return {c.key: c.value for c in configs}


@router.patch(
    "",
    summary="Cập nhật cấu hình giao diện UI (Chỉ Admin)",
    response_model=dict[str, Any],
)
def update_ui_configs(
    body: dict[str, Any],
    # User object isn't strictly needed for operations, just authorization
    _=Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """
    (Admin) Chỉnh sửa cấu hình giao diện, ví dụ bật/tắt banner, đổi chữ.
    Payload: {"show_banner": false, "hero_title": "Hello"}
    Chỉ cập nhật những key hiện hữu trong payload.
    """
    seed_default_configs_if_empty(db)
    
    updated_keys = list(body.keys())
    
    # Fetch existing configs that are being updated
    existing_configs = db.scalars(
        select(UIConfig).where(UIConfig.key.in_(updated_keys))
    ).all()
    
    existing_map = {c.key: c for c in existing_configs}

    for key, value in body.items():
        if key in existing_map:
            existing_map[key].value = value
        else:
            # Optionally create new dynamic keys by Admin on the fly
            new_config = UIConfig(key=key, value=value, description="Custom key (Auto-created)")
            db.add(new_config)
            
    db.commit()
    _trigger_frontend_revalidate()

    # Re-fetch everything and return the new state
    all_configs = db.scalars(select(UIConfig)).all()
    return {c.key: c.value for c in all_configs}
