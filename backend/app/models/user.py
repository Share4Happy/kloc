from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import UserRole
from app.models.base import Base


class User(Base):
    """Platform user with role-based access control."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
        default=UserRole.KOL,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    kol_profile: Mapped["KOLProfile | None"] = relationship(
        "KOLProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value}>"


# Avoid circular import — KOLProfile is imported at module level in __init__
from app.models.kol_profile import KOLProfile  # noqa: E402, F401
