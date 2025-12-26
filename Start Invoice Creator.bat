@echo off
title Invoice Creator

echo Starting Invoice Creator...
echo.

:: Kill any existing backend server on port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Start backend server in background
start /B cmd /c "cd /d "%~dp0backend" && node index.js"

:: Wait a moment for backend to start
timeout /t 2 /nobreak > nul

:: Start frontend and open browser
cd /d "%~dp0frontend"
start http://localhost:5173
npm run dev
