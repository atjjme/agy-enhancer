@echo off
chcp 65001 >nul
title Antigravity Enhancer - Daemon
echo ====================================================
echo    Antigravity Enhancer (Hot-Reload Mode)
echo ====================================================
echo.
echo [Info] 100%% zero-intrusion, safe for original app files.
echo [Feature 1] Automatically loads on window open or Ctrl+R refresh.
echo [Feature 2] Hot-updates when saving src\agy-enhancer.js.
echo.
echo Keep this window open. Minimizing will not affect usage.
echo.
node "%~dp0scripts\loader.js"
pause
