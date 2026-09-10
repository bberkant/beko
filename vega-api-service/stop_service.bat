@echo off
chcp 65001 > nul
title Vega API - Servisi Durdur

echo ============================================================================
echo                    VEGA API SERVİSİ DURDURULUYOR
echo ============================================================================
echo.

schtasks /end /tn "VegaApiService" >nul 2>&1
powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [OK] Vega API (Port 5000) servisi durduruldu.
echo.
pause
exit /b 0
