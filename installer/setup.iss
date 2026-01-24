; Invoice Creator - Inno Setup Script
; Copyright (c) 2025 Blue Line Scannables

#define MyAppName "Invoice Creator"
#define MyAppVersion "1.3.3"
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
; Auto-uninstall previous version
UsePreviousAppDir=yes

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

[Code]
// Kill only node.exe processes running from our app directory (not other Node apps like Claude)
procedure KillNodeProcess();
var
  ResultCode: Integer;
  AppPath: String;
  PSCommand: String;
begin
  // Get the app installation path
  AppPath := ExpandConstant('{app}');
  // Use PowerShell to find and kill only node.exe processes from our app directory
  // This avoids killing other Node.js applications (like Claude Code)
  PSCommand := 'Get-WmiObject Win32_Process -Filter "name=''node.exe''" | Where-Object { $_.CommandLine -like ''*' + AppPath + '*'' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }';
  Exec('powershell.exe', '-ExecutionPolicy Bypass -NoProfile -Command "' + PSCommand + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  // Small delay to ensure process is fully terminated
  Sleep(500);
end;

function GetUninstallString(): String;
var
  sUnInstPath: String;
  sUnInstallString: String;
begin
  sUnInstPath := ExpandConstant('Software\Microsoft\Windows\CurrentVersion\Uninstall\{#emit SetupSetting("AppId")}_is1');
  sUnInstallString := '';
  if not RegQueryStringValue(HKLM, sUnInstPath, 'UninstallString', sUnInstallString) then
    RegQueryStringValue(HKCU, sUnInstPath, 'UninstallString', sUnInstallString);
  Result := sUnInstallString;
end;

function IsUpgrade(): Boolean;
begin
  Result := (GetUninstallString() <> '');
end;

function UnInstallOldVersion(): Integer;
var
  sUnInstallString: String;
  iResultCode: Integer;
begin
  Result := 0;
  sUnInstallString := GetUninstallString();
  if sUnInstallString <> '' then begin
    sUnInstallString := RemoveQuotes(sUnInstallString);
    if Exec(sUnInstallString, '/SILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, iResultCode) then
      Result := 3
    else
      Result := 2;
  end else
    Result := 1;
end;

// Called during install
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep=ssInstall) then
  begin
    // Kill node.exe before installing
    KillNodeProcess();
    if (IsUpgrade()) then
    begin
      UnInstallOldVersion();
    end;
  end;
end;

// Called during uninstall
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if (CurUninstallStep=usUninstall) then
  begin
    // Kill node.exe before uninstalling
    KillNodeProcess();
  end;
end;
