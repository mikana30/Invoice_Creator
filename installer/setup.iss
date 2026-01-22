; Invoice Creator - Inno Setup Script
; Copyright (c) 2025 Blue Line Scannables

#define MyAppName "Invoice Creator"
#define MyAppVersion "1.3.0"
#define MyAppPublisher "Blue Line Scannables"
#define MyAppURL "https://github.com/mikana30/Invoice_Creator"
#define MyAppExeName "Invoice Creator.bat"

[Setup]
AppId={{B8C7A9E1-5D3F-4B2A-9C1E-7D8F6A5B4C3D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; Output location
OutputDir=..\dist
OutputBaseFilename=Invoice Creator Setup {#MyAppVersion}
; Compression
Compression=lzma2/ultra64
SolidCompression=yes
; Require admin for Program Files install
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
; Modern installer look
WizardStyle=modern
; Uninstaller
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Portable Node.js
Source: "..\portable-node\node\*"; DestDir: "{app}\node"; Flags: ignoreversion recursesubdirs createallsubdirs

; Backend files
Source: "..\backend\index.js"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\database.js"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\init-db.js"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "..\backend\node_modules\*"; DestDir: "{app}\backend\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; Frontend built files
Source: "..\frontend\dist\*"; DestDir: "{app}\frontend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Launcher (created during build)
Source: "..\installer\Invoice Creator.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent shellexec
