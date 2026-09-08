@echo off
chcp 65001 >nul
title Antigravity Enhancer - Stop Background Service

echo ====================================================
echo    Stopping Antigravity Enhancer Daemon...
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$procs = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*loader.js*' -or $_.CommandLine -like '*settings-server.js*' };" ^
    "if ($procs) {" ^
    "    $procs | ForEach-Object {" ^
    "        Stop-Process -Id $_.ProcessId -Force;" ^
    "        Write-Host ('[Success] Terminated service process (PID: ' + $_.ProcessId + ')') -ForegroundColor Green;" ^
    "    }" ^
    "} else {" ^
    "    Write-Host '[Info] No running background service found.' -ForegroundColor Yellow;" ^
    "}"

echo.
echo ====================================================
pause
