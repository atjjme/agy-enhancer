@echo off
chcp 65001 >nul
title Antigravity Enhancer - Uninstall & Stop Service

echo ====================================================
echo    Antigravity Enhancer Uninstall
echo ====================================================
echo.
echo [1/2] Removing startup autostart shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$startupDir = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup); foreach ($name in @('AntigravityEnhancer.lnk', 'AntigravityReaderEnhancer.lnk')) { $p = Join-Path $startupDir $name; if (Test-Path $p) { Remove-Item -Path $p -Force } }; Write-Host 'Startup shortcut cleanup completed.'"

echo.
echo [2/2] Stopping background daemon...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*scripts\loader.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Stopped process PID:' $_.ProcessId }"

echo.
echo 🎉 Uninstalled successfully. Service stopped.
echo.
pause

