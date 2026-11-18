import uuid
import mimetypes
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request as URLRequest, urlopen
from fastapi import Request

import filetype
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from app.core.limiter import limiter
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.enums import UserRole, VerificationStatus
from app.models.kol_profile import KOLProfile
from app.models.user import User
from app.api.notification import create_notification, broadcast_notification
from app.schemas.kol import (
    CheckLinksRequest,
    EvidenceAttachmentResponse,
    KOLOnboardingRequest,
    KOLProfileResponse,
    SocialCheckResult,
    ToggleVisibilityRequest,
    VerifyProfileRequest,
)
from app.services.social_verifier import verify_social_links

router = APIRouter(prefix="/kol", tags=["KOL Management"])
logger = logging.getLogger(__name__)

ONBOARDING_REQUIRED_CHECKLIST_ITEMS = {
    "profile_info_confirmed",
    "social_links_owned",
    "evidence_uploaded",
}

ONBOARDING_REQUIRED_CHECKLIST_ITEM_LABELS: dict[str, str] = {
    "profile_info_confirmed": "Xác nhận thông tin hồ sơ",
    "social_links_owned": "Xác nhận quyền sở hữu liên kết social",
    "evidence_uploaded": "Tải lên minh chứng",
}

EVIDENCE_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "kol_evidence"
AVATAR_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "kol_avatar"
ALLOWED_EVIDENCE_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_AVATAR_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
}
MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024  # 5MB
REVALIDATE_TIMEOUT_SECONDS = 3


def _build_default_profile(user_id: uuid.UUID) -> KOLProfile:
    """Create a profile object with explicit defaults for cross-env safety."""
    return KOLProfile(
        user_id=user_id,
        followers=0,
        engagement_rate=0.0,
        social_links={},
        is_public=False,
        checklist_items=[],
        evidence_attachments=[],
        verification_status=VerificationStatus.PENDING,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Helper
# ═══════════════════════════════════════════════════════════════════════════
def _get_profile_or_404(db: Session, user_id: uuid.UUID) -> KOLProfile:
    profile = db.query(KOLProfile).filter(KOLProfile.user_id == user_id).first()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KOL profile không tồn tại.",
        )
    return profile


def _get_profile_by_id_or_404(db: Session, profile_id: uuid.UUID) -> KOLProfile:
    profile = db.query(KOLProfile).filter(KOLProfile.id == profile_id).first()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KOL profile không tồn tại.",
        )
    return profile


def _save_evidence_file(profile_id: uuid.UUID, evidence_file: UploadFile) -> dict:
    """Save a KOL evidence file locally and return attachment metadata."""
    EVIDENCE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    original_name = evidence_file.filename or "evidence-file"
    storage_name = f"{profile_id}_{uuid.uuid4().hex}{Path(original_name).suffix}"
    output_path = EVIDENCE_UPLOAD_DIR / storage_name

    total_size = 0
    with output_path.open("wb") as out:
        is_first_chunk = True
        while True:
            chunk = evidence_file.file.read(1024 * 1024)
            if not chunk:
                break
            
            if is_first_chunk:
                is_first_chunk = False
                kind = filetype.guess(chunk)
                if kind is None or kind.mime not in ALLOWED_EVIDENCE_MIME_TYPES:
                    out.close()
                    output_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="Tep tin khong hop le hoac bi tu choi do ly do bao mat.",
                    )

            total_size += len(chunk)
            if total_size > MAX_EVIDENCE_FILE_SIZE:
                out.close()
                output_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Tep minh chung vuot qua gioi han 10MB.",
                )
            out.write(chunk)
            
    # Xoa quyen Unix executable chong Command Injection (chi cap quyen rw-r--r--)
    try:
        os.chmod(output_path, 0o644)
    except Exception as e:
        logger.warning(f"Could not change permissions for {output_path}: {e}")

    return {
        "attachment_id": str(uuid.uuid4()),
        "file_name": original_name,
        "mime_type": evidence_file.content_type or "application/octet-stream",
        "size": total_size,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "stored_path": str(output_path),
    }


