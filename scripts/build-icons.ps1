# agy-enhancer 图标构建脚本 (方案 E 强力醒目款)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonScript = Join-Path $scriptDir "build_scheme_e_icons.py"

if (Test-Path $pythonScript) {
    Write-Host "Running Python Scheme E icon generator..." -ForegroundColor Cyan
    python "$pythonScript"
} else {
    Write-Host "Error: $pythonScript not found." -ForegroundColor Red
}
