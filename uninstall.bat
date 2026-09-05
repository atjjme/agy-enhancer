@echo off
chcp 65001 >nul
title Antigravity Enhancer - Uninstall & Stop Service

echo ====================================================
echo    Antigravity Enhancer Uninstall
echo ====================================================
echo.
echo [1/2] Removing startup autostart shortcut...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_DIR%\AntigravityEnhancer.lnk" del /f /q "%STARTUP_DIR%\AntigravityEnhancer.lnk"
if exist "%STARTUP_DIR%\AntigravityReaderEnhancer.lnk" del /f /q "%STARTUP_DIR%\AntigravityReaderEnhancer.lnk"
echo Startup shortcut cleanup completed.

echo.
echo [2/2] Stopping background daemon...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*scripts\loader.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Stopped process PID:' $_.ProcessId }"

echo.
echo 🎉 Uninstalled successfully. Service stopped.
echo.
pause