def _save_avatar_file(profile_id: uuid.UUID, avatar_file: UploadFile) -> str:
    """Save KOL avatar image locally and return absolute stored path."""
    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    original_name = avatar_file.filename or "avatar-image"
    extension = Path(original_name).suffix or ".jpg"
    storage_name = f"{profile_id}_{uuid.uuid4().hex}{extension}"
    output_path = AVATAR_UPLOAD_DIR / storage_name

    total_size = 0
    with output_path.open("wb") as out:
        is_first_chunk = True
        while True:
            chunk = avatar_file.file.read(1024 * 1024)
            if not chunk:
                break

            if is_first_chunk:
                is_first_chunk = False
                kind = filetype.guess(chunk)
                if kind is None or kind.mime not in ALLOWED_AVATAR_MIME_TYPES:
                    out.close()
                    output_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="Anh dai dien khong hop le hoac bi tu choi do ly do bao mat.",
                    )

            total_size += len(chunk)
            if total_size > MAX_AVATAR_FILE_SIZE:
                out.close()
                output_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Anh dai dien vuot qua gioi han 5MB.",
                )
            out.write(chunk)

    try:
        os.chmod(output_path, 0o644)
    except Exception as e:
        logger.warning(f"Could not change permissions for {output_path}: {e}")

    return str(output_path)


def _cleanup_stored_file(stored_path: str | None) -> None:
    if not stored_path:
        return
    Path(stored_path).unlink(missing_ok=True)


def _resolve_media_type(file_path: Path) -> str:
    media_type, _ = mimetypes.guess_type(file_path.name)
    return media_type or "application/octet-stream"


