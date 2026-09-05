@echo off
chcp 65001 >nul
title Antigravity Enhancer - Install & Autostart

echo ====================================================
echo    Antigravity Enhancer Install & Autostart
echo ====================================================
echo.
call "%~dp0setup-autostart.bat"
echo.
echo Starting background service silently...
wscript.exe "%~dp0start-service-silent.vbs"
echo.
echo 🎉 Installation complete! Enhancer is running in background.
echo.
pause

