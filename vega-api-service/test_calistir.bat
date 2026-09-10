@echo off
chcp 65001 > nul
title Vega API Test Calistirici
cd /d "%~dp0"

echo ============================================================================
echo                      VEGA API DOĞRUDAN BAŞLATILIYOR
echo ============================================================================
echo.

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Node.js bu bilgisayarda kurulu değil veya PATH yolunda bulunamadı!
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js bulundu. Sunucu başlatılıyor...
echo.
node server.js

echo.
echo ============================================================================
echo [BILGI] Sunucu kapandı veya bir hata nedeniyle durdu.
echo ============================================================================
pause
