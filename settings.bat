@echo off
chcp 65001 >nul
title Antigravity Enhancer - Settings

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo ========================================================
echo    正在启动 Antigravity 增强器设置中心...
echo ========================================================
echo.

:: 检查后台服务是否已在运行，若未运行则自动拉起静默后台服务
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$proc = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*scripts\loader.js*' };" ^
    "if (-not $proc) {" ^
    "    Write-Host '[1/2] 正在唤醒后台守护进程...' -ForegroundColor Cyan;" ^
    "    Start-Process -FilePath 'wscript.exe' -ArgumentList '\"%SCRIPT_DIR%start-service-silent.vbs\"';" ^
    "} else {" ^
    "    Write-Host ('[1/2] 检测到后台守护进程已在运行 (PID: ' + $proc.ProcessId + ')') -ForegroundColor Green;" ^
    "}"

:: 轮询等待 37210 端口就绪（最多等待 4 秒）
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ready = $false;" ^
    "for ($i = 0; $i -lt 16; $i++) {" ^
    "    try {" ^
    "        $client = New-Object System.Net.Sockets.TcpClient;" ^
    "        $client.Connect('127.0.0.1', 37210);" ^
    "        $client.Close();" ^
    "        $ready = $true;" ^
    "        break;" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 250;" ^
    "    }" ^
    "};" ^
    "if ($ready) {" ^
    "    Write-Host '[2/2] 设置服务已就绪，正在打开默认浏览器...' -ForegroundColor Green;" ^
    "} else {" ^
    "    Write-Host '[2/2] 服务启动中，正在打开设置页面...' -ForegroundColor Yellow;" ^
    "}"

:: 打开默认浏览器
start http://127.0.0.1:37210/

exit /b 0