def _trigger_frontend_revalidate() -> None:
    """Best-effort ISR invalidation on frontend after public KOL changes."""
    revalidate_url = os.getenv("FRONTEND_REVALIDATE_URL", "").strip()
    if not revalidate_url:
        return

    secret = os.getenv("REVALIDATE_SECRET", "kloc-revalidate-secret").strip()
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["x-revalidate-secret"] = secret

    request = URLRequest(
        url=revalidate_url,
        data=json.dumps({}).encode("utf-8"),
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


def _get_evidence_attachment_or_404(profile: KOLProfile, attachment_id: str) -> dict:
    attachments = profile.evidence_attachments or []
    for attachment in attachments:
        if attachment.get("attachment_id") == attachment_id:
            return attachment

    raise HTTPException(status_code=404, detail="Khong tim thay tep minh chung.")


def _build_followers_consistency_result(
    verification_results: list[SocialCheckResult],
    declared_followers: int,
) -> SocialCheckResult:
    detected_counts = [result.follower_count for result in verification_results if result.follower_count is not None]
    checked_at = datetime.now(timezone.utc)

    if declared_followers <= 0:
        return SocialCheckResult(
            platform="followers",
            url="-",
            is_valid=False,
            message="Số followers khai báo chưa hợp lệ (phải lớn hơn 0).",
            ownership_status="mismatch",
            confidence_score=0,
            follower_count=declared_followers,
            follower_source="declared_profile",
            checked_at=checked_at,
        )

    if not detected_counts:
        return SocialCheckResult(
            platform="followers",
            url="-",
            is_valid=False,
            message="Chưa trích xuất được follower realtime từ các nền tảng công khai để đối chiếu.",
            ownership_status="unverified",
            confidence_score=25,
            follower_count=declared_followers,
            follower_source="declared_profile",
            checked_at=checked_at,
        )

    detected_followers = max(detected_counts)
    delta_ratio = abs(detected_followers - declared_followers) / max(detected_followers, declared_followers, 1)

    if delta_ratio <= 0.2:
        return SocialCheckResult(
            platform="followers",
            url="-",
            is_valid=True,
            message=f"Followers khai báo ({declared_followers:,}) khớp tốt với dữ liệu công khai (~{detected_followers:,}).".replace(",", "."),
            ownership_status="verified",
            confidence_score=90,
            follower_count=detected_followers,
            follower_source="public_platform_estimate",
            checked_at=checked_at,
        )

    if delta_ratio <= 0.5:
        return SocialCheckResult(
            platform="followers",
            url="-",
            is_valid=True,
            message=f"Followers khai báo ({declared_followers:,}) gần với dữ liệu công khai (~{detected_followers:,}), cần rà soát thêm.".replace(",", "."),
            ownership_status="likely_owned",
            confidence_score=65,
            follower_count=detected_followers,
            follower_source="public_platform_estimate",
            checked_at=checked_at,
        )

    return SocialCheckResult(
        platform="followers",
        url="-",
        is_valid=False,
        message=f"Followers khai báo ({declared_followers:,}) lệch đáng kể so với dữ liệu công khai (~{detected_followers:,}).".replace(",", "."),
        ownership_status="mismatch",
        confidence_score=35,
        follower_count=detected_followers,
        follower_source="public_platform_estimate",
        checked_at=checked_at,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 1) ONBOARDING — KOL updates own profile
# ═══════════════════════════════════════════════════════════════════════════

@router.put(
    "/profile",
    response_model=KOLProfileResponse,
    summary="KOL cập nhật profile (Onboarding)",
)
def update_own_profile(
    body: KOLOnboardingRequest,
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """KOL cập nhật thông tin cá nhân: followers, engagement_rate, social_links, bio.

    Nếu chưa có profile, hệ thống sẽ tự tạo mới.
    Mỗi lần cập nhật social_links, verification_status reset về `pending`.
    """
    profile = db.query(KOLProfile).filter(KOLProfile.user_id == current_user.id).first()

    # Auto-create profile if missing
    if profile is None:
        profile = _build_default_profile(current_user.id)
        db.add(profile)

    # Apply partial updates
    update_data = body.model_dump(exclude_unset=True, exclude={"submit_for_review"})
    for field, value in update_data.items():
        setattr(profile, field, value)

    effective_checklist_items = set(update_data.get("checklist_items") or profile.checklist_items or [])
    effective_evidence_attachments = profile.evidence_attachments or []

    if "checklist_items" in update_data:
        profile.checklist_confirmed_at = datetime.now(timezone.utc) if effective_checklist_items else None

    if body.submit_for_review:
        missing_items = sorted(ONBOARDING_REQUIRED_CHECKLIST_ITEMS - effective_checklist_items)
        if missing_items:
            missing_labels = [
                ONBOARDING_REQUIRED_CHECKLIST_ITEM_LABELS.get(item, item)
                for item in missing_items
            ]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vui lòng hoàn thành checklist trước khi gửi duyệt: {', '.join(missing_labels)}.",
            )

        if not effective_evidence_attachments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng tải lên ít nhất một minh chứng trước khi gửi duyệt.",
            )

        # Khi KOL bấm "Gửi duyệt" → LUÔN reset về PENDING để Manager duyệt lại
        profile.checklist_confirmed_at = datetime.now(timezone.utc)
        profile.verification_status = VerificationStatus.PENDING
        profile.verification_notes = None

        db.flush()

        # N-M04/N-KM02: Notify KOL Manager/Admin about new profile submission
        kol_manager_admin_ids = db.scalars(
            select(User.id).where(
                User.role.in_([UserRole.KOL_MANAGER, UserRole.MANAGER, UserRole.ADMIN]),
                User.is_active == True
            )
        ).all()
        if kol_manager_admin_ids:
            broadcast_notification(
                db, list(kol_manager_admin_ids),
                title="Có hồ sơ KOL cần duyệt",
                message=f"KOL {current_user.full_name} vừa gửi hồ sơ duyệt. Cần kiểm tra và phê duyệt.",
                type="action_required",
                ref_type="kol_profile", ref_id=profile.id,
                data_json={"kol_name": current_user.full_name, "kol_id": str(current_user.id)},
            )
        db.commit()
    else:
        try:
            db.commit()
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Failed to update KOL profile", extra={"user_id": str(current_user.id)})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Khong the cap nhat profile: {exc.__class__.__name__}",
            )

    db.refresh(profile)
    return profile


