@echo off
chcp 65001 >nul
title Antigravity Enhancer - Remove Autostart

echo ====================================================
echo    Removing Antigravity Enhancer Autostart...
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); $p1 = Join-Path $startupDir 'AntigravityEnhancer.lnk'; $p2 = Join-Path $startupDir 'AntigravityReaderEnhancer.lnk'; $removed = $false; if (Test-Path $p1) { Remove-Item -Path $p1 -Force; $removed = $true }; if (Test-Path $p2) { Remove-Item -Path $p2 -Force; $removed = $true }; if ($removed) { Write-Host '[Success] Removed autostart shortcut from Startup folder.' -ForegroundColor Green } else { Write-Host '[Info] No autostart shortcut found in Startup folder.' -ForegroundColor Yellow }"

echo.
echo ====================================================
pause
