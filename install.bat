@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 一键安装与开机自启

echo ====================================================
echo    Antigravity 阅读增强器一键安装与自启配置
echo ====================================================
echo.
call "%~dp0设为开机自启 (一劳永逸).bat"
echo.
echo 正在后台静默启动增强服务...
wscript.exe "%~dp0启动服务 (后台静默无黑框).vbs"
echo.
echo 🎉 安装与启动完成！增强器已在后台静默运行。
echo.
pause

