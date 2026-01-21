@echo off
title Invoice Creator - Development Mode
cd /d "%~dp0"

echo ========================================
echo Invoice Creator - Development Mode
echo ========================================
echo.
echo Starting backend and frontend...
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.

npm run dev
