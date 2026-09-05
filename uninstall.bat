@echo off
chcp 65001 >nul
title Antigravity Reading Enhancer - Uninstall & Stop Service

echo ====================================================
echo    Antigravity Reading Enhancer Uninstall
echo ====================================================
echo.
echo [1/2] Removing startup autostart shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$startupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); $shortcutPath = Join-Path $startupDir 'AntigravityReaderEnhancer.lnk'; if (Test-Path $shortcutPath) { Remove-Item -Path $shortcutPath -Force; Write-Host 'Startup shortcut removed.' } else { Write-Host 'No startup shortcut found.' }"

echo.
echo [2/2] Stopping background daemon...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*scripts\loader.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Stopped process PID:' $_.ProcessId }"

echo.
echo 🎉 Uninstalled successfully. Service stopped.
echo.
pause

