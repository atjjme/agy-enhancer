@echo off
chcp 65001 >nul
title Antigravity 阅读增强器 - 设置开机自启

echo 正在配置开机自启动...
set "VBS_PATH=%~dp0启动服务 (后台静默无黑框).vbs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\AntigravityReaderEnhancer.lnk"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%VBS_PATH%'; $s.WorkingDirectory = '%~dp0'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo ====================================================
    echo 🎉 开机自启动配置成功！
    echo 快捷方式已添加至: %SHORTCUT_PATH%
    echo 以后每次开机，增强服务都会在后台完全静默自动运行。
    echo 您无需再手动点击任何脚本！
    echo ====================================================
) else (
    echo ❌ 创建快捷方式失败，请尝试手动将 '启动服务 (后台静默无黑框).vbs' 复制到开机启动文件夹。
)

echo.
pause
