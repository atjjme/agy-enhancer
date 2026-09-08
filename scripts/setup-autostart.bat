@echo off
chcp 65001 >nul
title Antigravity Enhancer - Setup Autostart

echo ====================================================
echo    Configuring Antigravity Enhancer Autostart...
echo ====================================================
echo.

set "SCRIPTS_DIR=%~dp0"
pushd "%SCRIPTS_DIR%.."
set "ROOT_DIR=%CD%\"
popd
set "VBS_PATH=%SCRIPTS_DIR%start-service-silent.vbs"

if not exist "%VBS_PATH%" (
    echo [Error] Silent start script not found: "%VBS_PATH%"
    echo Please verify file integrity and try again.
    if "%1" neq "--nopause" pause
    exit /b 1
)

:: 使用 PowerShell 创建启动快捷方式，自动获取当前系统真实 Startup 目录
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$startupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup);" ^
    "$oldShortcut = Join-Path $startupDir 'AntigravityReaderEnhancer.lnk'; if (Test-Path $oldShortcut) { Remove-Item $oldShortcut -Force };" ^
    "$shortcutPath = Join-Path $startupDir 'AntigravityEnhancer.lnk';" ^
    "$shortcut = $ws.CreateShortcut($shortcutPath);" ^
    "$shortcut.TargetPath = '%VBS_PATH%';" ^
    "$shortcut.WorkingDirectory = '%ROOT_DIR%';" ^
    "$shortcut.Description = 'Antigravity Enhancer Silent Service';" ^
    "$shortcut.Save();" ^
    "if (Test-Path $shortcutPath) { exit 0 } else { exit 1 }"

if %ERRORLEVEL% equ 0 (
    echo [Success] Autostart shortcut configured successfully!
    echo.
    echo Shortcut added to Startup folder:
    powershell -NoProfile -Command "Write-Host ('  ' + (Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)) 'AntigravityEnhancer.lnk')) -ForegroundColor Green"
    echo.
    echo The service will start silently on every system login.
    echo.

    :: 仅在独立运行（非 install.bat 调用）时检查并启动后台服务
    if "%1" neq "--nopause" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "$proc = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*loader.js*' };" ^
            "if ($proc) { Write-Host ('[Status] Daemon is already running in background (PID: ' + $proc.ProcessId + ').') -ForegroundColor Yellow }" ^
            "else { Start-Process -FilePath 'wscript.exe' -ArgumentList '\"%VBS_PATH%\"'; Write-Host '[Status] Daemon started in background.' -ForegroundColor Green }"
    )
) else (
    echo [Failed] Failed to create shortcut. Please check permissions or antivirus settings.
)

echo.
echo ====================================================
if "%1" neq "--nopause" pause
