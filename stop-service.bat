@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 停止后台服务

echo ====================================================
echo    正在停止 Antigravity 阅读增强器 后台守护进程...
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$procs = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*scripts\loader.js*' };" ^
    "if ($procs) {" ^
    "    $procs | ForEach-Object {" ^
    "        Stop-Process -Id $_.ProcessId -Force;" ^
    "        Write-Host ('[成功] 已终止后台服务进程 (PID: ' + $_.ProcessId + ')') -ForegroundColor Green;" ^
    "    }" ^
    "} else {" ^
    "    Write-Host '[提示] 当前未发现正在运行的阅读增强后台服务。' -ForegroundColor Yellow;" ^
    "}"

echo.
echo ====================================================
pause
