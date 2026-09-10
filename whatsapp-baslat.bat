@echo off
chcp 65001 > nul
title Beko ERP - Canli WhatsApp Gateway Servisi
color 0A

echo ====================================================
echo   BEKO ERP - CANLI WHATSAPP GATEWAY SERVİSİ
echo   Şirket Grupları Dinleme & Belge/Görev Yakalayıcı
echo ====================================================
echo.
echo Servis başlatılıyor, lütfen bekleyin...
echo.

cd /d "%~dp0"
node scripts/whatsapp-gateway.mjs

pause
