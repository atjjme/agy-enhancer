@echo off
chcp 65001 >nul
title Antigravity Enhancer - Settings

set "SCRIPTS_DIR=%~dp0"
pushd "%SCRIPTS_DIR%.."
set "ROOT_DIR=%CD%"
popd

:: 确保后台守护注入与设置服务运行（单实例安全守护）
wscript.exe "%SCRIPTS_DIR%start-service-silent.vbs"

:: 打开默认浏览器
start "" "%ROOT_DIR%\settings.html"

exit /b 0
