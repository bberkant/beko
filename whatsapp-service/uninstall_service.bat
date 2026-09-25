@echo off
cls
echo ============================================================================
echo   MEZBAHA SERVER - WHATSAPP GATEWAY SERVISI KALDIRILIYOR
echo ============================================================================
echo.

schtasks /delete /tn "OneDARS_WhatsApp_Gateway" /f >nul 2>&1
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*whatsapp-gateway.mjs*' -or $_.CommandLine -like '*run_silent.vbs*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [OK] WhatsApp Gateway servisi sistemden kaldirildi.
echo.
pause
