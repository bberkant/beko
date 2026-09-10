@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Vega API - Servisi Yeniden Başlat

echo ============================================================================
echo                    VEGA API SERVİSİ YENİDEN BAŞLATILIYOR
echo ============================================================================
echo.

:: Yönetici Yetkisi Kontrolü
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [UYARI] Yönetici yetkisi ile çalıştırılması önerilir.
)

echo [1/3] Çalışan Vega API işlemleri sonlandırılıyor...
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
schtasks /end /tn "VegaApiService" >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/3] Servis arka planda yeniden başlatılıyor...
schtasks /run /tn "VegaApiService" >nul 2>&1
if %errorLevel% neq 0 (
    echo [BİLGİ] Görev zamanlayıcıdan başlatılamadı, doğrudan arka planda başlatılıyor...
    wscript.exe "%~dp0run_silent.vbs"
)

timeout /t 3 /nobreak >nul

echo [3/3] Sağlık Kontrolü Yapılıyor...
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -TimeoutSec 4; Write-Host '   [OK] Servis başarıyla YENİDEN BAŞLATILDI ve Port 5000 aktif!' -ForegroundColor Green } catch { Write-Host '   [BİLGİ] Servis başlatıldı, yüklenmesi birkaç saniye sürebilir.' -ForegroundColor Yellow }"

echo.
echo ============================================================================
echo İşlem tamamlandı.
echo ============================================================================
timeout /t 3 /nobreak >nul
exit /b 0
