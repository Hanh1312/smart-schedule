"""
Công cụ đồng bộ toàn bộ dữ liệu từ file schedule.db trên Laptop lên Cloud PostgreSQL (Neon.tech).
Cách dùng:
1. Tạo file .env (từ .env.example) và dán chuỗi kết nối PostgreSQL của Neon.tech vào dòng:
   DATABASE_URL=postgresql://...
2. Chạy lệnh:
   python sync_to_cloud.py
"""

import os
import sqlite3
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models

BASE_DIR = Path(__file__).resolve().parent
LOCAL_DB_PATH = BASE_DIR / "schedule.db"
load_dotenv(BASE_DIR / ".env")


def parse_dt(val):
    if not val:
        return None
    s = str(val).strip().replace("T", " ")
    if "." in s:
        s = s.split(".", 1)[0]
    try:
        return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return datetime.now()


def main():
    cloud_url = os.getenv("DATABASE_URL", "").strip()
    if not cloud_url or cloud_url.startswith("sqlite"):
        print("❌ Bạn chưa cấu hình chuỗi kết nối PostgreSQL trong file .env!")
        print("👉 Hãy mở file .env và dán DATABASE_URL=postgresql://... từ Neon.tech vào trước nhé.")
        return

    if cloud_url.startswith("postgres://"):
        cloud_url = cloud_url.replace("postgres://", "postgresql://", 1)

    if not LOCAL_DB_PATH.exists():
        print("❌ Không tìm thấy file schedule.db trên máy để đồng bộ.")
        return

    print("☁️ Đang kết nối tới Cloud PostgreSQL...")
    cloud_engine = create_engine(cloud_url, pool_pre_ping=True)
    models.Base.metadata.create_all(bind=cloud_engine)
    CloudSession = sessionmaker(bind=cloud_engine)
    cloud_db = CloudSession()

    conn = sqlite3.connect(str(LOCAL_DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    try:
        # 1. Đồng bộ Danh mục
        cur.execute("SELECT * FROM categories ORDER BY id ASC")
        local_cats = cur.fetchall()
        cat_id_map = {}
        for c in local_cats:
            existing = (
                cloud_db.query(models.Category)
                .filter(models.Category.name == c["name"])
                .first()
            )
            if not existing:
                new_c = models.Category(
                    name=c["name"],
                    color=c["color"],
                    icon=c["icon"],
                    is_default=bool(c["is_default"]),
                )
                cloud_db.add(new_c)
                cloud_db.flush()
                cat_id_map[c["id"]] = new_c.id
            else:
                cat_id_map[c["id"]] = existing.id

        # 2. Đồng bộ Sự kiện
        cur.execute("SELECT * FROM events ORDER BY id ASC")
        local_events = cur.fetchall()
        synced_count = 0
        for ev in local_events:
            exists = (
                cloud_db.query(models.Event)
                .filter(
                    models.Event.title == ev["title"],
                    models.Event.start_time == parse_dt(ev["start_time"]),
                )
                .first()
            )
            if exists:
                continue

            ev_keys = ev.keys()
            new_ev = models.Event(
                title=ev["title"],
                start_time=parse_dt(ev["start_time"]),
                end_time=parse_dt(ev["end_time"]),
                category_id=cat_id_map.get(ev["category_id"]),
                location=ev["location"] or "",
                notes=ev["notes"] or "",
                status=ev["status"] or "pending",
                custom_color=ev["custom_color"] if "custom_color" in ev_keys else None,
                custom_icon=ev["custom_icon"] if "custom_icon" in ev_keys else None,
                priority=(ev["priority"] or "normal") if "priority" in ev_keys else "normal",
                recurrence_type=ev["recurrence_type"] or "none",
                recurrence_until=parse_dt(ev["recurrence_until"]),
                recurrence_group_id=ev["recurrence_group_id"],
            )
            cloud_db.add(new_ev)
            synced_count += 1

        cloud_db.commit()
        print(f"✅ Thành công! Đã đẩy {synced_count} công việc và toàn bộ danh mục từ Laptop lên Cloud!")
    finally:
        conn.close()
        cloud_db.close()


if __name__ == "__main__":
    main()
