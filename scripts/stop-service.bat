@echo off
chcp 65001 >nul
title Antigravity Enhancer - Stop Background Service

echo ====================================================
echo    Stopping Antigravity Enhancer Daemon...
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { Invoke-RestMethod -Uri 'http://127.0.0.1:37210/api/shutdown' -TimeoutSec 1 -ErrorAction SilentlyContinue | Out-Null; Start-Sleep -Milliseconds 350 } catch {};" ^
    "$procs = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*loader.js*' -or $_.CommandLine -like '*settings-server.js*' };" ^
    "if ($procs) {" ^
    "    $procs | ForEach-Object {" ^
    "        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue;" ^
    "        Write-Host ('[Success] Terminated service process (PID: ' + $_.ProcessId + ')') -ForegroundColor Green;" ^
    "    }" ^
    "} else {" ^
    "    Write-Host '[Info] Background service stopped.' -ForegroundColor Green;" ^
    "};" ^
    "Get-Process agy-tray -ErrorAction SilentlyContinue | Stop-Process -Force"

echo.
echo ====================================================
if /i "%1" neq "--nopause" pause

