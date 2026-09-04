@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 守护助手
echo ====================================================
echo    Antigravity 阅读增强器已启动 (安全热加载模式)
echo ====================================================
echo.
echo [提示] 本助手 100%% 零侵入原版客户端文件，绝不破坏程序！
echo [功能 1] 窗口打开或按 Ctrl+R 刷新时，自动加载增强效果；
echo [功能 2] 用记事本修改 src\agy-enhancer.js 保存时，自动热更新；
echo.
echo 保持此窗口开启即可，最小化不影响使用。
echo.
node "%~dp0scripts\loader.js"
pause
