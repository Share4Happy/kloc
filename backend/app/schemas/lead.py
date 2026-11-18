import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

LeadSource = Literal["booking_form", "contact_form"]


class LeadCreateRequest(BaseModel):
    """Payload from public forms to create a lead."""

    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=3, max_length=20)
    email: EmailStr | None = None
    company: str | None = Field(None, max_length=255)
    subject: str | None = Field(None, max_length=255)
    message: str = Field(..., min_length=1, max_length=5000)
    source: LeadSource


class LeadResponse(BaseModel):
    """Lead representation for internal portal."""

    id: uuid.UUID
    full_name: str
    phone: str
    email: str | None = None
    company: str | None = None
    subject: str | None = None
    message: str
    source: LeadSource
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
