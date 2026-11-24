import base64
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import and_, inspect, or_, text
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import engine, get_db

router = APIRouter(prefix="/api", tags=["Schedule API"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_CATEGORIES = [
    {"name": "Học tập", "color": "#A7F3D0", "icon": "🌿", "is_default": True},
    {"name": "Công việc", "color": "#BAE6FD", "icon": "💼", "is_default": True},
    {"name": "Cá nhân", "color": "#BBF7D0", "icon": "🍀", "is_default": True},
    {"name": "Khác", "color": "#FDE68A", "icon": "🧸", "is_default": True},
]

DISTINCT_PASTEL_PALETTE = [
    "#A7F3D0",  # Xanh Mint Sữa
    "#BAE6FD",  # Xanh Bầu Trời
    "#DDD6FE",  # Tím Lavender
    "#FDE68A",  # Vàng Bơ Nhạt
    "#FBCFE8",  # Hồng Sakura
    "#FED7AA",  # Cam Đào Nhạt
    "#99F6E4",  # Xanh Ngọc Aqua
    "#D9F99D",  # Xanh Táo Non
    "#FECDD3",  # Hồng San Hô
    "#C7D2FE",  # Xanh Periwinkle
]

_tables_ensured = False


def ensure_tables_and_categories(db: Session) -> List[models.Category]:
    """Đảm bảo bảng và các cột mới (custom_color, custom_icon, priority) đã tồn tại, đồng thời seed 4 danh mục mặc định."""
    global _tables_ensured
    if not _tables_ensured:
        models.Base.metadata.create_all(bind=engine)
        try:
            inspector = inspect(engine)
            existing_cols = {col["name"] for col in inspector.get_columns("events")}
            with engine.begin() as conn:
                if "custom_color" not in existing_cols:
                    conn.execute(text("ALTER TABLE events ADD COLUMN custom_color VARCHAR(20)"))
                if "custom_icon" not in existing_cols:
                    conn.execute(text("ALTER TABLE events ADD COLUMN custom_icon VARCHAR(30)"))
                if "priority" not in existing_cols:
                    conn.execute(text("ALTER TABLE events ADD COLUMN priority VARCHAR(30) DEFAULT 'normal'"))
        except Exception:
            pass
        _tables_ensured = True

    existing = db.query(models.Category).order_by(models.Category.id.asc()).all()
    if existing:
        return existing

    seeded: List[models.Category] = []
    for item in DEFAULT_CATEGORIES:
        cat = models.Category(
            name=item["name"],
            color=item["color"],
            icon=item["icon"],
            is_default=item["is_default"],
        )
        db.add(cat)
        seeded.append(cat)

    db.commit()
    for cat in seeded:
        db.refresh(cat)
    return seeded


# Giữ alias tương thích ngược với main.py
ensure_default_categories = ensure_tables_and_categories


def sanitize_filename(filename: str) -> str:
    """Làm sạch tên file để lưu trữ an toàn trên hệ thống tệp."""
    name = Path(filename).name
    cleaned = re.sub(r"[^A-Za-z0-9._\-\u00C0-\u1EF9 ]+", "_", name).strip()
    return cleaned or "attachment.bin"


def save_attachment_files_for_events(
    db: Session,
    target_events: List[models.Event],
    items: Optional[List[schemas.AttachmentUploadItem]],
) -> List[models.EventAttachment]:
    """Giải mã Base64, lưu file vào static/uploads/ và gắn vào danh sách sự kiện."""
    if not items or not target_events:
        return []

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    created_attachments: List[models.EventAttachment] = []

    for item in items:
        raw_b64 = item.data_base64.strip()
        if "," in raw_b64 and raw_b64.startswith("data:"):
            raw_b64 = raw_b64.split(",", 1)[1]

        try:
            file_bytes = base64.b64decode(raw_b64)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Không thể đọc dữ liệu file '{item.filename}'.",
            ) from exc

        # Giới hạn 20MB mỗi file để an toàn bộ nhớ
        if len(file_bytes) > 20 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{item.filename}' vượt quá giới hạn 20MB.",
            )

        safe_name = sanitize_filename(item.filename)
        stored_name = f"{uuid.uuid4().hex[:10]}_{safe_name}"
        dest_path = UPLOADS_DIR / stored_name
        dest_path.write_bytes(file_bytes)
        file_url = f"/static/uploads/{stored_name}"

        for ev in target_events:
            att = models.EventAttachment(
                event_id=ev.id,
                filename=item.filename.strip() or safe_name,
                stored_name=stored_name,
                file_url=file_url,
                content_type=item.content_type or "application/octet-stream",
                file_size=len(file_bytes),
            )
            db.add(att)
            created_attachments.append(att)

    return created_attachments


