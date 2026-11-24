@echo off
title SmartSchedule Server - http://localhost:8000
cd /d "%~dp0"

echo ========================================================
echo   SmartSchedule Server is starting...
echo   URL: http://localhost:8000
echo ========================================================

start "" http://localhost:8000
start "" pythonw desktop_widget.py
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
