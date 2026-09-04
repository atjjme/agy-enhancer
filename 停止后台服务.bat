@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 停止后台服务

echo 正在停止后台守护进程...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*scripts\loader.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host '已终止进程 PID:' $_.ProcessId }"

echo 后台服务已停止。
echo.
pause
