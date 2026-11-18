from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.user import User
from app.core.enums import UserRole
from app.core.security import hash_password

def seed_users(db: Session):
    default_password = "password123"
    
    # 1. Admin
    admin = db.query(User).filter(User.email == "admin@kloc.vn").first()
    if not admin:
        admin = User(
            email="admin@kloc.vn",
            full_name="System Admin",
            hashed_password=hash_password(default_password),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        print("Created Admin user: admin@kloc.vn /", default_password)

    # 2. Manager
    manager = db.query(User).filter(User.email == "manager@kloc.vn").first()
    if not manager:
        manager = User(
            email="manager@kloc.vn",
            full_name="KLOC Manager",
            hashed_password=hash_password(default_password),
            role=UserRole.MANAGER,
            is_active=True
        )
        db.add(manager)
        print("Created Manager user: manager@kloc.vn /", default_password)

    # 3. Sale
    sale = db.query(User).filter(User.email == "sale@kloc.vn").first()
    if not sale:
        sale = User(
            email="sale@kloc.vn",
            full_name="KLOC Sale Agent",
            hashed_password=hash_password(default_password),
            role=UserRole.SALE,
            is_active=True
        )
        db.add(sale)
        print("Created Sale user: sale@kloc.vn /", default_password)

    # 4. KOL Manager
    kol_manager = db.query(User).filter(User.email == "team@kloc.vn").first()
    if not kol_manager:
        kol_manager = User(
            email="team@kloc.vn",
            full_name="KOL Support Team",
            hashed_password=hash_password(default_password),
            role=UserRole.KOL_MANAGER,
            is_active=True
        )
        db.add(kol_manager)
        print("Created KOL Manager user: team@kloc.vn /", default_password)

    db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_users(db)
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
