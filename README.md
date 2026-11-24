# 📅 SmartSchedule — Ứng dụng Web App / PWA Quản lý Thời gian biểu

Ứng dụng **Full-stack Web App / Progressive Web App (PWA)** giúp quản lý thời gian biểu, lịch học, công việc và lịch cá nhân mượt mà trên cả **Laptop** và **Mobile** (hỗ trợ cài đặt trực tiếp ra màn hình chính điện thoại Android / iOS).

---

## ✨ Tính năng nổi bật

1. **Giao diện Lịch Trực quan (FullCalendar v6):**
   - Chuyển đổi linh hoạt giữa 4 chế độ xem: **Tháng** (`dayGridMonth`), **Tuần** (`timeGridWeek`), **Ngày** (`timeGridDay`), và **Danh sách** (`listWeek`).
   - **Tối ưu Responsive:** Tự động mở chế độ xem **Tuần** trên Laptop (`>= 768px`) và tự động chuyển sang chế độ xem **Ngày / Danh sách** trên Mobile (`< 768px`).
   - Tương tác trực tiếp: Bấm/kéo chọn ô trống để thêm lịch, bấm vào sự kiện để sửa/xóa, **Kéo-Thả (Drag & Drop)** và **Kéo giãn thời lượng (Resize)** để cập nhật giờ trực tiếp lên cơ sở dữ liệu.
2. **Quản lý Sự kiện (CRUD) & Danh mục Màu sắc:**
   - Tự động khởi tạo (seed) 4 danh mục mặc định khi DB trống: **📚 Học tập**, **💼 Công việc**, **🌿 Cá nhân**, **📌 Khác**.
   - Hỗ trợ tạo thêm danh mục mới với biểu tượng và mã màu HEX tùy chọn.
   - Bộ lọc sự kiện theo danh mục, trạng thái (**Chưa làm** / **Đã xong**) và tìm kiếm trực tiếp theo từ khóa.
3. **Kiểm tra Trùng lịch Thông minh (Smart Conflict Detection):**
   - Tự động phát hiện xung đột thời gian (`new_start < existing_end` và `new_end > existing_start`) cả khi tạo mới, chỉnh sửa lẫn khi kéo-thả trên lịch.
   - Hiển thị Modal cảnh báo chi tiết các sự kiện bị trùng kèm tùy chọn **"Chọn giờ khác"** (hoàn tác kéo-thả) hoặc **"Vẫn lưu"** (`force=true`).
4. **Lịch lặp lại Cơ bản (Recurring Events):**
   - Hỗ trợ lặp lại **Hàng ngày (`daily`)** hoặc **Hàng tuần (`weekly`)** cố định theo thứ trong tuần cho đến ngày kết thúc.
   - Hỗ trợ xóa từng buổi riêng lẻ hoặc xóa toàn bộ chuỗi sự kiện lặp lại.
5. **Hỗ trợ PWA (Progressive Web App):**
   - Tích hợp sẵn `manifest.json`, bộ icon đa kích thước (`192x192`, `512x512`, `apple-touch-icon`, `favicon.svg`) và Service Worker (`sw.js`) hỗ trợ bộ nhớ đệm ngoại tuyến cơ bản.

---

## 🗂 Cấu trúc thư mục

```text
schedule-app/
├── app/
│   ├── main.py          # Khởi tạo FastAPI, mount static, templates & PWA routes
│   ├── database.py      # Cấu hình SQLAlchemy & DATABASE_URL (PostgreSQL / SQLite fallback)
│   ├── models.py        # Bảng Categories và Events
│   ├── schemas.py       # Pydantic v2 schemas & chuẩn hóa thời gian
│   └── routers/
│       └── events.py    # Toàn bộ API endpoints (CRUD, Conflict check, Recurring)
├── static/
│   ├── css/style.css    # Tùy biến giao diện FullCalendar & Responsive
│   ├── js/app.js        # Logic FullCalendar, Modal, Bộ lọc, Fetch API & PWA
│   ├── icons/           # Icon mẫu cho PWA (192x192, 512x512, apple-touch-icon, SVG)
│   ├── manifest.json    # Cấu hình cài đặt PWA
│   └── sw.js            # Service Worker
├── templates/
│   └── index.html       # Giao diện chính + Modal thêm/sửa sự kiện + Modal cảnh báo trùng lịch
├── .env.example
├── requirements.txt
└── README.md
```

---

## 🚀 Hướng dẫn cài đặt và chạy Local

### Bước 1: Di chuyển vào thư mục dự án & tạo môi trường ảo (khuyên dùng)

```bash
cd schedule-app
python -m venv venv
```

Kích hoạt môi trường ảo:
- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

### Bước 2: Cài đặt các thư viện cần thiết

```bash
pip install -r requirements.txt
```

### Bước 3: Cấu hình biến môi trường (Tùy chọn)

Khi chạy ở máy cá nhân (Local), bạn **không bắt buộc** phải tạo file `.env` — ứng dụng sẽ tự động fallback về cơ sở dữ liệu SQLite tại file `schedule.db`.

Nếu muốn cấu hình riêng, hãy sao chép từ file `.env.example`:

```bash
cp .env.example .env
```

### Bước 4: Khởi chạy Server với Uvicorn

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Mở trình duyệt truy cập: **http://localhost:8000**
- Tài liệu Swagger API tương tác: **http://localhost:8000/docs**

---

## ☁️ Hướng dẫn Deploy lên Cloud (Neon PostgreSQL + Render)

### 1. Tạo Database PostgreSQL miễn phí trên Neon.tech
1. Đăng nhập vào [Neon.tech](https://neon.tech/) và tạo một Project mới.
2. Sao chép chuỗi kết nối **Connection String** (ví dụ: `postgresql://user:pass@ep-cool-hill-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`).

### 2. Deploy Web Service lên Render.com
1. Đẩy mã nguồn `schedule-app` lên GitHub repository của bạn.
2. Đăng nhập vào [Render.com](https://render.com/), chọn **New +** -> **Web Service** và kết nối với repository GitHub.
3. Điền thông tin cấu hình trên Render:
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
4. Trong mục **Environment Variables**, thêm biến môi trường:
   - Key: `DATABASE_URL`
   - Value: *(Dán chuỗi kết nối PostgreSQL từ Neon.tech vào đây)*
5. Bấm **Create Web Service**. Khi quá trình build hoàn tất, ứng dụng sẽ tự động khởi tạo bảng và seed 4 danh mục mặc định trên PostgreSQL.

---

## 📱 Hướng dẫn cài đặt PWA ra màn hình chính Điện thoại

- **Trên Android (Chrome / Edge):**
  1. Mở đường dẫn ứng dụng trên trình duyệt Chrome.
  2. Bấm vào nút **"Cài App"** trên thanh công cụ ứng dụng, hoặc mở menu `⋮` của trình duyệt -> chọn **"Cài đặt ứng dụng" (Install App / Add to Home Screen)**.
- **Trên iOS (iPhone / iPad - Safari):**
  1. Mở đường dẫn ứng dụng bằng trình duyệt **Safari**.
  2. Nhấn vào biểu tượng **Chia sẻ (Share)** ở thanh dưới cùng.
  3. Cuộn xuống và chọn **"Thêm vào MH chính" (Add to Home Screen)** -> Nhấn **Thêm (Add)**.
"# smart-schedule" 
