@echo off
pushd "%~dp0"
cls
echo ============================================================================
echo   MEZBAHA SERVER - WHATSAPP GATEWAY YENIDEN BASLATILIYOR
echo ============================================================================
echo.

echo [*] Calisan servis durduruluyor...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*whatsapp-gateway.mjs*' -or $_.CommandLine -like '*run_silent.vbs*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

timeout /t 2 /nobreak >nul

echo [*] Servis yeniden baslatiliyor...
schtasks /run /tn "OneDARS_WhatsApp_Gateway" >nul 2>&1
if %errorLevel% neq 0 (
    start "" wscript.exe "%~dp0run_silent.vbs"
)

echo [OK] WhatsApp Gateway servisi basariyla yeniden baslatildi.
echo.
pause
