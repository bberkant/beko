@echo off
chcp 65001 > nul
pushd "%~dp0"
title MEZBAHA WHATSAPP GATEWAY CANLI TERMINAL
cls

echo ============================================================================
echo   MEZBAHA SERVER - CANLI WHATSAPP GATEWAY TERMINALI
echo ============================================================================
echo.
echo [*] Calisan arka plan gorevleri durduruluyor...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*whatsapp-gateway.mjs*' -or $_.CommandLine -like '*run_silent.vbs*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 /nobreak >nul

echo [*] WhatsApp Gateway baslatiliyor. Loglar asagida canli akacaktir:
echo     (Durdurmak icin pencereyi kapatabilir veya Ctrl+C yapabilirsiniz)
echo ============================================================================
echo.

node.exe whatsapp-gateway.mjs

echo.
echo Gateway kapandi.
pause
