@echo off
chcp 65001 >nul
title Antigravity Reading Enhancer - Remove Autostart

echo ====================================================
echo    Removing Antigravity Reading Enhancer Autostart...
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); $shortcutPath = Join-Path $startupDir 'AntigravityReaderEnhancer.lnk'; if (Test-Path $shortcutPath) { Remove-Item -Path $shortcutPath -Force; Write-Host '[Success] Removed autostart shortcut from Startup folder.' -ForegroundColor Green } else { Write-Host '[Info] No autostart shortcut found in Startup folder.' -ForegroundColor Yellow }"

echo.
echo ====================================================
pause
