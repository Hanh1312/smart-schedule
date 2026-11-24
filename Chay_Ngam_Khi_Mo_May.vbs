Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "d:\project cá nhân\schedule-app"
' Chay ngam FastAPI Server (khong hien cua so CMD den)
WshShell.Run "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000", 0, False
' Chay khung Widget Nhac Viec tren man hinh chinh Laptop
WshShell.Run "pythonw desktop_widget.py", 0, False
