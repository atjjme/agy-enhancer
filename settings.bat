@echo off
chcp 65001 >nul
title Antigravity Enhancer - Settings

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: 检查 37210 端口是否已就绪，若未启动则按需启动轻量设置微服务
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', 37210);" ^
    "    $client.Close();" ^
    "} catch {" ^
    "    Start-Process -FilePath 'node.exe' -ArgumentList '\"%SCRIPT_DIR%scripts\settings-server.js\"' -WindowStyle Hidden;" ^
    "    for ($i = 0; $i -lt 16; $i++) {" ^
    "        Start-Sleep -Milliseconds 200;" ^
    "        try {" ^
    "            $t = New-Object System.Net.Sockets.TcpClient;" ^
    "            $t.Connect('127.0.0.1', 37210);" ^
    "            $t.Close();" ^
    "            break;" ^
    "        } catch {}" ^
    "    }" ^
    "}"

:: 打开默认浏览器
start http://127.0.0.1:37210/

exit /b 0
