@echo off
title Invoice Creator
cd /d "%~dp0"

:: Check if backend is already running
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Invoice Creator is already running!
    start "" "http://localhost:3001"
    powershell -Command "Start-Sleep -Seconds 2" >nul
    exit /b
)

:: Use bundled Node.js
set "NODE_EXE=%~dp0node\node.exe"

if not exist "%NODE_EXE%" (
    echo ERROR: Node.js not found!
    echo Please reinstall Invoice Creator.
    pause
    exit /b 1
)

:: Start the backend server
echo.
echo  =============================================
echo            Invoice Creator v1.3.3
echo  =============================================
echo.
echo  Starting server...
echo.
echo  DO NOT CLOSE THIS WINDOW while using the app.
echo  Close this window to shut down Invoice Creator.
echo.
echo  =============================================
echo.

:: Start backend in background
start /b "" "%NODE_EXE%" backend\index.js

:: Wait for backend to be ready
echo  Waiting for server to start...
set /a attempts=0
:waitloop
powershell -Command "Start-Sleep -Seconds 1" >nul
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 goto :ready
set /a attempts+=1
if %attempts% lss 30 goto :waitloop
echo  ERROR: Server failed to start.
pause
exit /b 1

:ready
echo  Server started!
echo.
start "" "http://localhost:3001"
echo  Invoice Creator is running at: http://localhost:3001
echo.

:: Keep window open
:keepalive
powershell -Command "Start-Sleep -Seconds 5" >nul
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 goto :keepalive

echo.
echo  Invoice Creator has stopped.
pause
