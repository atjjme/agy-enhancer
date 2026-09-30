@echo off
setlocal
cd /d "%~dp0"

if exist "settings.exe" (
    start "" "settings.exe"
    exit /b 0
)

set "TARGET_HTML=settings.html"
set "TARGET_URL=file:///%CD:\=/%/%TARGET_HTML%"
set "USER_DIR=%TEMP%\agy_enhancer_app_profile"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1450,930 --user-data-dir="%USER_DIR%"
    exit /b 0
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1450,930 --user-data-dir="%USER_DIR%"
    exit /b 0
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1450,930 --user-data-dir="%USER_DIR%"
    exit /b 0
)

start "" "%TARGET_HTML%"
exit /b 0
