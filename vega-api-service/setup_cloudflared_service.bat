@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title Cloudflare Tunnel - Kalıcı Windows Servis Kurulumu

echo ============================================================================
echo         CLOUDFLARE TUNNEL (vega-api.amasyaetas.com) KALICI SERVİS
echo ============================================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [HATA] Lütfen bu dosyayı Yönetici Olarak Çalıştırın.
    pause
    exit /b 1
)

where cloudflared >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] cloudflared.exe sistem yolunda bulundu.
    for /f "tokens=*" %%i in ('where cloudflared') do set "CLOUDFLARED_EXE=%%i"
) else (
    if exist "%~dp0cloudflared.exe" (
        set "CLOUDFLARED_EXE=%~dp0cloudflared.exe"
        echo [OK] cloudflared.exe klasörde bulundu: !CLOUDFLARED_EXE!
    ) else if exist "C:\cloudflared\cloudflared.exe" (
        set "CLOUDFLARED_EXE=C:\cloudflared\cloudflared.exe"
        echo [OK] cloudflared.exe C:\cloudflared içinde bulundu.
    ) else (
        echo [BİLGİ] cloudflared.exe otomatik bulunamadı.
        echo Eğer Cloudflare Tunnel tünel belirteci (token) ile çalışıyorsa:
        echo Komut: cloudflared service install ^<TOKEN^>
        echo.
        set /p "TOKEN=Lütfen Cloudflare Tunnel Token giriniz (veya Enter ile geçin): "
        if not "!TOKEN!"=="" (
            cloudflared service install !TOKEN!
            echo [OK] Cloudflare Tunnel servisi kuruldu!
        )
        pause
        exit /b 0
    )
)

echo.
echo Cloudflare Tunnel Hizmet Durumu Kontrol Ediliyor:
sc query Cloudflared 2>nul
if %errorLevel% equ 0 (
    echo.
    echo [OK] Cloudflared Windows Hizmeti zaten mevcut ve kurulmuş durumda.
    echo Hizmet başlatılıyor...
    net start Cloudflared >nul 2>&1
) else (
    echo.
    echo Hizmet henüz Windows Service olarak kurulmamış.
    echo Belirteç (Token) ile otomatik kurmak için token giriniz:
    set /p "TOKEN=Token: "
    if not "!TOKEN!"=="" (
        "!CLOUDFLARED_EXE!" service install !TOKEN!
        net start Cloudflared
    )
)

echo.
echo ============================================================================
pause
exit /b 0