@router.post(
    "/profile/evidence",
    response_model=list[EvidenceAttachmentResponse],
    summary="KOL tai len tep minh chung onboarding",
)
@limiter.limit("10/minute")
def upload_onboarding_evidence(
    request: Request,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """KOL tai len mot hoac nhieu tep minh chung de bo sung cho ho so onboarding."""
    if not files:
        raise HTTPException(status_code=400, detail="Chua co tep minh chung nao duoc chon.")

    profile = db.query(KOLProfile).filter(KOLProfile.user_id == current_user.id).first()
    if profile is None:
        profile = _build_default_profile(current_user.id)
        db.add(profile)

    attachments = list(profile.evidence_attachments or [])

    for evidence_file in files:
        if evidence_file.content_type and evidence_file.content_type not in ALLOWED_EVIDENCE_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"Dinh dang tep khong duoc ho tro: {evidence_file.filename}")
        attachments.append(_save_evidence_file(profile.user_id, evidence_file))

    profile.evidence_attachments = attachments
    db.commit()
    db.refresh(profile)
    return profile.evidence_attachments or []


@router.post(
    "/profile/avatar",
    response_model=KOLProfileResponse,
    summary="KOL tai len anh dai dien",
)
@limiter.limit("5/minute")
def upload_profile_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """KOL tai len avatar de hien thi tren landing page."""
    if file.content_type and file.content_type not in ALLOWED_AVATAR_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Chi ho tro anh PNG, JPG hoac WEBP.")

    profile = db.query(KOLProfile).filter(KOLProfile.user_id == current_user.id).first()
    if profile is None:
        profile = _build_default_profile(current_user.id)
        db.add(profile)

    previous_avatar_path = profile.avatar_path
    profile.avatar_path = _save_avatar_file(profile.user_id, file)

    if previous_avatar_path and previous_avatar_path != profile.avatar_path:
        _cleanup_stored_file(previous_avatar_path)

    db.commit()
    db.refresh(profile)
    return profile


# ═══════════════════════════════════════════════════════════════════════════
# 2a) VERIFICATION — auto-check social links
# ═══════════════════════════════════════════════════════════════════════════

