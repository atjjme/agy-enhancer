@echo off
chcp 65001 >nul
title Antigravity Enhancer - Settings

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: 检查后台服务是否已在运行，若未运行则自动在后台静默启动
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$proc = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*scripts\loader.js*' };" ^
    "if (-not $proc) { Start-Process -FilePath 'wscript.exe' -ArgumentList '\"%SCRIPT_DIR%start-service-silent.vbs\"'; Start-Sleep -Milliseconds 800 }"

:: 打开默认浏览器访问设置中心
start http://127.0.0.1:37210/

exit /b 0
