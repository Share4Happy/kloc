import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class UIConfigBase(BaseModel):
    """Schema cơ sở cho UI Config."""

    description: Optional[str] = Field(None, description="Mô tả công dụng của config key")


class UIConfigUpdate(BaseModel):
    """
    Schema nhận payload để cập nhật nhiều cấu hình cùng lúc.
    Sử dụng dictionary động, map từ key -> value.
    Ví dụ:
    {
      "show_banner": false,
      "hero_title": "Hello"
    }
    """
    
    # Allows dict-like dynamic fields
    model_config = ConfigDict(extra="allow")


class UIConfigResponse(UIConfigBase):
    """Schema trả về một UI Config key cụ thể."""

    id: uuid.UUID
    key: str
    value: Any
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
