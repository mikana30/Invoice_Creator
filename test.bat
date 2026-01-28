@echo off
title Invoice Creator - Build & Test
cd /d "%~dp0"

echo ========================================
echo   Invoice Creator - Build and Test
echo ========================================
echo.

echo [1/2] Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo.
    echo BUILD FAILED! Check errors above.
    pause
    exit /b 1
)
cd ..

echo.
echo [2/2] Starting server...
echo.
echo App will open in your browser at http://localhost:3001
echo Press Ctrl+C or close this window to stop.
echo ========================================
echo.

start http://localhost:3001
portable-node\node\node.exe backend\index.js
