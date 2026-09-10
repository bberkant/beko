@echo off
pushd "%~dp0"
cls
echo ===================================================
echo               VEGA API BASLATILIYOR
echo ===================================================
echo.
echo Calisma Dizini: %CD%
echo.
node server.js
echo.
echo ===================================================
echo Sunucu kapandi veya hata olustu.
echo ===================================================
pause
