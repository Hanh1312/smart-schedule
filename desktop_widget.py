"""
SmartSchedule 🌿 — Native Windows Desktop Widget (Bảng Nhắc Việc & Đếm Ngược)
Ghim trực tiếp khung nhắc việc Mint Pastel lên màn hình chính Laptop Windows (không cần mở trình duyệt).
"""

import os
import sqlite3
import sys
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path

from PyQt5 import QtCore, QtGui, QtWidgets

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "schedule.db"
UPLOADS_DIR = BASE_DIR / "static" / "uploads"


def format_duration_hms(diff_seconds: int) -> str:
    total = max(0, abs(int(diff_seconds)))
    days = total // 86400
    hours = (total % 86400) // 3600
    minutes = (total % 3600) // 60
    seconds = total % 60
    if days > 0:
        return f"{days}n {hours:02d}g {minutes:02d}p"
    return f"{hours:02d}g {minutes:02d}p {seconds:02d}s"


def parse_db_dt(val: str) -> datetime:
    cleaned = str(val).strip().replace("T", " ")
    if "." in cleaned:
        cleaned = cleaned.split(".", 1)[0]
    return datetime.strptime(cleaned[:19], "%Y-%m-%d %H:%M:%S")


def format_daily_time_range(start_dt: datetime, end_dt: datetime) -> str:
    s_time = start_dt.strftime("%H:%M")
    e_time = end_dt.strftime("%H:%M")
    s_date = start_dt.strftime("%d/%m")
    e_date = end_dt.strftime("%d/%m")
    diff_mins = max(60, (end_dt.hour * 60 + end_dt.minute) - (start_dt.hour * 60 + start_dt.minute))
    hrs = diff_mins // 60
    mins = diff_mins % 60
    daily_lbl = f"{hrs}g{mins}p/ngày" if (hrs and mins) else (f"{hrs}g/ngày" if hrs else f"{mins}p/ngày")
    if start_dt.date() != end_dt.date():
        return f"{s_time} - {e_time} ({daily_lbl}) • {s_date} → {e_date}"
    return f"{s_time} - {e_time} ({s_date}) • {daily_lbl}"


def get_countdown_info(start_dt: datetime, end_dt: datetime, now: datetime):
    if now > end_dt:
        over = int((now - end_dt).total_seconds())
        hms = format_duration_hms(over)
        return {
            "phase": "overdue",
            "header_badge": "🚨 ĐÃ QUÁ HẠN CÔNG VIỆC",
            "label": "Đã trễ hạn:",
            "timer": f"Trễ {hms}",
            "short": f"🚨 Trễ {hms}",
            "progress": 0,
        }

    today_date = now.date()
    ref_date = start_dt.date() if today_date < start_dt.date() else today_date
    session_start = datetime(
        ref_date.year, ref_date.month, ref_date.day, start_dt.hour, start_dt.minute, 0
    )
    session_end = datetime(
        ref_date.year, ref_date.month, ref_date.day, end_dt.hour, end_dt.minute, 0
    )
    if session_end <= session_start:
        session_end = session_start + timedelta(hours=1)

    if session_start <= now <= session_end:
        rem = int((session_end - now).total_seconds())
        total_sec = max(1.0, (session_end - session_start).total_seconds())
        elapsed_pct = min(
            100, max(0, int(((now - session_start).total_seconds() / total_sec) * 100))
        )
        hms = format_duration_hms(rem)
        return {
            "phase": "active",
            "header_badge": "🔥 ĐANG TRONG GIỜ LÀM VIỆC",
            "label": "Giờ làm hôm nay còn:",
            "timer": hms,
            "short": f"⏱️ {hms}",
            "progress": 100 - elapsed_pct,
        }
    elif now < session_start:
        rem = int((session_start - now).total_seconds())
        hms = format_duration_hms(rem)
        return {
            "phase": "upcoming",
            "header_badge": "🌟 VIỆC SẮP TỚI GẦN NHẤT",
            "label": "Đến giờ làm sau:",
            "timer": hms,
            "short": f"⏳ {hms}",
            "progress": 100,
        }
    else:
        rem = int((end_dt - now).total_seconds())
        hms = format_duration_hms(rem)
        return {
            "phase": "upcoming",
            "header_badge": "✅ ĐÃ XONG CA HÔM NAY",
            "label": "Hạn nộp còn:",
            "timer": hms,
            "short": f"🎯 Còn {hms}",
            "progress": 100,
        }


