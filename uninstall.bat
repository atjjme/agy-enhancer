@echo off
chcp 65001 >nul
title Antigravity Reading Enhancer - Uninstall & Stop Service

echo ====================================================
echo    Antigravity Reading Enhancer Uninstall
echo ====================================================
echo.
echo [1/2] Removing startup autostart shortcut...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\AntigravityReaderEnhancer.lnk"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo Startup shortcut removed.
) else (
    echo No startup shortcut found.
)

echo.
echo [2/2] Stopping background daemon...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*scripts\loader.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Stopped process PID:' $_.ProcessId }"

echo.
echo 🎉 Uninstalled successfully. Service stopped.
echo.
pause

