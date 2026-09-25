@echo off
chcp 65001 > nul
cls
echo ============================================================================
echo   MEZBAHA SERVER - WHATSAPP GATEWAY DURUM KONTROLU
echo ============================================================================
echo.

echo [*] Calisan Node.js WhatsApp Gateway islemi kontrol ediliyor...
powershell -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*whatsapp-gateway.mjs*' }; if ($p) { Write-Host '  [OK] WhatsApp Gateway calisiyor. PID: ' $p.ProcessId -ForegroundColor Green } else { Write-Host '  [UYARI] WhatsApp Gateway arka planda CALISMIYOR!' -ForegroundColor Red }"

echo.
echo [*] Windows Gorev Zamanlayici durumu:
schtasks /query /tn "OneDARS_WhatsApp_Gateway" 2>nul | findstr /i "OneDARS_WhatsApp_Gateway"
if %errorLevel% equ 0 (
    echo   [OK] Zamanlanmis Gorev mevcut.
) else (
    echo   [UYARI] Zamanlanmis Gorev bulunamadi. install_service.bat calistirin.
)

echo.
pause
