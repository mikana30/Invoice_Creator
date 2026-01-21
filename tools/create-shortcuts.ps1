# Invoice Creator - Shortcut Creator
# Creates Desktop and Start Menu shortcuts

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Split-Path -Parent $scriptDir
$launcherPath = Join-Path $appDir "Start Invoice Creator.bat"
$iconPath = Join-Path $appDir "assets\invoice-creator.ico"

# Check if launcher exists
if (-not (Test-Path $launcherPath)) {
    Write-Host "ERROR: Launcher not found at $launcherPath" -ForegroundColor Red
    exit 1
}

# Create WScript.Shell COM object for creating shortcuts
$WshShell = New-Object -ComObject WScript.Shell

# Desktop shortcut
$desktopPath = [Environment]::GetFolderPath("Desktop")
$desktopShortcut = Join-Path $desktopPath "Invoice Creator.lnk"

Write-Host "Creating Desktop shortcut..." -ForegroundColor Cyan
$shortcut = $WshShell.CreateShortcut($desktopShortcut)
$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $appDir
$shortcut.Description = "Invoice Creator - Professional Invoice Management"
$shortcut.WindowStyle = 7  # Minimized
if (Test-Path $iconPath) {
    $shortcut.IconLocation = $iconPath
}
$shortcut.Save()
Write-Host "  Created: $desktopShortcut" -ForegroundColor Green

# Start Menu shortcut
$startMenuPath = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"
$startMenuFolder = Join-Path $startMenuPath "Invoice Creator"

# Create Start Menu folder if it doesn't exist
if (-not (Test-Path $startMenuFolder)) {
    New-Item -ItemType Directory -Path $startMenuFolder -Force | Out-Null
}

$startMenuShortcut = Join-Path $startMenuFolder "Invoice Creator.lnk"

Write-Host "Creating Start Menu shortcut..." -ForegroundColor Cyan
$shortcut = $WshShell.CreateShortcut($startMenuShortcut)
$shortcut.TargetPath = $launcherPath
$shortcut.WorkingDirectory = $appDir
$shortcut.Description = "Invoice Creator - Professional Invoice Management"
$shortcut.WindowStyle = 7  # Minimized
if (Test-Path $iconPath) {
    $shortcut.IconLocation = $iconPath
}
$shortcut.Save()
Write-Host "  Created: $startMenuShortcut" -ForegroundColor Green

Write-Host ""
Write-Host "Shortcuts created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now launch Invoice Creator from:" -ForegroundColor White
Write-Host "  - Desktop icon" -ForegroundColor White
Write-Host "  - Start Menu > Invoice Creator" -ForegroundColor White
