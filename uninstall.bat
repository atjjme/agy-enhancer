@echo off
chcp 65001 >nul
title Antigravity 阅读增强插件 - 一键卸载
echo 正在卸载 Antigravity 阅读增强插件...
node "%~dp0scripts\uninstall.js"
echo.
pause