@router.post(
    "/profile/verify-links",
    response_model=list[SocialCheckResult],
    summary="Kiểm tra tự động social links (KOL tự chạy)",
)
def auto_verify_social_links(
    request_data: CheckLinksRequest | None = None,
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """KOL chạy kiểm tra tự động các social links đã đăng ký.

    Đây là bước 1 trong quy trình verification.
    Kết quả chỉ mang tính tham khảo — duyệt cuối cùng do KOL_Manager thực hiện.
    """
    profile = _get_profile_or_404(db, current_user.id)
    links_to_check = request_data.social_links if request_data and request_data.social_links is not None else profile.social_links
    followers_to_check = request_data.followers if request_data and request_data.followers is not None else profile.followers

    results = verify_social_links(links_to_check)
    results.append(_build_followers_consistency_result(results, followers_to_check))
    return results


# ═══════════════════════════════════════════════════════════════════════════
# 2b) VERIFICATION — KOL_Manager manual review
# ═══════════════════════════════════════════════════════════════════════════

@router.patch(
    "/{profile_id}/verify",
    response_model=KOLProfileResponse,
    summary="Duyệt/Từ chối KOL profile (KOL_Manager / Admin)",
)
def verify_profile(
    profile_id: uuid.UUID,
    body: VerifyProfileRequest,
    current_user: User = Depends(require_roles(UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """KOL_Manager hoặc Admin duyệt (approved) hoặc từ chối (rejected) profile KOL.

    Đây là bước 2 trong quy trình verification (manual).
    """
    profile = _get_profile_by_id_or_404(db, profile_id)

    profile.verification_status = body.status
    profile.verification_notes = body.notes

    db.commit()

    # N-K02/K03: Notify KOL about verification result
    status_labels = {
        VerificationStatus.APPROVED: "đã được duyệt",
        VerificationStatus.REJECTED: "bị từ chối",
    }
    type_map = {
        VerificationStatus.APPROVED: "success",
        VerificationStatus.REJECTED: "warning",
    }
    title_map = {
        VerificationStatus.APPROVED: "Hồ sơ KOL của bạn đã được duyệt ✅",
        VerificationStatus.REJECTED: "Hồ sơ KOL của bạn cần chỉnh sửa lại ⚠️",
    }
    message_map = {
        VerificationStatus.APPROVED: "Chúc mừng! Hồ sơ của bạn đã được duyệt và sẽ được hiển thị trên Landing Page.",
        VerificationStatus.REJECTED: f"Hồ sơ của bạn bị từ chối. Lý do: {body.notes or 'Không đạt yêu cầu'}. Vui lòng cập nhật và gửi lại.",
    }

    create_notification(
        db, profile.user_id,
        title=title_map.get(body.status, "Cập nhật hồ sơ"),
        message=message_map.get(body.status, f"Hồ sơ của bạn đã chuyển sang trạng thái '{body.status.value}'."),
        type=type_map.get(body.status, "info"),
        ref_type="kol_profile", ref_id=profile_id,
        data_json={"kol_name": profile.user.full_name if profile.user else ""},
    )
    db.commit()

    db.refresh(profile)
    _trigger_frontend_revalidate()
    return profile


# ═══════════════════════════════════════════════════════════════════════════
# 3) PUBLIC VISIBILITY — toggle is_public
# ═══════════════════════════════════════════════════════════════════════════

@router.patch(
    "/{profile_id}/visibility",
    response_model=KOLProfileResponse,
    summary="Bật/Tắt hiển thị KOL trên Landing Page",
)
def toggle_visibility(
    profile_id: uuid.UUID,
    body: ToggleVisibilityRequest,
    current_user: User = Depends(require_roles(UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """KOL_Manager hoặc Admin bật/tắt hiển thị profile KOL trên Landing Page.

    Chỉ profile đã `approved` mới nên được bật `is_public = true`.
    """
    profile = _get_profile_by_id_or_404(db, profile_id)

    if body.is_public and profile.verification_status != VerificationStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể bật is_public cho profile đã được duyệt (APPROVED).",
        )

    profile.is_public = body.is_public

    db.commit()
    db.refresh(profile)
    _trigger_frontend_revalidate()
    return profile


@router.get(
    "/filters",
    response_model=list[KOLProfileResponse],
    summary="[Internal] Smart Filter tìm kiếm KOL",
)
def smart_filter_kols(
    niche: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    platform: str | None = None,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALE, UserRole.KOL_MANAGER)
    ),
    db: Session = Depends(get_db),
):
    """(Nội bộ) Lọc KOL theo ngách, khoảng giá, và nền tảng.
    
    Chỉ trả về các KOL đã được duyệt (APPROVED) và is_public=True.
    """
    stmt = select(KOLProfile).options(selectinload(KOLProfile.user)).where(
        KOLProfile.verification_status == VerificationStatus.APPROVED,
        KOLProfile.is_public == True,
    )

    if niche:
        normalized_niche = niche.strip()
        if normalized_niche:
            stmt = stmt.where(KOLProfile.niche.contains([normalized_niche]))

    if min_price is not None:
        stmt = stmt.where(KOLProfile.min_price >= min_price)

    if max_price is not None:
        stmt = stmt.where(KOLProfile.max_price <= max_price)

    if platform:
        # Search if the platform key exists in the social_links JSONB dict
        stmt = stmt.where(KOLProfile.social_links.has_key(platform))

    profiles = db.scalars(stmt).all()
    return list(profiles)


# ═══════════════════════════════════════════════════════════════════════════
# 5) LIST ALL PROFILES — for KOL_Manager / Admin
# ═══════════════════════════════════════════════════════════════════════════

@router.get(
    "/profiles",
    response_model=list[KOLProfileResponse],
    summary="Lấy danh sách tất cả KOL profiles (KOL_Manager / Admin / Sale)",
)
def list_kol_profiles(
    status_filter: VerificationStatus | None = None,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER, UserRole.SALE)
    ),
    db: Session = Depends(get_db),
):
    """Trả về danh sách KOL profiles.

    - Admin / Manager / KOL_Manager: toàn bộ, có thể lọc theo status.
    - Sale: chỉ nhận KOL đã được duyệt (approved) và công khai (is_public),
      bất kể status_filter truyền vào.
    """
    if current_user.role == UserRole.SALE:
        stmt = select(KOLProfile).options(selectinload(KOLProfile.user)).where(
            KOLProfile.verification_status == VerificationStatus.APPROVED,
            KOLProfile.is_public == True,  # noqa: E712
        )
    else:
        stmt = select(KOLProfile).options(selectinload(KOLProfile.user))
        if status_filter is not None:
            stmt = stmt.where(KOLProfile.verification_status == status_filter)

    profiles = db.scalars(stmt).all()
    return list(profiles)


@router.get(
    "/profiles/{profile_id}",
    response_model=KOLProfileResponse,
    summary="Xem chi tiết một KOL profile (KOL_Manager / Admin)",
)
def get_kol_profile_detail(
    profile_id: uuid.UUID,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER)
    ),
    db: Session = Depends(get_db),
):
    """Trả về chi tiết một KOL profile theo profile ID (dành cho manager duyệt)."""
    return _get_profile_by_id_or_404(db, profile_id)


