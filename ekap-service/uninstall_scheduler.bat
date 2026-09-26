@echo off
chcp 65001 > nul
pushd "%~dp0"
cls

echo ============================================================================
echo   EKAP ZAMANLANMIS GOREVI KALDIRILIYOR
echo ============================================================================
echo.

schtasks /delete /tn "OneDARS_EKAP_Daily_Scanner" /f >nul 2>&1
echo [OK] EKAP otomatik tarama gorevi kaldirildi.
echo.
pause
