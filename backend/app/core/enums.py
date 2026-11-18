import enum


class UserRole(str, enum.Enum):
    """Roles available in the KOL/KOC Booking Platform."""

    ADMIN = "admin"
    MANAGER = "manager"
    SALE = "sale"
    KOL_MANAGER = "kol_manager"
    KOL = "kol"


class VerificationStatus(str, enum.Enum):
    """KOL profile verification statuses."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PayoutStatus(str, enum.Enum):
    """Payout record statuses for KOL payments."""

    PENDING = "pending"
    PAID = "paid"
    CANCELLED = "cancelled"


class CampaignStatus(str, enum.Enum):
    """Lifecycle statuses for campaign/combo parent entity."""

    PLANNING = "planning"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderStatus(str, enum.Enum):
    """States of a booking order."""

    NEW_REQUEST = "new_request"
    PENDING_APPROVAL = "pending_approval"
    PENDING_SALE_INFO = "pending_sale_info"  # Đã duyệt claim, chờ Sale cập nhật thông tin
    INIT = "init"
    DEPOSITED = "deposited"
    RUNNING = "running"
    PENDING_REVIEW = "pending_review"
    COMPLETED = "completed"
    # Cancel / refund pipeline
    CANCEL_REQUESTED = "cancel_requested"
    CANCELLED = "cancelled"
    REFUND_REQUESTED = "refund_requested"
    REFUNDED = "refunded"
