"""
Ofis Bilgisayarı Excel -> Supabase Otomatik Senkronizasyon Ajanı
---------------------------------------------------------------
Bu script, ofis bilgisayarındaki 3 ana kasa klasörünü izler:
1) ANA KASA GÜNLÜK
2) GİRİŞ-ÇIKIŞ GÜNLÜK
3) GÜNLÜK HESAP

Excel dosyaları kaydedildiğinde veya toplu taramada gün bazlı verileri
ayrıştırarak Supabase veritabanına ve depolama havuzuna (Storage) aktarır.

Gereksinimler:
pip install openpyxl requests watchdog
"""

import os
import sys
import time
import json
import re
import datetime
from pathlib import Path

# Supabase API Ayarları (Beko Güncel / One DARS)
SUPABASE_URL = "https://xuxgqthpuywzcxrvkpyf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1eGdxdGhwdXl3emN4cnZrcHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEyOTE1ODAsImV4cCI6MjAzNjg2NzU4MH0.g_lTf30R35m_fQ7aWwJ9b-K6K5R-U67f2p0Z1iP6v2Y"

# İzlenecek Klasör Yolları (Ağ yolu veya yerel sürücü)
DEFAULT_BASE_DIRS = [
    r"\\Desktop-qjg3lnb\f\ANA KASA GÜNLÜK",
    r"\\Desktop-qjg3lnb\f\GİRİŞ-ÇIKIŞ GÜNLÜK",
    r"\\Desktop-qjg3lnb\f\GÜNLÜK HESAP",
    r"F:\ANA KASA GÜNLÜK",
    r"F:\GİRİŞ-ÇIKIŞ GÜNLÜK",
    r"F:\GÜNLÜK HESAP",
]

MONTHS_TR = {
    'ocak': '01', 'subat': '02', 'şubat': '02', 'mart': '03', 'nisan': '04',
    'mayis': '05', 'mayıs': '05', 'haziran': '06', 'temmuz': '07', 'agustos': '08',
    'ağustos': '08', 'eylul': '09', 'eylül': '09', 'ekim': '10', 'kasim': '11',
    'kasım': '11', 'aralik': '12', 'aralık': '12'
}

