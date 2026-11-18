import uuid

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UIConfig(Base):
    """Bảng cấu hình linh hoạt (Key-Value Key store) dành cho Dashboard/Landing Page."""

    __tablename__ = "ui_configs"

    # Định danh cấu hình (Ví dụ: "show_banner")
    key: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    
    # Giá trị cấu hình, lưu dạng JSONB cho phép chứa array, object, hoặc giá trị nguyên thủy (string/boolean).
    value: Mapped[dict | list | str | bool | int | float | None] = mapped_column(
        JSONB, nullable=False
    )
    
    # Ghi chú cho Admin biết key này mục đích làm gì
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<UIConfig key='{self.key}'>"