@router.get(
    "/profiles/{profile_id}/evidence/{attachment_id}",
    summary="Tai tep minh chung cua KOL profile",
)
def download_profile_evidence(
    profile_id: uuid.UUID,
    attachment_id: str,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER)
    ),
    db: Session = Depends(get_db),
):
    """Internal roles tai tep minh chung cua KOL de phuc vu duyet ho so."""
    profile = _get_profile_by_id_or_404(db, profile_id)
    attachment = _get_evidence_attachment_or_404(profile, attachment_id)
    file_path = Path(attachment["stored_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Khong tim thay tep minh chung tren he thong.")

    return FileResponse(
        path=str(file_path),
        filename=attachment.get("file_name") or file_path.name,
        media_type=attachment.get("mime_type") or "application/octet-stream",
    )


@router.post(
    "/profiles/{profile_id}/check-links",
    response_model=list[SocialCheckResult],
    summary="Manager kiểm tra social links của một KOL profile",
)
def manager_check_links(
    profile_id: uuid.UUID,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.KOL_MANAGER)
    ),
    db: Session = Depends(get_db),
):
    """KOL_Manager/Admin chạy kiểm tra tự động social links của một KOL profile."""
    profile = _get_profile_by_id_or_404(db, profile_id)
    results = verify_social_links(profile.social_links)
    results.append(_build_followers_consistency_result(results, profile.followers))
    return results


@router.get(
    "/public/profiles",
    response_model=list[KOLProfileResponse],
    summary="Public: Danh sách KOL profiles đang hiển thị",
)
def list_public_kol_profiles(
    db: Session = Depends(get_db),
):
    """Public API: trả về các KOL đã duyệt và bật hiển thị."""
    stmt = select(KOLProfile).options(selectinload(KOLProfile.user)).where(
        KOLProfile.verification_status == VerificationStatus.APPROVED,
        KOLProfile.is_public == True,
    )
    profiles = db.scalars(stmt).all()
    return list(profiles)


