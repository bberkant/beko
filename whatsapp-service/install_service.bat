@echo off
chcp 65001 > nul
pushd "%~dp0"
cls

echo ============================================================================
echo   MEZBAHA SERVER - 7/24 WHATSAPP GATEWAY HIZMETI KURULUMU
echo ============================================================================
echo.

:: 1. Yonetici Yetkisi Kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Bu kurulum icin Yonetici Yetkisi gereklidir.
    echo Lutfen sag tiklayip Yonetici Olarak Calistir seciniz.
    echo.
    pause
    exit /b 1
)

:: 2. Node.js Kontrolu
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Node.js sistem yolunda bulunamadi!
    echo Lutfen sunucuya Node.js yukleyin veya sistem ortam degiskenlerini kontrol edin.
    echo.
    pause
    exit /b 1
)

set "CUR_DIR=%~dp0"
if "%CUR_DIR:~-1%"=="\" set "CUR_DIR=%CUR_DIR:~0,-1%"
set "GATEWAY_MJS=%CUR_DIR%\whatsapp-gateway.mjs"
set "RUN_VBS=%CUR_DIR%\run_silent.vbs"

if not exist "%GATEWAY_MJS%" (
    echo [HATA] whatsapp-gateway.mjs dosyasi bulunamadi: %GATEWAY_MJS%
    pause
    exit /b 1
)

:: 3. Bagimliliklar Kontrolu
if not exist "%CUR_DIR%\node_modules" (
    echo [INFO] Paket bagimliliklari indiriliyor... Lutfen bekleyin...
    call npm install --production
)

:: 4. run_silent.vbs dosyasini olustur
echo Set WshShell = CreateObject("WScript.Shell") > "%RUN_VBS%"
echo WshShell.CurrentDirectory = "%CUR_DIR%" >> "%RUN_VBS%"
echo Do While True >> "%RUN_VBS%"
echo     WshShell.Run "node.exe whatsapp-gateway.mjs", 0, True >> "%RUN_VBS%"
echo     WScript.Sleep 3000 >> "%RUN_VBS%"
echo Loop >> "%RUN_VBS%"

:: 5. Varsa eski gorevi temizle
echo [INFO] Eski gorevler temizleniyor...
schtasks /delete /tn "OneDARS_WhatsApp_Gateway" /f >nul 2>&1
wmic process where "commandline like '%%whatsapp-gateway.mjs%%'" call terminate >nul 2>&1

:: 6. Windows Gorev Zamanlayici ile kaydet
echo [INFO] Windows Gorev Zamanlayici hizmeti olusturuluyor...
schtasks /create /tn "OneDARS_WhatsApp_Gateway" /tr "wscript.exe \"%RUN_VBS%\"" /sc onstart /ru SYSTEM /rl highest /f >nul 2>&1
if %errorLevel% neq 0 (
    echo [BILGI] SYSTEM yetkisi alinamadi, kullanici oturumuna kaydediliyor...
    schtasks /create /tn "OneDARS_WhatsApp_Gateway" /tr "wscript.exe \"%RUN_VBS%\"" /sc onlogon /rl highest /f >nul 2>&1
)

:: 7. Hemen Baslat
echo [INFO] Servis baslatiliyor...
schtasks /run /tn "OneDARS_WhatsApp_Gateway" >nul 2>&1
if %errorLevel% neq 0 (
    start "" wscript.exe "%RUN_VBS%"
)

echo.
echo ============================================================================
echo   [TEBRIKLER] MEZBAHA WHATSAPP GATEWAY SERVISI BASARIYLA KURULDU!
echo ============================================================================
echo.
echo  - Servis Mezbaha sunucusu her acildiginda 7/24 sessizce baslar.
echo  - Masaustunde hicbir siyah konsol penceresi acilmaz.
echo  - Servis kapanirsa 3 saniye icinde otomatik kendini ayaga kaldirir.
echo.
echo  Simdi tarayicinizdan web panelini acarak (cem.amasyactas.com/whatsapp/sohbetler)
echo  ekrana gelen yeni QR kodu telefonunuzdan 1 kez okutmaniz yeterlidir.
echo.
pause
