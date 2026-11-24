import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Đọc biến môi trường từ file .env (nếu có)
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_SQLITE_PATH = (BASE_DIR / "schedule.db").as_posix()
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH}"
raw_database_url = os.getenv("DATABASE_URL", "").strip()

if not raw_database_url or raw_database_url == "sqlite:///./schedule.db":
    DATABASE_URL = DEFAULT_SQLITE_URL
else:
    # Tương thích với các cloud provider (Render, Neon, Heroku) trả về prefix postgres://
    if raw_database_url.startswith("postgres://"):
        DATABASE_URL = raw_database_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = raw_database_url

# Cấu hình tham số kết nối riêng cho SQLite và PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency cung cấp database session cho mỗi request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
