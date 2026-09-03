; ============================================================================
; DSH-PackForge NSIS custom section (customInstall / customUnInstall)
;
; Responsibilities:
;   1) Register / unregister the .dspack preview handler COM server, mirroring
;      dspack-preview/src/DspackPreviewNative/dspack-preview-native.cpp
;      (DllRegisterServer / DllUnregisterServer).
;      NOTE: the DLL has been patched to NOT write the `.dspack` default ProgId
;      (double-click open / icon / association are owned by electron-builder's
;      fileAssociations); here we only attach the shellex preview handler.
;   2) Add / remove the CLI directory on the user PATH (dedup, case-insensitive).
; ============================================================================

!define PREVIEW_CLSID  "{7f3c5a1e-2b4d-4e6a-9c8b-1d5f7a3e9c2d}"
!define PREVIEW_CAT    "{8895b1c6-b41f-4c1c-a562-0d564250836f}"
!define PREVIEW_PROGID "DspackPreview.PreviewHandler"
!define PREVIEW_APPID  "{6d2b5079-2f0b-48dd-ab7f-97cec514d30b}"
!define CLI_DIR        "$INSTDIR\resources\cli"

!macro customInstall
  DetailPrint "Registering .dspack preview handler + CLI on PATH..."

  ; Release any lock prevhost.exe holds on the old DLL (idempotent; ignore failure)
  nsExec::Exec `taskkill /f /im prevhost.exe`
  Sleep 1000

  ; Machine-level 64-bit registry view (same location a 64-bit regsvr32 writes to)
  SetRegView 64
  WriteRegStr   HKLM "Software\Classes\CLSID\${PREVIEW_CLSID}" "" "${PREVIEW_PROGID}"
  WriteRegStr   HKLM "Software\Classes\CLSID\${PREVIEW_CLSID}" "AppID" "${PREVIEW_APPID}"
  WriteRegDWORD HKLM "Software\Classes\CLSID\${PREVIEW_CLSID}" "AutomaticallyPreviewUntrustedFiles" 1
  WriteRegStr   HKLM "Software\Classes\CLSID\${PREVIEW_CLSID}\InprocServer32" "" "$INSTDIR\resources\dspack-preview\DspackPreviewNative.dll"
  WriteRegStr   HKLM "Software\Classes\CLSID\${PREVIEW_CLSID}\InprocServer32" "ThreadingModel" "Apartment"
  WriteRegStr   HKLM "Software\Classes\.dspack\shellex\${PREVIEW_CAT}" "" "${PREVIEW_CLSID}"
  WriteRegStr   HKLM "Software\Classes\${PREVIEW_PROGID}\CLSID" "" "${PREVIEW_CLSID}"
  WriteRegStr   HKLM "Software\Classes\${PREVIEW_PROGID}\shellex\${PREVIEW_CAT}" "" "${PREVIEW_CLSID}"
  WriteRegStr   HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\PreviewHandlers" "${PREVIEW_CLSID}" "DSH-PackForge .dspack Preview Handler"
  SetRegView lastused

  ; Add CLI directory to the user PATH (dedup)
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$p=[Environment]::GetEnvironmentVariable('Path','User'); if (-not (($$p -split ';') -contains '${CLI_DIR}')) { [Environment]::SetEnvironmentVariable('Path', ($$p.TrimEnd(';') + ';' + '${CLI_DIR}'), 'User') }"`
  ; Record the CLI directory so uninstall can remove it from PATH
  WriteRegStr HKLM "Software\DSH-PackForge" "CliDir" "${CLI_DIR}"

  DetailPrint "Done: preview handler registered, CLI on PATH."
!macroend

!macro customUnInstall
  ; Remove CLI directory from PATH (read the path recorded at install time)
  ReadRegStr $0 HKLM "Software\DSH-PackForge" "CliDir"
  StrCmp $0 "" +2
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$p=[Environment]::GetEnvironmentVariable('Path','User'); [Environment]::SetEnvironmentVariable('Path', ((($$p -split ';') | Where-Object { $$_ -ne '$0' }) -join ';'), 'User')"`
  DeleteRegKey HKLM "Software\DSH-PackForge"

  ; Unregister the preview handler
  SetRegView 64
  DeleteRegKey   HKLM "Software\Classes\CLSID\${PREVIEW_CLSID}"
  DeleteRegKey   HKLM "Software\Classes\.dspack\shellex\${PREVIEW_CAT}"
  DeleteRegKey   HKLM "Software\Classes\${PREVIEW_PROGID}"
  DeleteRegValue HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\PreviewHandlers" "${PREVIEW_CLSID}"
  SetRegView lastused
!macroend
