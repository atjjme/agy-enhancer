@echo off
chcp 65001 >nul
title Antigravity Enhancer - Settings

set "SCRIPTS_DIR=%~dp0"
pushd "%SCRIPTS_DIR%.."
set "ROOT_DIR=%CD%"
popd

:: 按需静默启动轻量设置微服务（若已在运行则自动忽略端口占用）
wscript.exe "%SCRIPTS_DIR%start-service-silent.vbs" "%SCRIPTS_DIR%settings-server.js"

:: 打开默认浏览器
start "" "http://127.0.0.1:37210/"

exit /b 0
