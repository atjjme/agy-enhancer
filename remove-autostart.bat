@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 取消开机自启

echo ====================================================
echo    正在取消 Antigravity 阅读增强器 开机自启动...
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); $shortcutPath = Join-Path $startupDir 'AntigravityReaderEnhancer.lnk'; if (Test-Path $shortcutPath) { Remove-Item -Path $shortcutPath -Force; Write-Host '[成功] 已从开机启动目录移除自启动快捷方式。' -ForegroundColor Green } else { Write-Host '[提示] 开机启动目录中未找到自启快捷方式，无需移除。' -ForegroundColor Yellow }"

echo.
echo ====================================================
pause