def fetch_pending_events():
    if not DB_PATH.exists():
        return []
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT e.id, e.title, e.start_time, e.end_time, e.status,
                   e.custom_color, e.custom_icon, e.priority,
                   c.name AS category_name, c.color AS category_color, c.icon AS category_icon
            FROM events e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.status = 'pending'
            ORDER BY e.end_time ASC
            LIMIT 15
            """
        )
        rows = cur.fetchall()
        events = []
        for r in rows:
            ev_id = r["id"]
            cur.execute(
                """
                SELECT id, filename, stored_name
                FROM event_attachments
                WHERE event_id = ?
                ORDER BY id ASC
                """,
                (ev_id,),
            )
            atts = [dict(a) for a in cur.fetchall()]
            eff_color = r["custom_color"] or r["category_color"] or "#A7F3D0"
            eff_icon = r["custom_icon"] or r["category_icon"] or "🌿"
            prio = r["priority"] or "normal"
            prio_prefix = (
                "🔥 " if prio == "urgent" else ("⭐ " if prio == "important" else ("🎯 " if prio == "exam" else ""))
            )
            events.append(
                {
                    "id": ev_id,
                    "title": f"{prio_prefix}{eff_icon} {r['title']}",
                    "start_dt": parse_db_dt(r["start_time"]),
                    "end_dt": parse_db_dt(r["end_time"]),
                    "category_name": r["category_name"] or "Công việc",
                    "category_color": eff_color,
                    "category_icon": eff_icon,
                    "attachments": atts,
                }
            )
        return events
    except Exception:
        return []
    finally:
        conn.close()


def mark_event_completed(event_id: int):
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute(
        "UPDATE events SET status = 'completed', updated_at = ? WHERE id = ?",
        (datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"), event_id),
    )
    conn.commit()
    conn.close()


def open_attachment_file(stored_name: str):
    file_path = UPLOADS_DIR / stored_name
    if file_path.exists() and hasattr(os, "startfile"):
        os.startfile(str(file_path))


class MintDesktopWidget(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()
        self.always_on_top = True
        self.minimized_body = False
        self.drag_pos = None
        self.events_cache = []
        self.last_structure_signature = None

        self.init_window()
        self.build_ui()
        self.reload_data(force_rebuild=True)

        # Timer 1 giây để đếm ngược thời gian thực
        self.tick_timer = QtCore.QTimer(self)
        self.tick_timer.timeout.connect(self.on_second_tick)
        self.tick_timer.start(1000)

        # Timer 3 giây để tự động đồng bộ dữ liệu mới từ schedule.db
        self.sync_timer = QtCore.QTimer(self)
        self.sync_timer.timeout.connect(lambda: self.reload_data(force_rebuild=False))
        self.sync_timer.start(3000)

    def init_window(self):
        self.setWindowTitle("Bảng Nhắc Việc & Đếm Ngược 🌿")
        flags = QtCore.Qt.FramelessWindowHint | QtCore.Qt.Tool
        if self.always_on_top:
            flags |= QtCore.Qt.WindowStaysOnTopHint
        self.setWindowFlags(flags)
        self.setAttribute(QtCore.Qt.WA_TranslucentBackground, True)
        self.setFixedWidth(385)

        # Đặt mặc định ở góc phải màn hình chính Laptop
        screen = QtWidgets.QApplication.primaryScreen().availableGeometry()
        self.move(screen.width() - 405, 36)

    def build_ui(self):
        root_layout = QtWidgets.QVBoxLayout(self)
        root_layout.setContentsMargins(10, 10, 10, 10)

        # Khung thẻ chính bo góc tròn màu Mint Pastel giống 1:1 ảnh chụp
        self.card = QtWidgets.QFrame(self)
        self.card.setObjectName("MainCard")
        self.card.setStyleSheet(
            """
            QFrame#MainCard {
                background-color: #FFFFFF;
                border: 2px solid #A7F3D0;
                border-radius: 22px;
            }
            """
        )
        shadow = QtWidgets.QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(24)
        shadow.setOffset(0, 6)
        shadow.setColor(QtGui.QColor(16, 185, 129, 55))
        self.card.setGraphicsEffect(shadow)

        card_layout = QtWidgets.QVBoxLayout(self.card)
        card_layout.setContentsMargins(0, 0, 0, 0)
        card_layout.setSpacing(0)

        # 1. Thanh tiêu đề Xanh Mint Pastel (Header)
        self.header = QtWidgets.QFrame(self.card)
        self.header.setObjectName("HeaderBar")
        self.header.setStyleSheet(
            """
            QFrame#HeaderBar {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #84E9CA, stop:0.5 #79E2D4, stop:1 #8EEBF5);
                border-top-left-radius: 20px;
                border-top-right-radius: 20px;
                border-bottom: 1px solid #A7F3D0;
            }
            """
        )
        header_layout = QtWidgets.QHBoxLayout(self.header)
        header_layout.setContentsMargins(14, 10, 12, 10)

        bell_lbl = QtWidgets.QLabel("🔔")
        bell_lbl.setStyleSheet("font-size: 18px; background: transparent;")
        header_layout.addWidget(bell_lbl)

        title_col = QtWidgets.QVBoxLayout()
        title_col.setSpacing(1)
        t1 = QtWidgets.QLabel("Bảng Nhắc Việc & Đếm Ngược")
        t1.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 13px; font-weight: 800; color: #0D4F44; background: transparent;"
        )
        self.sub_lbl = QtWidgets.QLabel("Đang ghim trên màn hình Laptop 🌿")
        self.sub_lbl.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 11px; font-weight: 600; color: #166558; background: transparent;"
        )
        title_col.addWidget(t1)
        title_col.addWidget(self.sub_lbl)
        header_layout.addLayout(title_col, 1)

        # Các nút góc phải Header: Mở lịch Web, Ghim nổi (📌), Thu gọn (—), Đóng (✕)
        btn_style = """
            QPushButton {
                background-color: rgba(255, 255, 255, 0.55);
                color: #0D4F44;
                border: none;
                border-radius: 11px;
                font-size: 12px;
                font-weight: bold;
                padding: 4px 7px;
            }
            QPushButton:hover {
                background-color: rgba(255, 255, 255, 0.85);
            }
        """

        self.btn_pin = QtWidgets.QPushButton("📌")
        self.btn_pin.setToolTip("Bật/Tắt chế độ luôn nổi trên mọi cửa sổ (Always on Top)")
        self.btn_pin.setStyleSheet(btn_style)
        self.btn_pin.setCursor(QtCore.Qt.PointingHandCursor)
        self.btn_pin.clicked.connect(self.toggle_always_on_top)
        header_layout.addWidget(self.btn_pin)

        self.btn_min = QtWidgets.QPushButton("—")
        self.btn_min.setToolTip("Thu gọn / Mở rộng khung nhắc việc")
        self.btn_min.setStyleSheet(btn_style)
        self.btn_min.setCursor(QtCore.Qt.PointingHandCursor)
        self.btn_min.clicked.connect(self.toggle_minimize_body)
        header_layout.addWidget(self.btn_min)

        self.btn_close = QtWidgets.QPushButton("✕")
        self.btn_close.setToolTip("Đóng khung widget")
        self.btn_close.setStyleSheet(btn_style)
        self.btn_close.setCursor(QtCore.Qt.PointingHandCursor)
        self.btn_close.clicked.connect(self.close)
        header_layout.addWidget(self.btn_close)

        card_layout.addWidget(self.header)

        # 2. Phần thân (Body) chứa Hero Focus Box & Danh sách việc cần làm
        self.body_widget = QtWidgets.QWidget(self.card)
        self.body_layout = QtWidgets.QVBoxLayout(self.body_widget)
        self.body_layout.setContentsMargins(14, 14, 14, 14)
        self.body_layout.setSpacing(12)

        card_layout.addWidget(self.body_widget)
        root_layout.addWidget(self.card)

    def toggle_always_on_top(self):
        self.always_on_top = not self.always_on_top
        pos = self.pos()
        flags = QtCore.Qt.FramelessWindowHint | QtCore.Qt.Tool
        if self.always_on_top:
            flags |= QtCore.Qt.WindowStaysOnTopHint
            self.sub_lbl.setText("Luôn nổi trên màn hình Laptop 📌")
        else:
            self.sub_lbl.setText("Nằm trên nền Desktop 🌿")
        self.setWindowFlags(flags)
        self.move(pos)
        self.show()

    def toggle_minimize_body(self):
        self.minimized_body = not self.minimized_body
        self.body_widget.setVisible(not self.minimized_body)
        self.btn_min.setText("▢" if self.minimized_body else "—")
        self.adjustSize()

    def reload_data(self, force_rebuild=False):
        events = fetch_pending_events()
        sig = tuple(
            (e["id"], e["title"], str(e["start_dt"]), str(e["end_dt"]), len(e["attachments"]))
            for e in events
        )
        self.events_cache = events
        if force_rebuild or sig != self.last_structure_signature:
            self.last_structure_signature = sig
            self.rebuild_body_ui()
        else:
            self.on_second_tick()

    def clear_layout(self, layout):
        while layout.count():
            item = layout.takeAt(0)
            w = item.widget()
            if w is not None:
                w.deleteLater()
            elif item.layout() is not None:
                self.clear_layout(item.layout())

    def rebuild_body_ui(self):
        self.clear_layout(self.body_layout)
        self.focus_timer_label = None
        self.focus_label_text = None
        self.focus_progress_bar = None
        self.row_timer_labels = {}

        now = datetime.now()
        events = self.events_cache

        if not events:
            empty_box = QtWidgets.QFrame()
            empty_box.setStyleSheet(
                """
                QFrame {
                    background-color: #F2FDF9;
                    border: 1.5px solid #C6F7E9;
                    border-radius: 16px;
                    padding: 16px;
                }
                """
            )
            elayout = QtWidgets.QVBoxLayout(empty_box)
            lbl = QtWidgets.QLabel("🐰🌿\nTuyệt vời! Không còn công việc tồn đọng!")
            lbl.setAlignment(QtCore.Qt.AlignCenter)
            lbl.setStyleSheet(
                "font-family: 'Segoe UI'; font-size: 12.5px; font-weight: 700; color: #134E48; border: none;"
            )
            elayout.addWidget(lbl)
            self.body_layout.addWidget(empty_box)
            self.adjustSize()
            return

        # Chọn công việc tiêu điểm (Đang diễn ra hoặc sắp tới gần nhất)
        active = next(
            (e for e in events if e["start_dt"] <= now <= e["end_dt"]),
            events[0],
        )
        cd = get_countdown_info(active["start_dt"], active["end_dt"], now)

        # --- HERO FOCUS BOX (Giống hệt khung trên trong ảnh chụp của bạn) ---
        focus_box = QtWidgets.QFrame()
        focus_box.setObjectName("FocusBox")
        focus_box.setStyleSheet(
            """
            QFrame#FocusBox {
                background-color: #F0FDF9;
                border: 1.5px solid #B6F2E0;
                border-radius: 18px;
            }
            """
        )
        flayout = QtWidgets.QVBoxLayout(focus_box)
        flayout.setContentsMargins(13, 12, 13, 12)
        flayout.setSpacing(8)

        # Dòng 1: Huy hiệu "VIỆC SẮP TỚI GẦN NHẤT" + Danh mục
        top_row = QtWidgets.QHBoxLayout()
        badge_lbl = QtWidgets.QLabel(cd["header_badge"])
        badge_lbl.setStyleSheet(
            """
            background-color: #FFFFFF;
            color: #0F766E;
            border: 1px solid #A7F3D0;
            border-radius: 10px;
            padding: 3px 9px;
            font-family: 'Segoe UI';
            font-size: 10px;
            font-weight: 800;
            """
        )
        cat_lbl = QtWidgets.QLabel(f"{active['category_icon']} {active['category_name']}")
        cat_lbl.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 11px; font-weight: 700; color: #0F766E; background: transparent;"
        )
        top_row.addWidget(badge_lbl)
        top_row.addStretch(1)
        top_row.addWidget(cat_lbl)
        flayout.addLayout(top_row)

        # Dòng 2: Tiêu đề + Khung giờ + Nút "✓ Xong"
        mid_row = QtWidgets.QHBoxLayout()
        title_col = QtWidgets.QVBoxLayout()
        title_col.setSpacing(2)
        title_lbl = QtWidgets.QLabel(active["title"])
        title_lbl.setWordWrap(True)
        title_lbl.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 14px; font-weight: 800; color: #134E48; background: transparent;"
        )
        time_str = f"🕒 {format_daily_time_range(active['start_dt'], active['end_dt'])}"
        time_lbl = QtWidgets.QLabel(time_str)
        time_lbl.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 11.5px; font-weight: 600; color: #115E59; background: transparent;"
        )
        title_col.addWidget(title_lbl)
        title_col.addWidget(time_lbl)
        mid_row.addLayout(title_col, 1)

        btn_done = QtWidgets.QPushButton("✓ Xong")
        btn_done.setCursor(QtCore.Qt.PointingHandCursor)
        btn_done.setStyleSheet(
            """
            QPushButton {
                background-color: #6EE7B7;
                color: #064E3B;
                border: none;
                border-radius: 11px;
                padding: 6px 12px;
                font-family: 'Segoe UI';
                font-size: 11.5px;
                font-weight: 800;
            }
            QPushButton:hover {
                background-color: #34D399;
            }
            """
        )
        btn_done.clicked.connect(lambda _, eid=active["id"]: self.complete_task(eid))
        mid_row.addWidget(btn_done, 0, QtCore.Qt.AlignTop)
        flayout.addLayout(mid_row)

        # Dòng 3: Khung đồng hồ đếm ngược trắng bo tròn
        timer_box = QtWidgets.QFrame()
        timer_box.setStyleSheet(
            """
            QFrame {
                background-color: #FFFFFF;
                border: 1px solid #C6F7E9;
                border-radius: 12px;
            }
            """
        )
        tbox_layout = QtWidgets.QHBoxLayout(timer_box)
        tbox_layout.setContentsMargins(12, 8, 12, 8)
        self.focus_label_text = QtWidgets.QLabel(cd["label"])
        self.focus_label_text.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 11.5px; font-weight: 700; color: #115E59; border: none;"
        )
        self.focus_timer_label = QtWidgets.QLabel(cd["timer"])
        self.focus_timer_label.setProperty("event_id", active["id"])
        self.focus_timer_label.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 14px; font-weight: 800; color: #0D9488; border: none;"
        )
        tbox_layout.addWidget(self.focus_label_text)
        tbox_layout.addStretch(1)
        tbox_layout.addWidget(self.focus_timer_label)
        flayout.addWidget(timer_box)

        # Dòng 4: Thanh tiến độ Mint Pastel
        self.focus_progress_bar = QtWidgets.QProgressBar()
        self.focus_progress_bar.setRange(0, 100)
        self.focus_progress_bar.setValue(cd["progress"])
        self.focus_progress_bar.setTextVisible(False)
        self.focus_progress_bar.setFixedHeight(6)
        self.focus_progress_bar.setStyleSheet(
            """
            QProgressBar {
                background-color: #D1FAE5;
                border: none;
                border-radius: 3px;
            }
            QProgressBar::chunk {
                background-color: #6EE7B7;
                border-radius: 3px;
            }
            """
        )
        flayout.addWidget(self.focus_progress_bar)

        # Dòng 5: Danh sách các file đính kèm (.docx, .pdf...) bấm mở ngay trên máy tính
        if active["attachments"]:
            for att in active["attachments"]:
                file_btn = self.create_file_pill_button(att)
                flayout.addWidget(file_btn)

        self.body_layout.addWidget(focus_box)

        # --- TIÊU ĐỀ DANH SÁCH VIỆC CẦN LÀM + NÚT "+ Thêm việc" ---
        list_hdr = QtWidgets.QHBoxLayout()
        list_title = QtWidgets.QLabel(f"📝 DANH SÁCH VIỆC CẦN LÀM ({len(events)})")
        list_title.setStyleSheet(
            "font-family: 'Segoe UI'; font-size: 11px; font-weight: 800; color: #115E59;"
        )
        btn_add = QtWidgets.QPushButton("+ Thêm việc")
        btn_add.setCursor(QtCore.Qt.PointingHandCursor)
        btn_add.setStyleSheet(
            """
            QPushButton {
                background: transparent;
                color: #0D9488;
                border: none;
                font-family: 'Segoe UI';
                font-size: 11.5px;
                font-weight: 800;
            }
            QPushButton:hover {
                color: #0F766E;
                text-decoration: underline;
            }
            """
        )
        btn_add.clicked.connect(lambda: webbrowser.open("http://localhost:8000/?action=new"))
        list_hdr.addWidget(list_title)
        list_hdr.addStretch(1)
        list_hdr.addWidget(btn_add)
        self.body_layout.addLayout(list_hdr)

        # --- DANH SÁCH CÁC THẺ VIỆC CẦN LÀM ---
        for ev in events[:5]:
            ev_cd = get_countdown_info(ev["start_dt"], ev["end_dt"], now)
            item_box = QtWidgets.QFrame()
            item_box.setObjectName("ItemCard")
            item_box.setStyleSheet(
                """
                QFrame#ItemCard {
                    background-color: #F7FEFC;
                    border: 1.5px solid #C6F7E9;
                    border-radius: 16px;
                }
                """
            )
            ilayout = QtWidgets.QVBoxLayout(item_box)
            ilayout.setContentsMargins(11, 10, 11, 10)
            ilayout.setSpacing(6)

            r1 = QtWidgets.QHBoxLayout()
            chk_btn = QtWidgets.QPushButton("")
            chk_btn.setFixedSize(18, 18)
            chk_btn.setCursor(QtCore.Qt.PointingHandCursor)
            chk_btn.setToolTip("Đánh dấu hoàn thành")
            chk_btn.setStyleSheet(
                """
                QPushButton {
                    background-color: #FFFFFF;
                    border: 2px solid #34D399;
                    border-radius: 6px;
                }
                QPushButton:hover {
                    background-color: #A7F3D0;
                }
                """
            )
            chk_btn.clicked.connect(lambda _, eid=ev["id"]: self.complete_task(eid))
            r1.addWidget(chk_btn)

            dot = QtWidgets.QLabel("●")
            dot.setStyleSheet(f"color: {ev['category_color']}; font-size: 11px; border: none;")
            r1.addWidget(dot)

            ititle = QtWidgets.QLabel(ev["title"])
            ititle.setStyleSheet(
                "font-family: 'Segoe UI'; font-size: 12.5px; font-weight: 800; color: #134E48; border: none;"
            )
            r1.addWidget(ititle, 1)
            ilayout.addLayout(r1)

            r2 = QtWidgets.QHBoxLayout()
            itime = QtWidgets.QLabel(
                format_daily_time_range(ev["start_dt"], ev["end_dt"])
            )
            itime.setStyleSheet(
                "font-family: 'Segoe UI'; font-size: 11px; font-weight: 600; color: #0F766E; border: none;"
            )
            ibadge = QtWidgets.QLabel(ev_cd["short"])
            ibadge.setStyleSheet(
                """
                background-color: #E6FBF4;
                color: #0F766E;
                border: 1px solid #99F6E4;
                border-radius: 9px;
                padding: 2px 8px;
                font-family: 'Segoe UI';
                font-size: 10.5px;
                font-weight: 800;
                """
            )
            self.row_timer_labels[ev["id"]] = ibadge
            r2.addWidget(itime)
            r2.addStretch(1)
            r2.addWidget(ibadge)
            ilayout.addLayout(r2)

            if ev["attachments"]:
                for att in ev["attachments"]:
                    ilayout.addWidget(self.create_file_pill_button(att))

            self.body_layout.addWidget(item_box)

        self.adjustSize()

    def create_file_pill_button(self, att: dict) -> QtWidgets.QPushButton:
        fname = att["filename"]
        display_name = fname if len(fname) <= 42 else fname[:39] + "..."
        btn = QtWidgets.QPushButton(f"📘  {display_name}")
        btn.setCursor(QtCore.Qt.PointingHandCursor)
        btn.setToolTip(f"Bấm để mở trực tiếp file: {fname}")
        btn.setStyleSheet(
            """
            QPushButton {
                background-color: #FFFFFF;
                color: #115E59;
                border: 1px solid #B6F2E0;
                border-radius: 10px;
                padding: 5px 10px;
                text-align: left;
                font-family: 'Segoe UI';
                font-size: 11px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #E6FBF4;
                border-color: #6EE7B7;
            }
            """
        )
        btn.clicked.connect(lambda _, sname=att["stored_name"]: open_attachment_file(sname))
        return btn

    def complete_task(self, event_id: int):
        mark_event_completed(event_id)
        self.reload_data(force_rebuild=True)

    def on_second_tick(self):
        if not self.events_cache:
            return
        now = datetime.now()
        active = next(
            (e for e in self.events_cache if e["start_dt"] <= now <= e["end_dt"]),
            self.events_cache[0],
        )
        cd = get_countdown_info(active["start_dt"], active["end_dt"], now)
        if self.focus_timer_label:
            self.focus_timer_label.setText(cd["timer"])
        if self.focus_label_text:
            self.focus_label_text.setText(cd["label"])
        if self.focus_progress_bar:
            self.focus_progress_bar.setValue(cd["progress"])

        for ev in self.events_cache:
            lbl = self.row_timer_labels.get(ev["id"])
            if lbl:
                ecd = get_countdown_info(ev["start_dt"], ev["end_dt"], now)
                lbl.setText(ecd["short"])

    # Cho phép giữ chuột kéo khung Widget tới mọi vị trí trên màn hình chính Laptop
    def mousePressEvent(self, event: QtGui.QMouseEvent):
        if event.button() == QtCore.Qt.LeftButton:
            self.drag_pos = event.globalPos() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event: QtGui.QMouseEvent):
        if self.drag_pos is not None and event.buttons() & QtCore.Qt.LeftButton:
            self.move(event.globalPos() - self.drag_pos)
            event.accept()

    def mouseReleaseEvent(self, event: QtGui.QMouseEvent):
        self.drag_pos = None


def main():
    QtWidgets.QApplication.setAttribute(QtCore.Qt.AA_EnableHighDpiScaling, True)
    QtWidgets.QApplication.setAttribute(QtCore.Qt.AA_UseHighDpiPixmaps, True)
    app = QtWidgets.QApplication(sys.argv)
    widget = MintDesktopWidget()
    widget.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
