from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    type: str
    ref_type: Optional[str] = None
    ref_id: Optional[uuid.UUID] = None
    data_json: Optional[dict] = None
    is_read: bool
    viewed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationMarkRead(BaseModel):
    is_read: bool = Field(True, description="Đánh dấu đã đọc")


class NotificationSummary(BaseModel):
    total: int
    unread: int
    action_required: int