def parse_iso_query_datetime(raw: Optional[str]) -> Optional[datetime]:
    """Parse chuỗi ISO datetime từ query params."""
    if not raw:
        return None
    cleaned = raw.strip()
    if not cleaned:
        return None

    if "T" in cleaned and " " in cleaned:
        t_part, after_t = cleaned.split("T", 1)
        if " " in after_t and "+" not in after_t:
            after_t = after_t.replace(" ", "+", 1)
            cleaned = f"{t_part}T{after_t}"

    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"

    try:
        dt = datetime.fromisoformat(cleaned)
    except ValueError:
        try:
            dt = datetime.strptime(cleaned[:10], "%Y-%m-%d")
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Định dạng thời gian không hợp lệ: {raw}",
            ) from exc

    return schemas.to_naive_local(dt)


def build_recurrence_slots(
    start_time: datetime,
    end_time: datetime,
    recurrence_type: str,
    recurrence_until: Optional[datetime],
) -> List[tuple[datetime, datetime]]:
    """Sinh danh sách các khung giờ (start, end) cho sự kiện đơn lẻ hoặc lặp lại."""
    duration = end_time - start_time
    if recurrence_type not in ("daily", "weekly"):
        return [(start_time, end_time)]

    step = timedelta(days=1) if recurrence_type == "daily" else timedelta(weeks=1)

    if recurrence_until is not None:
        until_date = recurrence_until.date()
    else:
        default_span = timedelta(days=6) if recurrence_type == "daily" else timedelta(weeks=3)
        until_date = (start_time + default_span).date()

    slots: List[tuple[datetime, datetime]] = []
    current_start = start_time
    max_occurrences = 180

    while current_start.date() <= until_date and len(slots) < max_occurrences:
        slots.append((current_start, current_start + duration))
        current_start = current_start + step

    return slots or [(start_time, end_time)]


def find_conflicting_events(
    db: Session,
    slots: List[tuple[datetime, datetime]],
    exclude_event_id: Optional[int] = None,
) -> List[models.Event]:
    """
    Kiểm tra trùng lịch thông minh theo cả Khoảng Ngày (start_date -> end_date)
    VÀ Khung Giờ Làm Việc Trong 1 Ngày (daily_start_time -> daily_end_time).
    """
    if not slots:
        return []

    overlap_conditions = [
        and_(
            models.Event.start_time < slot_end,
            models.Event.end_time > slot_start,
        )
        for slot_start, slot_end in slots
    ]

    query = (
        db.query(models.Event)
        .options(joinedload(models.Event.category))
        .filter(or_(*overlap_conditions))
    )

    if exclude_event_id is not None:
        query = query.filter(models.Event.id != exclude_event_id)

    candidates = query.order_by(models.Event.start_time.asc()).all()

    # Lọc chính xác theo khung giờ làm việc trong 1 ngày (tránh báo trùng oan khi 1 việc kéo dài nhiều ngày)
    real_conflicts: List[models.Event] = []
    for ev in candidates:
        ev_start_date = ev.start_time.date()
        ev_end_date = ev.end_time.date()
        ev_start_t = ev.start_time.time()
        ev_end_t = ev.end_time.time()

        is_conflict = False
        for slot_start, slot_end in slots:
            s_start_date = slot_start.date()
            s_end_date = slot_end.date()
            s_start_t = slot_start.time()
            s_end_t = slot_end.time()

            # 1. Kiểm tra giao nhau về ngày
            date_overlaps = s_start_date <= ev_end_date and s_end_date >= ev_start_date
            # 2. Kiểm tra giao nhau về khung giờ làm việc trong 1 ngày
            time_overlaps = s_start_t < ev_end_t and s_end_t > ev_start_t

            if date_overlaps and time_overlaps:
                is_conflict = True
                break

        if is_conflict:
            real_conflicts.append(ev)

    return real_conflicts


