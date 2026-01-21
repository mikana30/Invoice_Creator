@echo off
title Invoice Creator - Install Shortcuts
cd /d "%~dp0"

echo.
echo  =============================================
echo       Invoice Creator - Shortcut Installer
echo  =============================================
echo.
echo  This will create shortcuts on your Desktop
echo  and in your Start Menu.
echo.

powershell -ExecutionPolicy Bypass -File "tools\create-shortcuts.ps1"

echo.
pause
