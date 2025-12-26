$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Invoice Creator.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\Start Invoice Creator.bat"
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Start Invoice Creator"
$Shortcut.Save()
Write-Host "Shortcut created on desktop!"
