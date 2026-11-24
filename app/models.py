from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Category(Base):
    """Bảng lưu trữ Danh mục sự kiện và mã màu tương ứng."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    color = Column(String(20), nullable=False, default="#A7F3D0")
    icon = Column(String(50), nullable=True, default="🌿")
    is_default = Column(Boolean, default=False)

    events = relationship("Event", back_populates="category")


class Event(Base):
    """Bảng lưu trữ Sự kiện / Thời gian biểu (hỗ trợ màu sắc & ký hiệu đánh dấu riêng cho từng công việc)."""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    location = Column(String(255), nullable=True, default="")
    notes = Column(Text, nullable=True, default="")
    # Trạng thái: "pending" (Chưa làm) | "completed" (Đã xong)
    status = Column(String(30), nullable=False, default="pending")

    # Màu sắc & Đánh dấu riêng cho từng công việc (giúp phân biệt các việc cùng danh mục)
    custom_color = Column(String(20), nullable=True, default=None)
    custom_icon = Column(String(30), nullable=True, default=None)
    # Mức độ đánh dấu: "normal" | "important" (⭐ Quan trọng) | "urgent" (🔥 Gấp) | "exam" (🎯 Deadline lớn)
    priority = Column(String(30), nullable=False, default="normal")

    # Cấu hình lặp lại: "none" (Không lặp) | "daily" (Hàng ngày) | "weekly" (Hàng tuần)
    recurrence_type = Column(String(30), nullable=False, default="none")
    recurrence_until = Column(DateTime, nullable=True)
    recurrence_group_id = Column(String(64), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    category = relationship("Category", back_populates="events")
    attachments = relationship(
        "EventAttachment",
        back_populates="event",
        cascade="all, delete-orphan",
        order_by="EventAttachment.id.asc()",
    )


class EventAttachment(Base):
    """Bảng lưu trữ File đính kèm của từng Sự kiện giúp làm việc đa nhiệm."""

    __tablename__ = "event_attachments"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    content_type = Column(String(120), nullable=True, default="application/octet-stream")
    file_size = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    event = relationship("Event", back_populates="attachments")