def build_conflict_response(conflicts: List[models.Event]) -> JSONResponse:
    """Tạo JSONResponse 409 Conflict kèm thông tin chi tiết các lịch bị trùng."""
    conflict_items = []
    titles = []
    for ev in conflicts:
        time_label = f"{ev.start_time.strftime('%H:%M')} - {ev.end_time.strftime('%H:%M')} ({ev.start_time.strftime('%d/%m/%Y')})"
        titles.append(f"• {ev.title} [{time_label}]")
        conflict_items.append(
            {
                "id": ev.id,
                "title": ev.title,
                "start_time": ev.start_time.isoformat(),
                "end_time": ev.end_time.isoformat(),
                "category_name": ev.category.name if ev.category else "Chưa phân loại",
                "category_color": ev.category.color if ev.category else "#FF8FAB",
                "location": ev.location or "",
            }
        )

    summary_preview = "\n".join(titles[:5])
    if len(titles) > 5:
        summary_preview += f"\n...và {len(titles) - 5} sự kiện khác."

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "conflict": True,
            "message": f"Phát hiện trùng khung giờ với {len(conflicts)} sự kiện hiện có:\n{summary_preview}",
            "conflicting_events": conflict_items,
        },
    )


# ==========================================
# CATEGORIES ENDPOINTS
# ==========================================


@router.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Lấy danh sách danh mục màu sắc (tự động seed 4 danh mục mặc định nếu DB trống)."""
    return ensure_tables_and_categories(db)


@router.post(
    "/categories",
    response_model=schemas.CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    payload: schemas.CategoryCreate,
    db: Session = Depends(get_db),
):
    """Thêm danh mục sự kiện mới với mã màu tùy chọn."""
    ensure_tables_and_categories(db)
    normalized_name = payload.name.strip()

    existing = (
        db.query(models.Category)
        .filter(models.Category.name.ilike(normalized_name))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Danh mục '{normalized_name}' đã tồn tại.",
        )

    new_cat = models.Category(
        name=normalized_name,
        color=payload.color.upper(),
        icon=(payload.icon or "🌸").strip() or "🌸",
        is_default=False,
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Xóa danh mục tùy chỉnh."""
    ensure_tables_and_categories(db)
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy danh mục.",
        )
    if cat.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa danh mục mặc định của hệ thống.",
        )

    fallback_cat = (
        db.query(models.Category).filter(models.Category.name == "Khác").first()
    )
    fallback_id = fallback_cat.id if fallback_cat else None
    db.query(models.Event).filter(models.Event.category_id == category_id).update(
        {models.Event.category_id: fallback_id}
    )

    db.delete(cat)
    db.commit()
    return {"deleted": True, "id": category_id}


# ==========================================
# EVENTS ENDPOINTS
# ==========================================


@router.get("/events", response_model=List[schemas.EventResponse])
def get_events(
    start: Optional[str] = Query(default=None, description="ISO datetime bắt đầu"),
    end: Optional[str] = Query(default=None, description="ISO datetime kết thúc"),
    category_id: Optional[int] = Query(default=None, description="Lọc theo ID danh mục"),
    status_filter: Optional[str] = Query(
        default=None, alias="status", description="Lọc theo trạng thái: pending | completed"
    ),
    search: Optional[str] = Query(default=None, description="Tìm kiếm theo từ khóa"),
    db: Session = Depends(get_db),
):
    """Lấy danh sách sự kiện kèm danh mục và danh sách file đính kèm."""
    ensure_tables_and_categories(db)

    query = db.query(models.Event).options(
        joinedload(models.Event.category),
        joinedload(models.Event.attachments),
    )

    start_dt = parse_iso_query_datetime(start)
    end_dt = parse_iso_query_datetime(end)

    if start_dt is not None:
        query = query.filter(models.Event.end_time >= start_dt)
    if end_dt is not None:
        query = query.filter(models.Event.start_time <= end_dt)
    if category_id is not None:
        query = query.filter(models.Event.category_id == category_id)
    if status_filter in ("pending", "completed"):
        query = query.filter(models.Event.status == status_filter)
    if search and search.strip():
        kw = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Event.title.ilike(kw),
                models.Event.location.ilike(kw),
                models.Event.notes.ilike(kw),
            )
        )

    events = query.order_by(models.Event.start_time.asc()).all()
    return events