def parse_date_from_sheet_name(sheet_name: str, file_year: int = 2026) -> str:
    """Sayfa isminden ('31 Ağustos 2026' veya '1 Eylül' vb.) YYYY-MM-DD tarihi üretir."""
    clean = sheet_name.strip().lower()
    
    # 1. 2026-08-31 veya 31.08.2026
    m_iso = re.search(r'(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', clean)
    if m_iso:
        y, m, d = m_iso.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        
    m_tr_dot = re.search(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', clean)
    if m_tr_dot:
        d, m, y = m_tr_dot.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"

    # 2. '31 Ağustos' veya '31 Ağustos 2026 Pazartesi'
    m_text = re.search(r'(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{4}))?', clean)
    if m_text:
        day_str, month_str, year_str = m_text.groups()
        day = int(day_str)
        month = MONTHS_TR.get(month_str, None)
        year = int(year_str) if year_str else file_year
        if month:
            return f"{year:04d}-{month}-{day:02d}"
            
    return None

def clean_num(val):
    if val is None or val == "":
        return 0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("₺", "").replace("TL", "").strip()
    try:
        if "." in s and "," in s:
            s = s.replace(".", "").replace(",", ".")
        elif "," in s:
            s = s.replace(",", ".")
        return float(s)
    except:
        return 0

def parse_giris_cikis_sheet(ws):
    """Bir Excel çalışma sayfasından Giriş-Çıkış verilerini ayrıştırır."""
    pos_list = []
    giris_list = []
    cikis_list = []
    ana_kasa_list = []

    # 1. POSLAR (A5:B16)
    for r in range(5, 17):
        bank = str(ws.cell(row=r, column=1).value or "").strip()
        amt = clean_num(ws.cell(row=r, column=2).value)
        if bank:
            pos_list.append({"bank": bank, "amount": f"{amt:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if amt != 0 else ""})

    # 2. GİRİŞ HAREKETLERİ (C4:D72)
    for r in range(4, 75):
        desc = str(ws.cell(row=r, column=3).value or "").strip()
        bank_type = str(ws.cell(row=r, column=4).value or "").strip()
        amt_raw = ws.cell(row=r, column=5).value if ws.max_column >= 5 else ws.cell(row=r, column=4).value
        amt = clean_num(amt_raw)
        if desc or amt != 0:
            giris_list.append({
                "description": desc,
                "bankOrType": bank_type if ws.max_column >= 5 else "",
                "amount": f"{amt:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if amt != 0 else ""
            })

    # 3. ÇIKIŞ HAREKETLERİ (F4:H72 veya J sütunu)
    # Şablon sütun indekslerine göre dinamik okuma
    for r in range(4, 75):
        c_desc = str(ws.cell(row=r, column=6).value or ws.cell(row=r, column=8).value or "").strip()
        c_type = str(ws.cell(row=r, column=7).value or ws.cell(row=r, column=9).value or "").strip()
        c_amt = clean_num(ws.cell(row=r, column=8).value or ws.cell(row=r, column=10).value)
        if c_desc or c_amt != 0:
            cikis_list.append({
                "description": c_desc,
                "bankOrType": c_type,
                "amount": f"{c_amt:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if c_amt != 0 else ""
            })

    # 4. ANA KASA (L4:R50)
    for r in range(4, 52):
        name = str(ws.cell(row=r, column=13).value or ws.cell(row=r, column=12).value or "").strip()
        upper_name = name.upper()
        if not name or "TOPLAM" in upper_name or "KALAN" in upper_name or upper_name.startswith("KASA:") or upper_name.startswith("KASA :"):
            continue
        devir = clean_num(ws.cell(row=r, column=12).value if ws.max_column >= 13 else ws.cell(row=r, column=11).value)
        move = clean_num(ws.cell(row=r, column=14).value)
        pos = clean_num(ws.cell(row=r, column=15).value)
        duzeltme = clean_num(ws.cell(row=r, column=16).value)
        gun_sonu = clean_num(ws.cell(row=r, column=18).value or ws.cell(row=r, column=17).value)
        
        is_kasa = upper_name == "KASA"
        computed_gun_sonu = (move + pos + duzeltme) if is_kasa else (devir + move + pos + duzeltme)
        if gun_sonu == 0 and (devir != 0 or move != 0 or pos != 0 or duzeltme != 0):
            gun_sonu = computed_gun_sonu
            
        if name or devir != 0 or move != 0 or pos != 0 or duzeltme != 0 or gun_sonu != 0:
            ana_kasa_list.append({
                "name": name,
                "devir": f"{int(devir):,}".replace(",", ".") if devir != 0 else "",
                "movement": f"{int(move):,}".replace(",", ".") if move != 0 else "",
                "pos": f"{int(pos):,}".replace(",", ".") if pos != 0 else "",
                "duzeltme": f"{int(duzeltme):,}".replace(",", ".") if duzeltme != 0 else "",
                "gunSonu": f"{int(gun_sonu):,}".replace(",", ".") if (gun_sonu != 0 or computed_gun_sonu == 0) else ""
            })

    return {
        "pos_list": pos_list,
        "giris_list": giris_list,
        "cikis_list": cikis_list,
        "ana_kasa_list": ana_kasa_list
    }

def push_to_supabase(report_date: str, parsed_data: dict, file_name: str):
    """Supabase API'ye upsert isteği gönderir."""
    try:
        import requests
        url = f"{SUPABASE_URL}/rest/v1/cashbox_giris_cikis_reports"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        payload = {
            "report_date": report_date,
            "pos_list": parsed_data.get("pos_list", []),
            "giris_list": parsed_data.get("giris_list", []),
            "cikis_list": parsed_data.get("cikis_list", []),
            "ana_kasa_list": parsed_data.get("ana_kasa_list", []),
            "raw_file_name": file_name,
            "source": "office_pc_sync",
            "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
        
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code in (200, 201):
            print(f" [OK] {report_date} verisi Supabase'e başarıyla aktarıldı.")
            return True
        else:
            print(f" [HATA] {report_date} aktarılamadı: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f" [EXC] Supabase bağlantı hatası: {e}")
        return False

def process_excel_file(file_path: str):
    """Bir Excel dosyasını baştan sona okur ve tüm sayfaları işler."""
    try:
        import openpyxl
        print(f"\n📁 Dosya İşleniyor: {file_path}")
        wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
        
        # Dosya isminden yıl tahmin et (örn: AĞUSTOS-2026.xlsx -> 2026)
        m_year = re.search(r'202\d', os.path.basename(file_path))
        file_year = int(m_year.group(0)) if m_year else datetime.datetime.now().year
        
        count = 0
        for sheet_name in wb.sheetnames:
            report_date = parse_date_from_sheet_name(sheet_name, file_year)
            if not report_date:
                continue
                
            ws = wb[sheet_name]
            parsed = parse_giris_cikis_sheet(ws)
            if parsed["pos_list"] or parsed["giris_list"] or parsed["cikis_list"] or parsed["ana_kasa_list"]:
                if push_to_supabase(report_date, parsed, os.path.basename(file_path)):
                    count += 1
                    
        print(f"✅ Tamamlandı: {count} günlük rapor eşitlendi.")
    except Exception as e:
        print(f"❌ Dosya okunamadı ({file_path}): {e}")

def main():
    print("=========================================================")
    print("🚀 BEKO / ONE DARS OFİS KASA SENKRONİZASYON AJANI")
    print("=========================================================")
    
    # 1. Mevcut klasörleri bul
    active_dirs = []
    for d in DEFAULT_BASE_DIRS:
        if os.path.exists(d):
            active_dirs.append(d)
            print(f"✔️ Klasör Bulundu: {d}")
            
    if not active_dirs:
        print("⚠️ Uyarı: Tanımlı ağ klasörleri doğrudan bulunamadı.")
        custom = input("Lütfen Excel dosyalarının bulunduğu klasör yolunu girin (veya Enter'a basın): ").strip()
        if custom and os.path.exists(custom):
            active_dirs.append(custom)
        else:
            print("❌ Geçerli bir klasör yolu bulunamadı. Script sonlanıyor.")
            return

    # 2. Tüm Excel dosyalarını tara ve senkronize et
    print("\n🔍 Tüm klasörler taranıyor...")
    for folder in active_dirs:
        for root, _, files in os.walk(folder):
            for file in files:
                if file.lower().endswith(('.xlsx', '.xlsm')) and not file.startswith('~$'):
                    full_path = os.path.join(root, file)
                    process_excel_file(full_path)

    print("\n🎉 İlk toplu tarama tamamlandı! Sistem güncel.")

if __name__ == "__main__":
    main()
