@echo off
pushd "%~dp0"
cls
setlocal enabledelayedexpansion

echo ============================================================================
echo   MEZBAHA SERVER - 7/24 WHATSAPP GATEWAY HIZMETI KURULUMU
echo ============================================================================
echo.

:: 1. Yonetici Yetkisi Kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Bu kurulum icin Yonetici Yetkisi gereklidir.
    echo Sag tiklayip "Yonetici Olarak Calistir" (Run as administrator) secin.
    echo.
    pause
    exit /b 1
)

:: 2. Node.js Kontrolu
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Node.js sistem yolunda bulunamadi!
    echo Lutfen sunucuya Node.js kurun veya PATH degiskenini kontrol edin.
    pause
    exit /b 1
)

set "CUR_DIR=%~dp0"
if "%CUR_DIR:~-1%"=="\" set "CUR_DIR=%CUR_DIR:~0,-1%"
set "GATEWAY_MJS=%CUR_DIR%\whatsapp-gateway.mjs"
set "RUN_VBS=%CUR_DIR%\run_silent.vbs"

if not exist "%GATEWAY_MJS%" (
    echo [HATA] whatsapp-gateway.mjs bulunamadi: %GATEWAY_MJS%
    pause
    exit /b 1
)

:: 3. Bagimliliklar (node_modules) Kontrolu
if not exist "%CUR_DIR%\node_modules" (
    echo [INFO] Paket bagimliliklari (Baileys, Supabase vb.) yukleniyor...
    call npm install --production
    if %errorLevel% neq 0 (
        echo [HATA] npm install basarisiz oldu!
        pause
        exit /b 1
    )
)

:: 4. VBScript Gizli Calistiriciyi Olustur
echo [INFO] Sessiz arka plan calistiricisi hazirlaniyor...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%CUR_DIR%"
echo Do While True
echo     WshShell.Run "node.exe whatsapp-gateway.mjs", 0, True
echo     WScript.Sleep 3000
echo Loop
) > "%RUN_VBS%"

:: 5. Eski Gorevi Temizle
echo [INFO] Varsa eski servis kayitlari temizleniyor...
schtasks /delete /tn "OneDARS_WhatsApp_Gateway" /f >nul 2>&1
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*whatsapp-gateway.mjs*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 6. Windows Task Scheduler ile Kalici Hizmet Olustur
echo [INFO] Kalici Windows Sistem Hizmeti (OneDARS_WhatsApp_Gateway) olusturuluyor...

schtasks /create /tn "OneDARS_WhatsApp_Gateway" /tr "wscript.exe \"%RUN_VBS%\"" /sc onstart /ru SYSTEM /rl highest /f >nul 2>&1
if %errorLevel% neq 0 (
    echo [BILGI] SYSTEM yetkisi alinamadi, kullanici oturumuna kaydediliyor...
    schtasks /create /tn "OneDARS_WhatsApp_Gateway" /tr "wscript.exe \"%RUN_VBS%\"" /sc onlogon /rl highest /f >nul 2>&1
)

:: 7. Hemen Baslat
echo [INFO] Servis calistiriliyor...
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
echo  - Servis duserse 3 saniye icinde otomatik kendini ayaga kaldirir.
echo.
echo  Simdi tarayicinizdan web panelini acarak (cem.amasyactas.com/whatsapp/sohbetler)
echo  ekrana gelen yeni QR kodu telefonunuzdan 1 kez okutmaniz yeterlidir.
echo.
pause
