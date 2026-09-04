; ============================================================================
; DSH-PackForge NSIS custom section (customInstall / customUnInstall)
;
; Preview handler install/uninstall mirrors dspack-preview/register-admin.cmd:
;   - use regsvr32 (calls the DLL's own DllRegisterServer / DllUnregisterServer)
;     instead of hand-writing registry keys;
;   - put the DLL under a fixed Program Files dir, so the low-integrity prevhost.exe
;     can read it, and so it is NOT removed by `RMDir /r $INSTDIR` before we can
;     regsvr32 /u it during uninstall.
; ============================================================================

!define PREVIEW_DIR "C:\Program Files\DSH-PackForge\dspack-preview"
!define PREVIEW_DLL "${PREVIEW_DIR}\DspackPreviewNative.dll"
!define CLI_DIR     "$INSTDIR\resources\cli"

!macro customInstall
  DetailPrint "Installing .dspack preview handler + CLI on PATH..."

  ; release any lock prevhost.exe holds on the old DLL (idempotent)
  nsExec::Exec `taskkill /f /im prevhost.exe`
  Sleep 1000

  ; copy DLL to the fixed Program Files dir
  CreateDirectory "${PREVIEW_DIR}"
  CopyFiles /SILENT "$INSTDIR\resources\dspack-preview\DspackPreviewNative.dll" "${PREVIEW_DLL}"

  ; register via 64-bit regsvr32 ($WINDIR\SysNative reaches the real System32 from a 32-bit installer)
  nsExec::ExecToLog '"$WINDIR\SysNative\regsvr32.exe" /s "${PREVIEW_DLL}"'

  ; add CLI directory to the user PATH (dedup)
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$p=[Environment]::GetEnvironmentVariable('Path','User'); if (-not (($$p -split ';') -contains '${CLI_DIR}')) { [Environment]::SetEnvironmentVariable('Path', ($$p.TrimEnd(';') + ';' + '${CLI_DIR}'), 'User') }"`
  ; record the CLI directory so uninstall can remove it from PATH
  WriteRegStr HKLM "Software\DSH-PackForge" "CliDir" "${CLI_DIR}"

  DetailPrint "Done: preview handler registered, CLI on PATH."
!macroend

!macro customUnInstall
  ; remove CLI directory from PATH (read the path recorded at install time)
  ReadRegStr $0 HKLM "Software\DSH-PackForge" "CliDir"
  StrCmp $0 "" +2
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$p=[Environment]::GetEnvironmentVariable('Path','User'); [Environment]::SetEnvironmentVariable('Path', ((($$p -split ';') | Where-Object { $$_ -ne '$0' }) -join ';'), 'User')"`
  DeleteRegKey HKLM "Software\DSH-PackForge"

  ; unregister the preview handler (DLL is at the fixed dir, still present here)
  nsExec::ExecToLog '"$WINDIR\SysNative\regsvr32.exe" /s /u "${PREVIEW_DLL}"'
  nsExec::Exec `taskkill /f /im prevhost.exe`

  ; remove the DLL and its directory
  Delete "${PREVIEW_DLL}"
  RMDir "${PREVIEW_DIR}"
  RMDir "C:\Program Files\DSH-PackForge"
!macroend
