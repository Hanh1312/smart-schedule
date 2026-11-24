"""
File khởi chạy nhanh SmartSchedule (Server + Desktop Widget).
Bạn có thể bấm nút Play (▷) trong VS Code ở file này để chạy ứng dụng!
"""

import os
import subprocess
import sys
import webbrowser
from pathlib import Path

import uvicorn

BASE_DIR = Path(__file__).resolve().parent
os.chdir(str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR))


def main():
    # 1. Khởi chạy Khung Nhắc Việc trên màn hình chính Laptop
    widget_path = BASE_DIR / "desktop_widget.py"
    if widget_path.exists():
        pythonw = Path(sys.executable).with_name("pythonw.exe")
        runner = str(pythonw) if pythonw.exists() else sys.executable
        try:
            subprocess.Popen([runner, str(widget_path)], cwd=str(BASE_DIR))
        except Exception:
            pass

    # 2. Mở trình duyệt / ứng dụng tại http://localhost:8000
    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

    # 3. Chạy FastAPI Server
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
