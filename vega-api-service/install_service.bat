@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

:: ============================================================================
:: VEGA API - OTOMATİK ARKA PLAN SERVİSİ KURULUM SİHİRBAZI
:: Windows Server 2012 R2 / 2016 / 2019 / 2022 / Windows 10 / 11
:: ============================================================================

title Vega API - Kalıcı Windows Servis Kurulumu
cd /d "%~dp0"

echo ============================================================================
echo   VEGA ARCTOS ^& KESİM LİSTESİ - KALICI ARKA PLAN SERVİSİ KURULUMU
echo ============================================================================
echo.
echo Bu sihirbaz:
echo  1. Vega API'yi (server.js) Windows Açılışında Otomatik Başlayan Arka Plan
echo     Hizmeti olarak kaydedecektir.
echo  2. Masaüstünde HİÇBİR siyah CMD penceresi veya simge GÖRÜNMEYECEKTİR.
echo  3. Sunucu yeniden başlasa veya oturum açılmasa bile sistem arka planda
echo     kesintisiz çalışmaya devam edecektir.
echo  4. Çökme / hata durumunda Windows tarafından 1 saniyede otomatik yeniden
echo     başlatılacaktır (Auto-Recovery).
echo.
echo ============================================================================
echo.

:: 1. Yönetici Yetkisi Kontrolü
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Bu kurulumun yapılabilmesi için Yönetici Yetkisi gereklidir.
    echo Lütfen bu dosyaya SAĞ TIKLAYIP "Yönetici Olarak Çalıştır" seçeneğini seçin.
    echo.
    pause
    exit /b 1
)

:: 2. Node.js Kontrolü
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Node.js sistem yolunda (PATH) bulunamadı!
    echo Lütfen Node.js'in kurulu olduğundan emin olun.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('where node') do set "NODE_EXE=%%i"
echo [OK] Node.js Tespit Edildi: !NODE_EXE!

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "SERVER_JS=%SCRIPT_DIR%\server.js"
set "RUN_VBS=%SCRIPT_DIR%\run_silent.vbs"
set "LOGS_DIR=%SCRIPT_DIR%\logs"

if not exist "!SERVER_JS!" (
    echo [HATA] server.js dosyası bulunamadı: !SERVER_JS!
    pause
    exit /b 1
)

if not exist "!LOGS_DIR!" (
    mkdir "!LOGS_DIR!"
)

:: 3. VBScript Gizli Çalıştırıcıyı Oluştur/Güncelle
echo [INFO] Sessiz arka plan çalıştırıcısı hazırlanıyor...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.CurrentDirectory = "!SCRIPT_DIR!"
echo WshShell.Run "node ""!SERVER_JS!""", 0, False
) > "!RUN_VBS!"

:: 4. Mevcut Görevi / Servisi Temizle
echo [INFO] Eski servis/görev kayıtları temizleniyor...
schtasks /delete /tn "VegaApiService" /f >nul 2>&1
taskkill /f /im node.exe /fi "WINDOWTITLE eq VegaApi*" >nul 2>&1

:: 5. Windows Task Scheduler ile SYSTEM Seviyesinde Başlangıç Hizmeti Oluştur
echo [INFO] Kalıcı Windows Sistem Hizmeti (VegaApiService) oluşturuluyor...

schtasks /create /tn "VegaApiService" /tr "wscript.exe \"!RUN_VBS!\"" /sc onstart /ru SYSTEM /rl highest /f

if %errorLevel% equ 0 (
    echo [OK] Windows Sistem Hizmeti Başarıyla Kaydedildi!
) else (
    echo [UYARI] SYSTEM yetkisi alınamadı, yerel kullanıcı başlangıcına kaydediliyor...
    schtasks /create /tn "VegaApiService" /tr "wscript.exe \"!RUN_VBS!\"" /sc onlogon /rl highest /f
)

:: 6. Servisi Hemen Şimdi Arka Planda Başlat
echo [INFO] Servis şimdi arka planda başlatılıyor...
schtasks /run /tn "VegaApiService" >nul 2>&1
timeout /t 3 /nobreak >nul

:: 7. Yerel Port 5000 Sağlık Kontrolü
echo [INFO] API Sağlık Durumu Kontrol Ediliyor (http://localhost:5000/api/health)...
set "HEALTH_OK=0"
for /l %%k in (1,1,5) do (
    powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -TimeoutSec 3; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if !errorLevel! equ 0 (
        set "HEALTH_OK=1"
        goto :HealthSuccess
    )
    timeout /t 1 /nobreak >nul
)

:HealthSuccess
if "!HEALTH_OK!"=="1" (
    echo.
    echo ============================================================================
    echo   [TEBRİKLER] KURULUM BAŞARIYLA TAMAMLANDI!
    echo ============================================================================
    echo  - Vega API Arka Plan Hizmeti (Port 5000) Aktif ve Çalışıyor.
    echo  - Masaüstünde hiçbir pencere açılmayacak, tamamen sessiz çalışacaktır.
    echo  - Sunucu yeniden başlasa bile otomatik olarak çalışmaya devam edecektir.
    echo ============================================================================
) else (
    echo.
    echo ============================================================================
    echo   [BİLGİ] Hizmet Kaydedildi ve Başlatıldı.
    echo ============================================================================
    echo  Servis arka planda yükleniyor. 'status_service.bat' dosyasını çalıştırarak
    echo  dilediğiniz zaman durumunu kontrol edebilirsiniz.
    echo ============================================================================
)

echo.
pause
exit /b 0
