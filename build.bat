@echo off
echo ========================================
echo Invoice Creator - Build Script
echo ========================================
echo.

:: Navigate to project directory
cd /d "%~dp0"

:: Step 1: Build frontend
echo [1/3] Building frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
cd ..
echo Frontend built successfully.
echo.

:: Step 2: Verify portable Node.js exists
echo [2/3] Checking portable Node.js...
if not exist "portable-node\node\node.exe" (
    echo ERROR: Portable Node.js not found!
    echo Please download Node.js portable and extract to portable-node\node\
    pause
    exit /b 1
)
echo Portable Node.js found.
echo.

:: Step 3: Create installer with Inno Setup
echo [3/3] Creating installer...
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    "C:\Program Files\Inno Setup 6\ISCC.exe" installer\setup.iss
) else (
    echo WARNING: Inno Setup not found. Installer not created.
    echo Install Inno Setup 6 from: https://jrsoftware.org/isdl.php
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build complete!
echo ========================================
echo.
if exist "dist\Invoice Creator Setup*.exe" (
    echo Installer created: dist\Invoice Creator Setup 1.2.4.exe
    echo.
    echo Your customers just need to:
    echo   1. Download the .exe
    echo   2. Run it to install
    echo   3. Click the desktop shortcut
    echo.
)
pause