@router.post(
    "/events",
    response_model=schemas.EventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_event(
    payload: schemas.EventCreate,
    force: bool = Query(
        default=False,
        description="Nếu force=True, bỏ qua cảnh báo trùng lịch và vẫn lưu vào database",
    ),
    db: Session = Depends(get_db),
):
    """Tạo sự kiện mới (hỗ trợ lặp lại, đính kèm file đa nhiệm và kiểm tra trùng lịch)."""
    categories = ensure_tables_and_categories(db)
    should_force = bool(force or payload.force)

    target_category_id = payload.category_id
    if target_category_id is not None:
        cat_exists = (
            db.query(models.Category)
            .filter(models.Category.id == target_category_id)
            .first()
        )
        if not cat_exists:
            target_category_id = categories[0].id if categories else None
    else:
        target_category_id = categories[0].id if categories else None

    slots = build_recurrence_slots(
        start_time=payload.start_time,
        end_time=payload.end_time,
        recurrence_type=payload.recurrence_type,
        recurrence_until=payload.recurrence_until,
    )

    if not should_force:
        conflicts = find_conflicting_events(db, slots=slots)
        if conflicts:
            return build_conflict_response(conflicts)

    group_id = (
        str(uuid.uuid4())
        if payload.recurrence_type in ("daily", "weekly") and len(slots) > 1
        else None
    )

    # Nếu người dùng không chỉ định màu riêng, tự động chọn màu Pastel phân biệt với các việc đã có
    chosen_color = (payload.custom_color or "").strip() or None
    if not chosen_color:
        total_existing = db.query(models.Event).count()
        chosen_color = DISTINCT_PASTEL_PALETTE[total_existing % len(DISTINCT_PASTEL_PALETTE)]

    chosen_icon = (payload.custom_icon or "").strip() or None
    chosen_priority = payload.priority or "normal"

    created_events: List[models.Event] = []
    for slot_start, slot_end in slots:
        ev = models.Event(
            title=payload.title.strip(),
            start_time=slot_start,
            end_time=slot_end,
            category_id=target_category_id,
            location=(payload.location or "").strip(),
            notes=(payload.notes or "").strip(),
            status=payload.status,
            custom_color=chosen_color,
            custom_icon=chosen_icon,
            priority=chosen_priority,
            recurrence_type=payload.recurrence_type,
            recurrence_until=payload.recurrence_until,
            recurrence_group_id=group_id,
        )
        db.add(ev)
        created_events.append(ev)

    db.flush()

    if payload.attachments_data:
        save_attachment_files_for_events(db, created_events, payload.attachments_data)

    db.commit()
    primary_event = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.category),
            joinedload(models.Event.attachments),
        )
        .filter(models.Event.id == created_events[0].id)
        .first()
    )
    return primary_event


@router.put("/events/{event_id}", response_model=schemas.EventResponse)
def update_event(
    event_id: int,
    payload: schemas.EventUpdate,
    force: bool = Query(
        default=False,
        description="Nếu force=True, bỏ qua cảnh báo trùng lịch và vẫn cập nhật",
    ),
    db: Session = Depends(get_db),
):
    """Cập nhật thông tin sự kiện, file đính kèm hoặc thời gian khi Kéo-Thả / Kéo giãn."""
    ensure_tables_and_categories(db)
    event = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.category),
            joinedload(models.Event.attachments),
        )
        .filter(models.Event.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sự kiện cần cập nhật.",
        )

    should_force = bool(force or payload.force)

    new_start = payload.start_time if payload.start_time is not None else event.start_time
    new_end = payload.end_time if payload.end_time is not None else event.end_time

    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian kết thúc phải lớn hơn thời gian bắt đầu.",
        )

    time_changed = payload.start_time is not None or payload.end_time is not None

    if time_changed and not should_force:
        conflicts = find_conflicting_events(
            db,
            slots=[(new_start, new_end)],
            exclude_event_id=event.id,
        )
        if conflicts:
            return build_conflict_response(conflicts)

    if payload.title is not None:
        event.title = payload.title.strip()
    event.start_time = new_start
    event.end_time = new_end

    if payload.category_id is not None:
        cat = (
            db.query(models.Category)
            .filter(models.Category.id == payload.category_id)
            .first()
        )
        if cat:
            event.category_id = cat.id

    if payload.location is not None:
        event.location = payload.location.strip()
    if payload.notes is not None:
        event.notes = payload.notes.strip()
    if payload.status is not None:
        event.status = payload.status
    if payload.custom_color is not None:
        event.custom_color = payload.custom_color.strip() or None
    if payload.custom_icon is not None:
        event.custom_icon = payload.custom_icon.strip() or None
    if payload.priority is not None:
        event.priority = payload.priority
    if payload.recurrence_type is not None:
        event.recurrence_type = payload.recurrence_type
    if payload.recurrence_until is not None or payload.recurrence_type == "none":
        event.recurrence_until = (
            None if payload.recurrence_type == "none" else payload.recurrence_until
        )

    if payload.attachments_data:
        save_attachment_files_for_events(db, [event], payload.attachments_data)

    db.commit()
    updated_event = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.category),
            joinedload(models.Event.attachments),
        )
        .filter(models.Event.id == event_id)
        .first()
    )
    return updated_event


