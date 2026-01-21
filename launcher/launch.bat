@echo off
title Invoice Creator
cd /d "%~dp0.."

:: Check if backend is already running
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Invoice Creator is already running!
    echo Opening browser...
    start "" "http://localhost:3001"
    timeout /t 3 /nobreak >nul
    exit /b
)

:: Check for portable Node.js (production install)
if exist "portable-node\node\node.exe" (
    set "NODE_EXE=%CD%\portable-node\node\node.exe"
) else if exist "launcher\node\node.exe" (
    set "NODE_EXE=%CD%\launcher\node\node.exe"
) else (
    :: Fall back to system Node.js (development)
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Node.js not found!
        echo Please install Node.js from https://nodejs.org/
        pause
        exit /b 1
    )
    set "NODE_EXE=node"
)

:: Start the backend server
echo.
echo  =============================================
echo            Invoice Creator v1.2.4
echo  =============================================
echo.
echo  Starting server...
echo.
echo  DO NOT CLOSE THIS WINDOW while using the app.
echo  Close this window to shut down Invoice Creator.
echo.
echo  =============================================
echo.

:: Start backend in background and wait for it to be ready
start /b "" "%NODE_EXE%" backend\index.js

:: Wait for backend to be ready (poll health endpoint)
echo  Waiting for server to start...
set /a attempts=0
:waitloop
timeout /t 1 /nobreak >nul
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 goto :ready
set /a attempts+=1
if %attempts% lss 30 goto :waitloop
echo  ERROR: Server failed to start after 30 seconds.
pause
exit /b 1

:ready
echo  Server started successfully!
echo.
echo  Opening browser...
start "" "http://localhost:3001"
echo.
echo  Invoice Creator is running at: http://localhost:3001
echo.

:: Keep window open and wait for user to close
:keepalive
timeout /t 5 /nobreak >nul
:: Check if backend is still running
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 goto :keepalive

echo.
echo  Invoice Creator has stopped.
pause
