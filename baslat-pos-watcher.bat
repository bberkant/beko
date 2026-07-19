@echo off
title POS Excel Klasor Izleyici Daemon
echo ========================================================
echo   DARS POS EXCEL DOSYA IZLEYICI SERVISI BASLATILIYOR
echo ========================================================
echo.
cd /d "%~dp0"
set NODE_SKIP_PLATFORM_CHECK=1
if not exist node_modules (
  echo Gerekli paketler yukleniyor. Lutfen bekleyin...
  call npm install xlsx @supabase/supabase-js
  echo Kurulum tamamlandi!
  echo.
)
"C:\Program Files\nodejs\node.exe" --env-file-if-exists=.env.local scripts/watch-pos-excel.mjs
pause
