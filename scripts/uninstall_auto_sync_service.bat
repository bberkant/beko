@echo off
chcp 65001 > nul
echo =========================================================
echo  One DARS - Otomatik Senkronizasyon Servisini Kaldirma
echo =========================================================
echo.

echo [*] Gorev Zamanlayicidan siliniyor...
schtasks /delete /tn "OneDARS_Excel_Supabase_Sync" /f > nul 2>&1

echo [*] Baslangic klasorunden siliniyor...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\OneDARS_Kasa_Sync.vbs" > nul 2>&1

echo [*] Calisan node servisleri durduruluyor...
taskkill /f /im node.exe > nul 2>&1

echo.
echo [OK] Otomatik senkronizasyon servisi basariyla kaldirildi.
pause
