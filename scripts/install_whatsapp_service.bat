@echo off
chcp 65001 > nul
echo =========================================================
echo  One DARS - WhatsApp Gateway Otomatik Başlatma Kurulumu
echo =========================================================
echo.

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT_DIR=%CD%"
popd

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [*] Proje Dizini: %PROJECT_DIR%
echo [*] Windows Başlangıç klasörüne otomatik başlatıcı ekleniyor...

(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%PROJECT_DIR%"
echo Do While True
echo     WshShell.Run "node scripts/whatsapp-gateway.mjs", 0, True
echo     WScript.Sleep 3000
echo Loop
) > "%STARTUP_DIR%\OneDARS_WhatsApp_Gateway.vbs"

echo [OK] Windows Başlangıç klasörüne OneDARS_WhatsApp_Gateway.vbs yazıldı.
echo.
echo [*] Görev Zamanlayıcı (Task Scheduler) yapılandırılıyor...
schtasks /create /tn "OneDARS_WhatsApp_Gateway" /tr "wscript.exe \"%STARTUP_DIR%\OneDARS_WhatsApp_Gateway.vbs\"" /sc ONLOGON /rl HIGHEST /f > nul 2>&1

echo [*] Arka plan servisi sessizce başlatılıyor...
start "" wscript.exe "%STARTUP_DIR%\OneDARS_WhatsApp_Gateway.vbs"

echo.
echo =========================================================
echo  ✅ KURULUM BAŞARIYLA TAMAMLANDI!
echo.
echo  WhatsApp Gateway artık:
echo  - Bilgisayar her açıldığında arka planda sessizce başlar.
echo  - Konsol penceresi açılmaz, çalışmalarınızı engellemez.
echo  - Servis olası bir sebeple kapanırsa 3 saniye sonra otomatik yeniden başlar.
echo =========================================================
echo.
pause
