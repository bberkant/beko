@echo off
pushd "%~dp0"
cls
setlocal enabledelayedexpansion

echo ============================================================================
echo   VEGA ARCTOS ^& KESIM LISTESI - KALICI ARKA PLAN SERVISI KURULUMU
echo ============================================================================
echo.

:: 1. Yonetici Yetkisi Kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Bu kurulum icin Yonetici Yetkisi gereklidir.
    echo Sag tiklayip "Yonetici Olarak Calistir" secin.
    echo.
    pause
    exit /b 1
)

:: 2. Node.js Kontrolu
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Node.js sistem yolunda bulunamadi!
    pause
    exit /b 1
)

set "CUR_DIR=%~dp0"
if "%CUR_DIR:~-1%"=="\" set "CUR_DIR=%CUR_DIR:~0,-1%"
set "SERVER_JS=%CUR_DIR%\server.js"
set "RUN_VBS=%CUR_DIR%\run_silent.vbs"

if not exist "%SERVER_JS%" (
    echo [HATA] server.js bulunamadi: %SERVER_JS%
    pause
    exit /b 1
)

:: 3. VBScript Gizli Calistiriciyi Olustur
echo [INFO] Sessiz arka plan calistiricisi hazirlaniyor...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%CUR_DIR%"
echo WshShell.Run "node.exe server.js", 0, False
) > "%RUN_VBS%"

:: 4. Eski Gorevi Temizle
echo [INFO] Eski gorev kayitlari temizleniyor...
schtasks /delete /tn "VegaApiService" /f >nul 2>&1
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 5. Windows Task Scheduler ile Hizmet Olustur
echo [INFO] Kalici Windows Sistem Hizmeti (VegaApiService) olusturuluyor...

schtasks /create /tn "VegaApiService" /tr "wscript.exe \"%RUN_VBS%\"" /sc onstart /ru SYSTEM /rl highest /f
if %errorLevel% neq 0 (
    echo [BILGI] SYSTEM yetkisi alinamadi, kullanici oturumuna kaydediliyor...
    schtasks /create /tn "VegaApiService" /tr "wscript.exe \"%RUN_VBS%\"" /sc onlogon /rl highest /f
)

:: 6. Servisi Baslat
echo [INFO] Servis baslatiliyor...
schtasks /run /tn "VegaApiService" >nul 2>&1
wscript.exe "%RUN_VBS%"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================================
echo   [TEBRIKLER] KURULUM TAMAMLANDI!
echo ============================================================================
echo  Vega API arka planda calisiyor.
echo  Masaustunde hicbir pencere acilmayacak, sistemle birlikte baslayacaktir.
echo ============================================================================
echo.
pause
exit /b 0
