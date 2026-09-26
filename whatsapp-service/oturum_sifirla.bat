@echo off
chcp 65001 > nul
pushd "%~dp0"
title WHATSAPP OTURUM SIFIRLAMA
cls

echo ============================================================================
echo   MEZBAHA SERVER - WHATSAPP OTURUM SIFIRLAMA VE YENI QR KOD URETME
echo ============================================================================
echo.
echo [*] Calisan servis durduruluyor...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*whatsapp-gateway.mjs*' -or $_.CommandLine -like '*run_silent.vbs*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [*] Eski oturum dosyalari siliniyor (whatsapp_auth_session)...
if exist "%~dp0whatsapp_auth_session" (
    rmdir /s /q "%~dp0whatsapp_auth_session"
)

echo [*] Servis yeniden baslatiliyor (Yeni QR uretilecek)...
schtasks /run /tn "OneDARS_WhatsApp_Gateway" >nul 2>&1
if %errorLevel% neq 0 (
    start "" wscript.exe "%~dp0run_silent.vbs"
)

echo.
echo ============================================================================
echo   [OK] WhatsApp oturumu sifirlandi!
echo   Simdi tarayicidan web paneline (cem.amasyactas.com/whatsapp/sohbetler)
echo   girerek ekrandaki yeni QR kodu telefonunuzdan okutabilirsiniz.
echo ============================================================================
echo.
pause
