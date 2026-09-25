@echo off
chcp 65001 > nul
echo =========================================================
echo  One DARS - WhatsApp Gateway Otomatik Başlatmayı Kaldır
echo =========================================================
echo.

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [*] Görev Zamanlayıcı görevi siliniyor...
schtasks /delete /tn "OneDARS_WhatsApp_Gateway" /f > nul 2>&1

echo [*] Başlangıç dosyası siliniyor...
if exist "%STARTUP_DIR%\OneDARS_WhatsApp_Gateway.vbs" (
    del /f /q "%STARTUP_DIR%\OneDARS_WhatsApp_Gateway.vbs" > nul 2>&1
)

echo [*] Çalışan WhatsApp Gateway servisi durduruluyor...
wmic process where "commandline like '%%whatsapp-gateway.mjs%%'" call terminate > nul 2>&1

echo.
echo =========================================================
echo  ✅ WhatsApp Gateway otomatik başlatma servisi kaldırıldı.
echo =========================================================
echo.
pause