@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    delete_series: bool = Query(
        default=False,
        description="Nếu True và sự kiện thuộc chuỗi lặp lại, xóa toàn bộ các buổi trong chuỗi",
    ),
    db: Session = Depends(get_db),
):
    """Xóa một sự kiện hoặc xóa toàn bộ chuỗi sự kiện lặp lại."""
    ensure_tables_and_categories(db)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sự kiện cần xóa.",
        )

    if delete_series and event.recurrence_group_id:
        group_id = event.recurrence_group_id
        series_events = (
            db.query(models.Event)
            .filter(models.Event.recurrence_group_id == group_id)
            .all()
        )
        deleted_count = len(series_events)
        for ev in series_events:
            db.delete(ev)
        db.commit()
        return {
            "deleted": True,
            "deleted_count": deleted_count,
            "series_deleted": True,
            "message": f"Đã xóa toàn bộ {deleted_count} sự kiện trong chuỗi lặp lại.",
        }

    db.delete(event)
    db.commit()
    return {
        "deleted": True,
        "deleted_count": 1,
        "series_deleted": False,
        "message": "Đã xóa sự kiện thành công.",
    }


# ==========================================
# ATTACHMENTS ENDPOINTS (ĐÍNH KÈM FILE ĐA NHIỆM)
# ==========================================


@router.post(
    "/events/{event_id}/attachments",
    response_model=List[schemas.AttachmentResponse],
    status_code=status.HTTP_201_CREATED,
)
def upload_event_attachments(
    event_id: int,
    payload: schemas.AttachmentBatchUpload,
    db: Session = Depends(get_db),
):
    """Đính kèm một hoặc nhiều file tài liệu/hình ảnh vào sự kiện."""
    ensure_tables_and_categories(db)
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy sự kiện để đính kèm file.",
        )

    created = save_attachment_files_for_events(db, [event], payload.files)
    db.commit()
    for att in created:
        db.refresh(att)
    return created


@router.delete("/attachments/{attachment_id}")
def delete_event_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
):
    """Xóa một file đính kèm khỏi sự kiện."""
    ensure_tables_and_categories(db)
    att = (
        db.query(models.EventAttachment)
        .filter(models.EventAttachment.id == attachment_id)
        .first()
    )
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy file đính kèm.",
        )

    stored_name = att.stored_name
    db.delete(att)
    db.commit()

    # Nếu không còn bản ghi nào dùng chung stored_name này thì xóa file vật lý
    remaining = (
        db.query(models.EventAttachment)
        .filter(models.EventAttachment.stored_name == stored_name)
        .count()
    )
    if remaining == 0:
        file_path = UPLOADS_DIR / stored_name
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError:
                pass

    return {"deleted": True, "id": attachment_id, "message": "Đã gỡ file đính kèm."}


@router.post("/attachments/{attachment_id}/open")
def open_attachment_on_desktop(
    attachment_id: int,
    db: Session = Depends(get_db),
):
    """Mở trực tiếp file đính kèm (Word, Excel, PDF, Ảnh...) bằng phần mềm mặc định trên Laptop Windows."""
    ensure_tables_and_categories(db)
    att = (
        db.query(models.EventAttachment)
        .filter(models.EventAttachment.id == attachment_id)
        .first()
    )
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy file đính kèm.",
        )

    file_path = UPLOADS_DIR / att.stored_name
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File không tồn tại trên ổ đĩa.",
        )

    if sys.platform.startswith("win") and hasattr(os, "startfile"):
        try:
            os.startfile(str(file_path))
            return {
                "opened_native": True,
                "filename": att.filename,
                "file_url": att.file_url,
            }
        except Exception:
            pass

    return {
        "opened_native": False,
        "filename": att.filename,
        "file_url": att.file_url,
    }


@router.post("/launch-desktop-widget")
def launch_native_desktop_widget():
    """Khởi chạy khung Widget Bảng Nhắc Việc & Đếm Ngược ghim trực tiếp lên màn hình chính Laptop Windows."""
    widget_script = BASE_DIR / "desktop_widget.py"
    if not widget_script.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy file desktop_widget.py",
        )

    try:
        python_exe = sys.executable
        pythonw_exe = Path(python_exe).with_name("pythonw.exe")
        runner = str(pythonw_exe) if pythonw_exe.exists() else python_exe
        subprocess.Popen(
            [runner, str(widget_script)],
            cwd=str(BASE_DIR),
        )
        return {
            "launched": True,
            "message": "Đã ghim Bảng Nhắc Việc & Đếm Ngược ra màn hình chính Laptop!",
        }
    except Exception as exc:
        return {
            "launched": False,
            "message": str(exc),
        }
