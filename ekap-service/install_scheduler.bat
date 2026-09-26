@echo off
chcp 65001 > nul
pushd "%~dp0"
cls

echo ============================================================================
echo   OFIS BILGISAYARI - EKAP GUNLUK OTOMATIK TARAMA HIZMETI KURULUMU
echo ============================================================================
echo.

:: 1. Yonetici Yetkisi Kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Bu kurulum icin Yonetici Yetkisi gereklidir.
    echo Lutfen bu dosyaya sag tiklayip "Yonetici Olarak Calistir" seciniz.
    echo.
    pause
    exit /b 1
)

:: 2. Node.js Kontrolu
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Node.js sistem yolunda bulunamadi!
    echo Lutfen bu bilgisayara Node.js yukleyin.
    echo.
    pause
    exit /b 1
)

set "CUR_DIR=%~dp0"
if "%CUR_DIR:~-1%"=="\" set "CUR_DIR=%CUR_DIR:~0,-1%"

:: 3. Bagimliliklar Kontrolu
if not exist "%CUR_DIR%\node_modules" (
    echo [INFO] Gerekli paketler yukleniyor... Lutfen bekleyin...
    call npm install --production
)

:: 4. run_daily.vbs dosyasini olustur
set "VBS_FILE=%CUR_DIR%\run_daily.vbs"
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_FILE%"
echo WshShell.CurrentDirectory = "%CUR_DIR%" >> "%VBS_FILE%"
echo WshShell.Run "node.exe --env-file=.env ekap-scanner.mjs", 0, True >> "%VBS_FILE%"

:: 5. Varsa eski gorevi temizle
schtasks /delete /tn "OneDARS_EKAP_Daily_Scanner" /f >nul 2>&1

:: 6. Windows Gorev Zamanlayici ile kaydet (Her gun saat 09:30 ve 15:30)
echo [INFO] Windows Gorev Zamanlayici gorevi olusturuluyor...
schtasks /create /tn "OneDARS_EKAP_Daily_Scanner" /tr "wscript.exe \"%VBS_FILE%\"" /sc daily /st 09:30 /rl highest /f >nul 2>&1

echo.
echo ============================================================================
echo   [TEBRIKLER] EKAP GUNLUK TARAMA GOREVI BASARIYLA KURULDU!
echo ============================================================================
echo.
echo  - Her sabah 09:30'da EKAP otomatik taranir.
echo  - Yeni ihale ciktiginda Telegram'a aninda bildirim duser.
echo  - Web panelinde ihaleleriniz onay kutusuna duser.
echo  - Masaustunuzu mesgul etmez, sessizce calisip sonlanir.
echo.
pause
