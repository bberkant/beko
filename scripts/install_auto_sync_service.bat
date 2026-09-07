@echo off
chcp 65001 > nul
echo =========================================================
echo  One DARS - Ofis Kasa Otomatik Senkronizasyon Kurulumu
echo =========================================================
echo.

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT_DIR=%CD%"
popd

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [*] Proje Dizini: %PROJECT_DIR%
echo [*] Windows Baslangic klasorune otomatik baslatici ekleniyor...

(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%PROJECT_DIR%"
echo Do While True
echo     WshShell.Run "node scripts/run_sync_daemon.js", 0, True
echo     WScript.Sleep 3000
echo Loop
) > "%STARTUP_DIR%\OneDARS_Kasa_Sync.vbs"

echo [OK] Windows Baslangic klasorune OneDARS_Kasa_Sync.vbs yazildi.
echo.
echo [*] Gorev Zamanlayici (Task Scheduler) yapilandiriliyor...
schtasks /create /tn "OneDARS_Excel_Supabase_Sync" /tr "wscript.exe \"%STARTUP_DIR%\OneDARS_Kasa_Sync.vbs\"" /sc ONLOGON /rl HIGHEST /f > nul 2>&1

echo [*] Eski arka plan servisleri durdurulup yenisi sessizce baslatiliyor...
taskkill /f /fi "WINDOWTITLE eq OneDARS_Daemon*" > nul 2>&1
start "" wscript.exe "%STARTUP_DIR%\OneDARS_Kasa_Sync.vbs"

echo.
echo =========================================================
echo  ✅ KURULUM BASARIYLA TAMAMLANDI!
echo.
echo  Artik bu bilgisayarda SENKRONIZE_ET.bat dosyasini
echo  ELLE CALISTIRMANIZA GEREK YOKTUR.
echo.
echo  - Bilgisayar her acildiginda arka planda sessizce baslar.
echo  - Excel'i kaydedip kapattiginizda 60 saniye icinde otomatik
echo    olarak Supabase'e ve sisteme aktarilir.
echo =========================================================
pause
