@echo off
chcp 65001 > nul
title Vega API - Servisi Kaldır

echo ============================================================================
echo                    VEGA API SERVİSİNİ KALDIRMA
echo ============================================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Servisi kaldırabilmek için bu dosyayı Yönetici Olarak Çalıştırın.
    pause
    exit /b 1
)

echo [1/2] Çalışan işlemler sonlandırılıyor...
schtasks /end /tn "VegaApiService" >nul 2>&1
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [2/2] Windows Görev Zamanlayıcı kaydı siliniyor...
schtasks /delete /tn "VegaApiService" /f >nul 2>&1

echo.
echo [OK] VegaApiService başarıyla sistemden kaldırıldı.
echo.
pause
exit /b 0
