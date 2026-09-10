@echo off
chcp 65001 > nul
title Vega API - Durum Kontrolü
cd /d "%~dp0"

echo ============================================================================
echo                     VEGA API CANLI DURUM KONTROLÜ
echo ============================================================================
echo.

echo 1. Yerel API Durumu (http://localhost:5000/api/health)...
powershell -Command "try { $t0 = Get-Date; $r = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -TimeoutSec 4; $ms = [math]::Round(((Get-Date) - $t0).TotalMilliseconds); Write-Host '   [OK] Yerel Sunucu ÇALIŞIYOR! Yanıt Süresi:' $ms 'ms' -ForegroundColor Green; Write-Host '   Detay:' ($r | ConvertTo-Json -Compress) -ForegroundColor Gray } catch { Write-Host '   [HATA] Yerel Sunucu (Port 5000) ÇALIŞMIYOR! Hata:' $_.Exception.Message -ForegroundColor Red }"

echo.
echo 2. Cloudflare Tünel ^& Canlı Alan Adı (https://vega-api.amasyaetas.com/api/health)...
powershell -Command "try { $t0 = Get-Date; $r = Invoke-RestMethod -Uri 'https://vega-api.amasyaetas.com/api/health' -TimeoutSec 6; $ms = [math]::Round(((Get-Date) - $t0).TotalMilliseconds); Write-Host '   [OK] Canlı Alan Adı (Tünel) ÇALIŞIYOR! Yanıt Süresi:' $ms 'ms' -ForegroundColor Green; Write-Host '   Web Paneli Bağlantısı: %100 AKTİF' -ForegroundColor Cyan } catch { Write-Host '   [HATA] Canlı Tünele Ulaşılamadı! Hata:' $_.Exception.Message -ForegroundColor Red; Write-Host '   (İpucu: Cloudflare Tunnel servisinin veya tünel uygulamasının çalıştığından emin olun)' -ForegroundColor Yellow }"

echo.
echo 3. Windows Görev / Servis Durumu:
schtasks /query /tn "VegaApiService" /fo LIST 2>nul | findstr /i "Görev Adı TaskName Durum Status Son Çalışma Last Run Sonuç"

echo.
echo ============================================================================
echo.
pause
