@echo off
chcp 65001 > nul
title OneDARS - Kasa Senkronizasyon
echo ==================================================================
echo 🚀 ONE DARS - OFIS KASA SENKRONIZASYON ARACI
echo ==================================================================
echo.
echo [*] En son sistem guncellemeleri aliniyor (Git Pull)...
git pull origin main

echo.
echo [*] Kasa Excel dosyalari (Ana Kasa, Giris-Cikis, Gunluk Hesap) taranip esitleniyor...
node scripts/office_cashbox_sync_agent.js

echo.
echo [*] Arka plan otomatik izleme servisi yenileniyor...
taskkill /f /fi "WINDOWTITLE eq OneDARS_Daemon*" > nul 2>&1
wscript.exe scripts/silent_sync_launcher.vbs > nul 2>&1

echo.
echo ==================================================================
echo ✅ ISLEM BASARIYLA TAMAMLANDI!
echo Bugunun ve gecmisin tum kasa verileri Supabase'e aktarildi.
echo Web panelini (localhost:5173/ana-kasa/rapor) yenileyebilirsiniz.
echo ==================================================================
pause