@router.get(
    "/profile",
    response_model=KOLProfileResponse,
    summary="Xem profile của KOL hiện tại",
)
def get_own_profile(
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """KOL xem profile của chính mình.

    Tự tạo profile trống nếu đây là lần đầu user truy cập sau khi đăng ký.
    """
    profile = db.query(KOLProfile).filter(KOLProfile.user_id == current_user.id).first()
    if profile is None:
        profile = _build_default_profile(current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get(
    "/profile/evidence/{attachment_id}",
    summary="KOL tai tep minh chung cua minh",
)
def download_own_evidence(
    attachment_id: str,
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    """KOL tai lai tep minh chung da tai len."""
    profile = _get_profile_or_404(db, current_user.id)
    attachment = _get_evidence_attachment_or_404(profile, attachment_id)
    file_path = Path(attachment["stored_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Khong tim thay tep minh chung tren he thong.")

    return FileResponse(
        path=str(file_path),
        filename=attachment.get("file_name") or file_path.name,
        media_type=attachment.get("mime_type") or "application/octet-stream",
    )


@router.get(
    "/profile/avatar",
    summary="KOL xem anh dai dien cua minh",
)
def download_own_avatar(
    current_user: User = Depends(require_roles(UserRole.KOL)),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(db, current_user.id)
    if not profile.avatar_path:
        raise HTTPException(status_code=404, detail="KOL chua tai len anh dai dien.")

    file_path = Path(profile.avatar_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Khong tim thay anh dai dien tren he thong.")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type=_resolve_media_type(file_path),
        headers={"Cache-Control": "no-store"},
    )


@router.get(
    "/{user_id}/avatar",
    summary="Public avatar cua KOL dang cong khai",
)
def get_public_kol_avatar(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    profile = db.scalar(
        select(KOLProfile).where(
            KOLProfile.user_id == user_id,
            KOLProfile.verification_status == VerificationStatus.APPROVED,
            KOLProfile.is_public == True,
        )
    )
    if not profile or not profile.avatar_path:
        raise HTTPException(status_code=404, detail="KOL chua co anh dai dien cong khai.")

    file_path = Path(profile.avatar_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Khong tim thay anh dai dien tren he thong.")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type=_resolve_media_type(file_path),
        headers={"Cache-Control": "no-store"},
    )


@router.get(
    "/{user_id}",
    response_model=KOLProfileResponse,
    summary="Lấy chi tiết profile KOL bằng user_id",
)
def get_single_kol_profile(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Public API: Lấy chi tiết profile để hiển thị lên Landing Page.
    Chỉ trả về nếu profile được duyệt và đang bật is_public.
    """
    kol = db.scalar(
        select(KOLProfile).where(
            KOLProfile.user_id == user_id,
            KOLProfile.verification_status == VerificationStatus.APPROVED,
            KOLProfile.is_public == True,
        )
    )
    if not kol:
        raise HTTPException(status_code=404, detail="KOL Profile không tồn tại hoặc chưa công khai.")
    return kol


# ═══════════════════════════════════════════════════════════════════════════
# 4) OFFBOARDING — soft delete (deactivate user)
# ═══════════════════════════════════════════════════════════════════════════

@router.patch(
    "/{user_id}/deactivate",
    response_model=dict,
    summary="Vô hiệu hóa KOL (Soft Delete)",
)
def deactivate_kol(
    user_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """Soft delete: đặt `is_active = False` cho user KOL.

    - KOL không thể đăng nhập nữa.
    - Profile tự động ẩn khỏi Landing Page.
    - Lịch sử hợp đồng, hóa đơn vẫn được giữ nguyên.
    """
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.KOL).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy KOL với ID này.",
        )

    user.is_active = False

    # Also hide from Landing Page
    if user.kol_profile:
        user.kol_profile.is_public = False

    db.commit()
    return {"detail": f"KOL {user.full_name} đã bị vô hiệu hóa."}


@router.patch(
    "/{user_id}/reactivate",
    response_model=dict,
    summary="Kích hoạt lại KOL",
)
def reactivate_kol(
    user_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.KOL_MANAGER)),
    db: Session = Depends(get_db),
):
    """Kích hoạt lại tài khoản KOL đã bị soft delete."""
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.KOL).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy KOL với ID này.",
        )

    user.is_active = True
    db.commit()
    return {"detail": f"KOL {user.full_name} đã được kích hoạt lại."}
