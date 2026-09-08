@echo off
chcp 65001 >nul
title Antigravity Enhancer - 安装与初始化

echo ====================================================
echo    Antigravity Enhancer 一键安装与初始化配置
echo ====================================================
echo.

:: 1. 检查 Node.js 运行时环境
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js 运行环境！
    echo Antigravity Enhancer 依赖 Node.js 进行无感知后台注入与设置服务。
    echo 请先前往官网下载安装 LTS 版本：https://nodejs.org/
    echo 安装完成后，重新运行 install.bat 即可。
    echo.
    pause
    exit /b 1
)

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "SCRIPTS_DIR=%ROOT_DIR%\scripts"

:: 2. 配置 Windows 开机静默自启
echo [1/3] 配置 Windows 开机静默自启快捷方式...
call "%SCRIPTS_DIR%\setup-autostart.bat" --nopause

:: 3. 静默启动后台守护注入服务 (loader.js)
echo.
echo [2/3] 启动后台守护注入服务...
wscript.exe "%SCRIPTS_DIR%\start-service-silent.vbs"

:: 4. 唤起轻量设置微服务并打开设置中心网页
echo.
echo [3/3] 唤起设置中心 (settings.html)...
wscript.exe "%SCRIPTS_DIR%\start-service-silent.vbs" "%SCRIPTS_DIR%\settings-server.js"

start "" "http://127.0.0.1:37210/"

:: 运行完成，自动关闭当前控制台窗口
timeout /t 1 >nul 2>&1
exit /b 0

