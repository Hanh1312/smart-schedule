from datetime import datetime, time
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def to_naive_local(dt: Optional[datetime]) -> Optional[datetime]:
    """Chuẩn hóa datetime về dạng naive (wall-clock local time) để so sánh đồng nhất trên SQLite & PostgreSQL."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone().replace(tzinfo=None)
    return dt


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Tên danh mục")
    color: str = Field(
        default="#A7F3D0",
        pattern=r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$",
        description="Mã màu HEX (ví dụ: #A7F3D0)",
    )
    icon: Optional[str] = Field(default="🌿", max_length=50, description="Icon hoặc Emoji")


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    is_default: bool = False

    model_config = ConfigDict(from_attributes=True)


class AttachmentUploadItem(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: Optional[str] = Field(default="application/octet-stream", max_length=120)
    file_size: int = Field(default=0, ge=0)
    data_base64: str = Field(..., description="Nội dung file mã hóa Base64 hoặc Data URL")


class AttachmentBatchUpload(BaseModel):
    files: List[AttachmentUploadItem]


class AttachmentResponse(BaseModel):
    id: int
    event_id: int
    filename: str
    file_url: str
    content_type: Optional[str] = "application/octet-stream"
    file_size: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Tiêu đề sự kiện")
    start_time: datetime = Field(
        ...,
        description="Ngày bắt đầu + Giờ bắt đầu làm trong ngày",
    )
    end_time: datetime = Field(
        ...,
        description="Ngày kết thúc + Giờ kết thúc làm trong ngày",
    )
    category_id: Optional[int] = Field(default=None, description="ID danh mục")
    location: Optional[str] = Field(default="", max_length=255, description="Địa điểm")
    notes: Optional[str] = Field(default="", description="Ghi chú chi tiết")
    status: Literal["pending", "completed"] = Field(
        default="pending", description="Trạng thái: pending (Chưa làm) | completed (Đã xong)"
    )
    custom_color: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Mã màu riêng của công việc (giúp phân biệt các việc cùng danh mục)",
    )
    custom_icon: Optional[str] = Field(
        default=None,
        max_length=30,
        description="Biểu tượng / Ký hiệu đánh dấu riêng cho công việc",
    )
    priority: Literal["normal", "important", "urgent", "exam"] = Field(
        default="normal",
        description="Mức độ đánh dấu: normal | important (⭐) | urgent (🔥) | exam (🎯)",
    )
    recurrence_type: Literal["none", "daily", "weekly"] = Field(
        default="none", description="Lặp lại: none | daily | weekly"
    )
    recurrence_until: Optional[datetime] = Field(
        default=None, description="Ngày kết thúc lặp lại"
    )

    @field_validator("start_time", "end_time", "recurrence_until", mode="after")
    @classmethod
    def normalize_dt(cls, v: Optional[datetime]) -> Optional[datetime]:
        return to_naive_local(v)

    @model_validator(mode="after")
    def check_time_order(self) -> "EventBase":
        if self.start_time and self.end_time:
            if self.end_time.date() < self.start_time.date():
                raise ValueError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.")
            start_t = self.start_time.time()
            end_t = self.end_time.time()
            if end_t <= start_t and end_t != time(0, 0):
                raise ValueError(
                    "Trong 1 ngày, giờ kết thúc làm việc phải lớn hơn giờ bắt đầu làm việc."
                )
        if (
            self.recurrence_type in ("daily", "weekly")
            and self.recurrence_until is not None
            and self.recurrence_until.date() < self.start_time.date()
        ):
            raise ValueError("Ngày kết thúc lặp lại không được nhỏ hơn ngày bắt đầu.")
        return self


class EventCreate(EventBase):
    force: bool = Field(
        default=False,
        description="Bỏ qua cảnh báo trùng lịch và bắt buộc lưu nếu force=True",
    )
    attachments_data: Optional[List[AttachmentUploadItem]] = Field(
        default=None,
        description="Danh sách file đính kèm gửi kèm khi tạo sự kiện",
    )


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    category_id: Optional[int] = None
    location: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None
    status: Optional[Literal["pending", "completed"]] = None
    custom_color: Optional[str] = Field(default=None, max_length=20)
    custom_icon: Optional[str] = Field(default=None, max_length=30)
    priority: Optional[Literal["normal", "important", "urgent", "exam"]] = None
    recurrence_type: Optional[Literal["none", "daily", "weekly"]] = None
    recurrence_until: Optional[datetime] = None
    force: Optional[bool] = Field(default=False)
    attachments_data: Optional[List[AttachmentUploadItem]] = Field(
        default=None,
        description="Danh sách file đính kèm mới thêm vào sự kiện",
    )

    @field_validator("start_time", "end_time", "recurrence_until", mode="after")
    @classmethod
    def normalize_dt(cls, v: Optional[datetime]) -> Optional[datetime]:
        return to_naive_local(v)


class EventResponse(BaseModel):
    id: int
    title: str
    start_time: datetime
    end_time: datetime
    category_id: Optional[int] = None
    category: Optional[CategoryResponse] = None
    location: Optional[str] = ""
    notes: Optional[str] = ""
    status: Optional[str] = "pending"
    custom_color: Optional[str] = None
    custom_icon: Optional[str] = None
    priority: Optional[str] = "normal"
    recurrence_type: Optional[str] = "none"
    recurrence_until: Optional[datetime] = None
    recurrence_group_id: Optional[str] = None
    attachments: List[AttachmentResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("priority", mode="before")
    @classmethod
    def default_priority_if_none(cls, v: Optional[str]) -> str:
        return v or "normal"

    @field_validator("status", mode="before")
    @classmethod
    def default_status_if_none(cls, v: Optional[str]) -> str:
        return v or "pending"

    @field_validator("recurrence_type", mode="before")
    @classmethod
    def default_recurrence_if_none(cls, v: Optional[str]) -> str:
        return v or "none"

    model_config = ConfigDict(from_attributes=True)


class ConflictEventInfo(BaseModel):
    id: int
    title: str
    start_time: datetime
    end_time: datetime
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    location: Optional[str] = ""


class ConflictWarningResponse(BaseModel):
    conflict: bool = True
    message: str
    conflicting_events: List[ConflictEventInfo]
