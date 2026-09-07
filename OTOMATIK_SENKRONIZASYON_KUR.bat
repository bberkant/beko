@echo off
chcp 65001 > nul
title OneDARS - Otomatik Kasa Senkronizasyon Kurulumu
echo ==================================================================
echo 🚀 ONE DARS - OTOMATIK KASA SENKRONIZASYON KURULUMU
echo ==================================================================
echo.

:: 1. En son guncellemeleri al
echo [*] Adim 1/4: En son sistem guncellemeleri aliniyor (Git Pull)...
git pull origin main
echo.

:: 2. Proje dizinini tespit et
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
echo [*] Adim 2/4: Proje klasoru dogrulandi: %PROJECT_DIR%
echo.

:: 3. Windows Baslangic klasorune VBS ekle
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
echo [*] Adim 3/4: Windows Baslangic klasorune otomatik baslatici yaziliyor...

(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%PROJECT_DIR%"
echo Do While True
echo     WshShell.Run "node scripts/run_sync_daemon.js", 0, True
echo     WScript.Sleep 3000
echo Loop
) > "%STARTUP_DIR%\OneDARS_Kasa_Sync.vbs"

if exist "%STARTUP_DIR%\OneDARS_Kasa_Sync.vbs" (
    echo [OK] Windows Baslangic klasorune basariyla eklendi.
) else (
    echo [!] Baslangic dosyasina erisilemedi.
)
echo.

:: 4. Eski servisi sonlandirip yenisini baslat
echo [*] Adim 4/4: Arka plan izleme servisi baslatiliyor...
taskkill /f /fi "WINDOWTITLE eq OneDARS_Daemon*" > nul 2>&1
start "" wscript.exe "%STARTUP_DIR%\OneDARS_Kasa_Sync.vbs"

echo.
echo ==================================================================
echo ✅ KURULUM KUSURSUZ SEKILDE TAMAMLANDI!
echo ==================================================================
echo.
echo  - Bilgisayar her acildiginda servis arka planda sessizce baslar.
echo  - Excel'de bir degisiklik kaydedildiginde 60 saniye icinde
echo    otomatik olarak sisteme ve veritabanina aktarilir.
echo  - Artik bu bilgisayarda SENKRONIZE_ET.bat dosyasini
echo    ELLE CALISTIRMANIZA GEREK KALMAMISTIR.
echo.
echo ==================================================================
pause

