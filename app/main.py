from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app import models
from app.database import SessionLocal, engine
from app.routers import events

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Khởi tạo bảng cơ sở dữ liệu và seed 4 danh mục mặc định khi khởi động server."""
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        events.ensure_default_categories(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Schedule Manager PWA",
    description="Ứng dụng Web App / PWA Quản lý Thời gian biểu thông minh (FastAPI + FullCalendar)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def disable_static_cache(request: Request, call_next):
    """Đảm bảo cửa sổ ứng dụng PWA luôn tải phiên bản giao diện (HTML/CSS/JS) mới nhất."""
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.startswith("/static/") or path == "/sw.js":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Mount thư mục static và cấu hình Jinja2 templates
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Đăng ký API Router
app.include_router(events.router)


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def read_index(request: Request):
    """Render giao diện trang chủ Quản lý Thời gian biểu."""
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/widget", response_class=HTMLResponse, include_in_schema=False)
async def read_widget(request: Request):
    """Render riêng khung Bảng Nhắc Việc & Đếm Ngược để ghim trên màn hình chính Laptop."""
    return templates.TemplateResponse(request=request, name="widget.html")


@app.get("/manifest.json", include_in_schema=False)
async def serve_manifest():
    """Phục vụ manifest.json ở root path để tương thích PWA tối đa."""
    return FileResponse(
        STATIC_DIR / "manifest.json",
        media_type="application/manifest+json",
    )


@app.get("/sw.js", include_in_schema=False)
async def serve_service_worker():
    """Phục vụ Service Worker ở root scope '/' giúp cài đặt PWA mượt mà trên Android/iOS."""
    return FileResponse(
        STATIC_DIR / "sw.js",
        media_type="application/javascript",
        headers={"Service-Worker-Allowed": "/"},
    )


@app.get("/health", tags=["System"])
async def health_check():
    """Endpoint kiểm tra trạng thái hoạt động (dùng cho Render / Cloud deploy)."""
    return {"status": "ok", "app": "Schedule Manager PWA"}
