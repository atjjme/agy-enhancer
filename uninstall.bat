@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 一键卸载与停止服务

echo ====================================================
echo    Antigravity 阅读增强器一键卸载
echo ====================================================
echo.
echo [1/2] 正在清理开机自启动项...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\AntigravityReaderEnhancer.lnk"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo 已移除开机自启动快捷方式。
) else (
    echo 未发现开机自启动快捷方式。
)

echo.
echo [2/2] 正在停止后台守护服务...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*scripts\loader.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host '已终止进程 PID:' $_.ProcessId }"

echo.
echo 🎉 卸载与清理完成，服务已彻底退出。
echo.
pause

