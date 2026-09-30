@echo off
chcp 65001 >nul
title Antigravity Enhancer - Settings

set "SCRIPTS_DIR=%~dp0"
pushd "%SCRIPTS_DIR%.."
set "ROOT_DIR=%CD%"
popd

:: 优先唤起独立客户端 settings.exe
if exist "%ROOT_DIR%\settings.exe" (
    start "" "%ROOT_DIR%\settings.exe"
    exit /b 0
)

if exist "%SCRIPTS_DIR%settings.exe" (
    start "" "%SCRIPTS_DIR%settings.exe"
    exit /b 0
)

if exist "%ROOT_DIR%\settings-v2.exe" (
    start "" "%ROOT_DIR%\settings-v2.exe"
    exit /b 0
)

:: 确保后台守护注入与设置服务运行（单实例安全守护）
wscript.exe "%SCRIPTS_DIR%agy-enhancer.vbs"

if exist "%ROOT_DIR%\settings-v2.html" (
    start "" "%ROOT_DIR%\settings-v2.html"
    exit /b 0
)

:: 打开默认浏览器
start "" "%ROOT_DIR%\settings.html"

exit /b 0
