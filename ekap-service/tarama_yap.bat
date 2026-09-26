@echo off
chcp 65001 > nul
pushd "%~dp0"
title EKAP CANLI IHALE TARAYICI
cls

echo ============================================================================
echo   EKAP CANLI IHALE TARAYICI (v2.0)
echo ============================================================================
echo.
echo [*] EKAP taranıyor ve güncel et/tavuk ihaleleri çekiliyor...
echo.

node --env-file=.env ekap-scanner.mjs

echo.
echo ============================================================================
echo   Tarama tamamlandı. Çıkmak için bir tuşa basınız.
echo ============================================================================
pause
