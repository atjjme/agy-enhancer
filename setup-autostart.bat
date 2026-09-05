@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 设置开机自启

echo ====================================================
echo    正在配置 Antigravity 阅读增强器 开机自启动...
echo ====================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "VBS_PATH=%SCRIPT_DIR%start-service-silent.vbs"

if not exist "%VBS_PATH%" (
    echo [错误] 未找到静默启动脚本: "%VBS_PATH%"
    echo 请确认文件完整性后重试。
    pause
    exit /b 1
)

:: 使用 PowerShell 创建启动快捷方式，自动获取当前系统真实 Startup 目录
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$startupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup);" ^
    "$shortcutPath = Join-Path $startupDir 'AntigravityReaderEnhancer.lnk';" ^
    "$shortcut = $ws.CreateShortcut($shortcutPath);" ^
    "$shortcut.TargetPath = '%VBS_PATH%';" ^
    "$shortcut.WorkingDirectory = '%SCRIPT_DIR%';" ^
    "$shortcut.Description = 'Antigravity Reader Enhancer Silent Service';" ^
    "$shortcut.Save();" ^
    "if (Test-Path $shortcutPath) { exit 0 } else { exit 1 }"

if %ERRORLEVEL% equ 0 (
    echo [成功] 开机自启动快捷方式配置成功！
    echo.
    echo 快捷方式已添加至开机启动目录：
    powershell -NoProfile -Command "Write-Host ('  ' + (Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)) 'AntigravityReaderEnhancer.lnk')) -ForegroundColor Green"
    echo.
    echo 以后每次开机登录，服务均会在后台完全静默自动启动。
    echo.

    :: 检查当前后台是否已在运行
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$proc = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*scripts\loader.js*' };" ^
        "if ($proc) { Write-Host ('[状态] 守护进程当前已在后台运行 (PID: ' + $proc.ProcessId + ')，无需重复启动。') -ForegroundColor Yellow }" ^
        "else { Start-Process -FilePath 'wscript.exe' -ArgumentList '\"%VBS_PATH%\"'; Write-Host '[状态] 已在后台为您自动唤起守护服务。' -ForegroundColor Green }"
) else (
    echo [失败] 创建快捷方式失败，请检查是否有权限或杀毒软件限制。
)

echo.
echo ====================================================
pause
