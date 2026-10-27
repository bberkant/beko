/**
 * EBS Çek Takip -> Supabase (DARS Platformu) Eşitleme Scripti
 * Ofis Ağı / Firebird Entegrasyonu
 */

const firebird = require('node-firebird');
const { createClient } = require('@supabase/supabase-js');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');

// 1. Ortam değişkenlerini yükle (.env.local)
const envLocations = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../../.env.local'),
  'C:\\Users\\CASPER\\Desktop\\.env.local',
  'C:\\Users\\CASPER\\Desktop\\scripts\\.env.local'
];

let supabaseUrl = 'https://zubhjybqzcpplultpsgt.supabase.co';
let supabaseKey = 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';
let serviceKey = '';
let organizationId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

for (const envPath of envLocations) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.*)/);
    const srvMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)/);
    const orgMatch = envContent.match(/ORGANIZATION_ID\s*=\s*(.*)/);

    if (urlMatch) supabaseUrl = urlMatch[1].trim();
    if (keyMatch) supabaseKey = keyMatch[1].trim();
    if (srvMatch) serviceKey = srvMatch[1].trim();
    if (orgMatch) organizationId = orgMatch[1].trim();
    break;
  }
}

const clientKey = serviceKey || supabaseKey;
const supabase = createClient(supabaseUrl, clientKey, {
  global: {
    fetch: (url, opts) => fetch(url, { ...opts, signal: AbortSignal.timeout(20000) })
  }
});

// 2. EBS Ayarlarını Oku (.ini dosyaları)
let remoteHost = 'DRAMA'; // Serdar'ın bilgisayarı (DRAMA)
let remoteDataDir = 'C:\\Ebs Yazilim\\Cek\\V105\\Data';
let activeFirmaKodu = '2026';

const iniLocations = [
  'C:\\Ebs Yazilim\\Cek\\V105\\Ayarlar\\Db_Ayar.ini',
  'C:\\Users\\CASPER\\Desktop\\ebs yazilim\\ebs yazilim\\Cek\\V105\\Ayarlar\\Db_Ayar.ini'
];

for (const iniPath of iniLocations) {
  if (fs.existsSync(iniPath)) {
    const iniContent = fs.readFileSync(iniPath, 'utf8');
    const yolMatch = iniContent.match(/Veri Tabani Yol\s*=\s*(.*)/i);
    if (yolMatch) {
      const fullYol = yolMatch[1].trim();
      if (fullYol.startsWith('\\\\')) {
        const parts = fullYol.substring(2).split('\\');
        const compName = parts[0];
        remoteHost = compName;
        remoteDataDir = parts.slice(1).join('\\');
      } else {
        remoteDataDir = fullYol;
      }
    }
    break;
  }
}

const acilisLocations = [
  'C:\\Ebs Yazilim\\Cek\\V105\\Ayarlar\\Acilis.ini',
  'C:\\Users\\CASPER\\Desktop\\ebs yazilim\\ebs yazilim\\Cek\\V105\\Ayarlar\\Acilis.ini'
];

for (const acilisPath of acilisLocations) {
  if (fs.existsSync(acilisPath)) {
    const acilisContent = fs.readFileSync(acilisPath, 'utf8');
    const firmaMatch = acilisContent.match(/FIRMA\s*=\s*(.*)/i);
    if (firmaMatch) {
      activeFirmaKodu = firmaMatch[1].trim();
    }
    break;
  }
}

// Firebird Bağlantı Parametreleri
const fbBaseOptions = {
  host: remoteHost,
  port: 3050,
  user: 'SYSDBA',
  password: 'masterkey',
  lowercase_keys: true,
  encoding: 'WIN1254'
};

/**
 * Türkçe Karakter Düzeltme Fonksiyonu
 */
function cleanTurkish(str) {
  if (!str) return '';
  if (typeof str === 'function') return '';
  if (typeof str !== 'string') str = String(str);
  if ((str.includes('transaction') && str.includes('callback')) || str.startsWith('(transaction')) return '';

  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
}

/**
 * Tarih Formatlayıcı (YYYY-MM-DD)
 */
function formatDate(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    d = new Date(d);
  }
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Firebird Sorgu Yardımcısı
 */
const queryDb = (dbPath, sql) => {
  return new Promise((resolve, reject) => {
    firebird.attach({ ...fbBaseOptions, database: dbPath }, (err, db) => {
      if (err) return reject(err);
      db.query(sql, (err, rows) => {
        db.detach();
        if (err) return reject(err);
        resolve(rows);
      });
    });
  });
};

function isWebCektenRow(c) {
  const o = String(c.ozel_alan || '').toUpperCase();
  if (o.includes('WEB_MANUEL_SENET') || o.includes('WEB_MANUEL_KASADA')) return true;
  if (c.local_id && c.local_id >= 1000000) return true;
  if (c.local_id && c.local_id > 0 && c.local_id < 100000) return false;
  if (c.check_no && String(c.check_no).trim() !== '') return false;
  const d = String(c.debtor || '').toUpperCase();
  const b = String(c.bank_name || '').toUpperCase();
  return d.includes('ÇEKTEN') || d.includes('CEKTEN') || b.includes('ÇEKTEN') || b.includes('CEKTEN') || o.includes('ÇEKTEN') || o.includes('CEKTEN');
}

function getEffectiveOzelAlan(existingOzel, fbOzel) {
  const oldVal = (existingOzel || '').trim();
  const newVal = (fbOzel || '').trim();
  if (oldVal) {
    if (!newVal || newVal === 'ÇEK' || newVal === 'SENET' || !/takasta/i.test(newVal)) {
      if (/takasta|iç takas|takasta olmayan|silindi/i.test(oldVal)) {
        return oldVal;
      }
    }
  }
  return newVal;
}

function getEffectiveDebtor(existingOzel, existingDebtor, fbDebtor) {
  const oldOzel = (existingOzel || '').trim();
  const oldDebtor = (existingDebtor || '').trim();
  const newDebtor = (fbDebtor || '').trim();
  if (/takasta/i.test(oldOzel) && /ZİRAAT|DENİZ|GARANTİ|AKBANK|ALBARAKA|İŞ|TAKSİT/i.test(oldDebtor)) {
    if (!newDebtor || newDebtor === 'ÇEKLER') {
      return oldDebtor;
    }
  }
  return newDebtor;
}

const LOCK_FILE = path.resolve(__dirname, '../.ebs_sync.lock');
const SUPA_CACHE_FILE = path.resolve(__dirname, '../.ebs_supabase_cache.json');
const FULL_SYNC_TTL_MS = 6 * 60 * 60 * 1000; // 6 saatte bir tam tarama, aralarda hızlı aktif tarama

function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const stat = fs.statSync(LOCK_FILE);
      if (Date.now() - stat.mtimeMs < 3 * 60 * 1000) {
        return false;
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
    return true;
  } catch {
    return true;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch {}
}

async function fetchSupabaseChecksSmart() {
  const selectCols = 'id, organization_id, check_type, check_no, due_date, amount, status, local_id, debtor, creditor, bank_name, bank_branch, ciro_edilen, tahsildar_banka, document_type, ozel_alan, kesideci, keside_yeri, para_birimi';
  let cachedList = [];
  let cacheValid = false;

  try {
    if (fs.existsSync(SUPA_CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(SUPA_CACHE_FILE, 'utf8'));
      if (raw && Array.isArray(raw.items) && raw.items.length > 0) {
        cachedList = raw.items;
        if (raw.timestamp && (Date.now() - raw.timestamp < FULL_SYNC_TTL_MS)) {
          cacheValid = true;
        }
      }
    }
  } catch {}

  // Hızlı mod: Önbellek taze ise sadece ödenmemiş (aktif) kayıtları çekip önbellekle birleştir
  if (cacheValid && cachedList.length > 0) {
    const unpaidRows = [];
    let from = 0;
    const pageSize = 1000;
    let fastOk = true;
    while (true) {
      const { data, error } = await supabase
        .from('ebs_checks')
        .select(selectCols)
        .eq('organization_id', organizationId)
        .neq('status', 'Ödendi')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) {
        fastOk = false;
        break;
      }
      unpaidRows.push(...(data || []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    if (fastOk) {
      const unpaidIds = new Set(unpaidRows.map(r => r.id));
      const merged = [];
      for (const c of cachedList) {
        if (unpaidIds.has(c.id)) continue;
        // Eğer önbellekte eskiden ödenmemiş görünüyorsa ama artık unpaid listesinde yoksa Ödendi olmuştur
        if (c.status !== 'Ödendi') {
          merged.push({ ...c, status: 'Ödendi' });
        } else {
          merged.push(c);
        }
      }
      merged.push(...unpaidRows);
      return { items: merged, isPartialUnpaidOnly: false };
    }
  }

  // Tam tarama modu (Sadece aktif 2026 yılı kayıtları: local_id < 1000000 veya null)
  let existingChecks = [];
  let from = 0;
  const pageSize = 1000;
  try {
    while (true) {
      const { data, error } = await supabase
        .from('ebs_checks')
        .select(selectCols)
        .eq('organization_id', organizationId)
        .or('local_id.lt.1000000,local_id.is.null')
        .order('due_date', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(error.message);
      }
      existingChecks = existingChecks.concat(data || []);
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    try {
      fs.writeFileSync(SUPA_CACHE_FILE, JSON.stringify({ timestamp: Date.now(), items: existingChecks }), 'utf8');
    } catch {}
    return { items: existingChecks, isPartialUnpaidOnly: false };
  } catch (err) {
    // Tam tarama zaman aşımına uğrarsa sadece aktif (ödenmemiş) kayıtları çekerek eşitlemeye devam et
    console.warn('      [!] Tam liste okunurken zaman aşımı, aktif kayıtlar üzerinden devam ediliyor:', err.message);
    const { data, error } = await supabase
      .from('ebs_checks')
      .select(selectCols)
      .eq('organization_id', organizationId)
      .neq('status', 'Ödendi')
      .order('due_date', { ascending: true })
      .limit(1500);
    if (error) {
      if (cachedList.length > 0) return { items: cachedList, isPartialUnpaidOnly: false };
      throw new Error('Supabase kayıt okuma hatası: ' + error.message);
    }
    if (cachedList.length > 0) {
      const byId = new Map(cachedList.map(c => [c.id, c]));
      for (const row of (data || [])) byId.set(row.id, row);
      return { items: Array.from(byId.values()), isPartialUnpaidOnly: false };
    }
    return { items: data || [], isPartialUnpaidOnly: true };
  }
}

async function main() {
  if (!acquireLock()) {
    console.log('[EBS SYNC] Başka bir eşitleme işlemi şu anda çalışıyor, atlanıyor.');
    return;
  }
  try {
    await runMainSync();
  } finally {
    releaseLock();
  }
}

async function runMainSync() {
  console.log('====================================================');
  console.log('   DARS PLATFORMU - EBS ÇEK BULUT EŞİTLEME SİSTEMİ   ');
  console.log('====================================================\n');
  console.log(`[1/5] Bağlantı Bilgileri Doğrulanıyor...`);
  console.log(`      Organizasyon ID: ${organizationId}`);
  console.log(`      EBS Bağlantısı:  ${remoteHost}:${fbBaseOptions.port}`);
  console.log(`      Aktif Firma:     ${activeFirmaKodu}`);

  // 1. Supabase'deki mevcut çekleri hafızaya al
  console.log(`\n[2/5] Supabase üzerindeki mevcut kayıtlar çekiliyor...`);
  const supaFetchResult = await fetchSupabaseChecksSmart();
  let existingChecks = supaFetchResult.items;
  const isPartialUnpaidOnly = supaFetchResult.isPartialUnpaidOnly;

  console.log(`      Bulutta bulunan toplam kayıt: ${existingChecks.length} adet.`);

  // Mükerrer local_id=null kayıtlarını temizle (EBS'de tarih/tutar değiştiğinde eski scriptin ürettiği kopyalar)
  const nullLocalDuplicates = existingChecks.filter(c => c.local_id === null && !isWebCektenRow(c));
  if (nullLocalDuplicates.length > 0) {
    console.log(`      ${nullLocalDuplicates.length} adet mükerrer (local_id=null) kayıt temizleniyor...`);
    const idsToDelete = nullLocalDuplicates.map(c => c.id);
    for (let i = 0; i < idsToDelete.length; i += 50) {
      const batchIds = idsToDelete.slice(i, i + 50);
      await supabase.from('ebs_checks').delete().in('id', batchIds);
    }
    const deletedSet = new Set(idsToDelete);
    existingChecks = existingChecks.filter(c => !deletedSet.has(c.id));
  }

  // Hızlı Arama Haritaları (Önce local_id + check_type, sonra yedek anahtar)
  const existingMap = new Map();
  const existingListByKey = new Map();
  const localIdByTypeMap = new Map();

  existingChecks.forEach(c => {
    const o = String(c.ozel_alan || '').toUpperCase();
    const d = String(c.debtor || '').toUpperCase();
    const b = String(c.bank_name || '').toUpperCase();
    const isPureCekten = d.includes('ÇEKTEN') || d.includes('CEKTEN') || b.includes('ÇEKTEN') || b.includes('CEKTEN') || o.includes('ÇEKTEN') || o.includes('CEKTEN') || o.includes('WEB_MANUEL_SENET') || o.includes('WEB_MANUEL_KASADA');
    if (isPureCekten) return;

    const checkNo = (c.check_no || '').trim();
    const dueDate = c.due_date;
    const amountStr = parseFloat(c.amount || 0).toFixed(2);
    const key = `${c.check_type}_${checkNo}_${dueDate}_${amountStr}`;
    existingMap.set(key, c);
    if (!existingListByKey.has(key)) existingListByKey.set(key, []);
    existingListByKey.get(key).push(c);

    if (c.local_id !== null && c.local_id !== undefined && c.local_id < 1000000) {
      localIdByTypeMap.set(`${c.check_type}_${c.local_id}`, c);
    }
  });

  // 2. Aktif Veritabanını Bul (FIRMA.FDB -> FIRMA_TANIM)
  console.log(`\n[3/5] EBS Veritabanı (Firebird) taranıyor...`);
  const firmaDbPath = `${remoteDataDir}\\FIRMA.FDB`;
  let activeDataYol = '2026_10_26_32';

  try {
    const firmalar = await queryDb(firmaDbPath, `SELECT * FROM FIRMA_TANIM WHERE FIRMA_KODU = '${activeFirmaKodu}'`);
    if (firmalar && firmalar.length > 0 && firmalar[0].data_yol) {
      activeDataYol = firmalar[0].data_yol;
    }
  } catch (e) {
    console.warn(`    FIRMA.FDB okunamadı, varsayılan dosya kullanılıyor (${activeDataYol}.FDB):`, e.message);
  }

  const activeDbPath = `${remoteDataDir}\\${activeDataYol}.FDB`;
  console.log(`      Veritabanı Dosyası: ${activeDbPath}`);

  let totalScanned = 0;
  const toInsert = [];
  const toUpdate = [];
  const toReplace = []; // Eski kaydı silip yeni durumuyla eklenecekler (ertelenen çekler)
  let unchangedCount = 0;

  // A) ALINAN ÇEKLER
  try {
    const alinanlar = await queryDb(activeDbPath, `
      SELECT 
        ID, CEK_NO, TUTAR, KESIDE_TARIHI, KAYIT_TARIHI, KESIDECI, CIRO_EDEN, 
        CIRO_EDILEN, ASIL_ALACAKLI, CEK_BANKA, CEK_BANKA_SUBE, TAHSILDAR_BANKA, 
        KESIDE_YERI, PARA_BIRIMI, CAST(NOTLAR AS VARCHAR(1000)) as NOTLAR, CEK_DURUM, CEK_SON_KONUM
      FROM ALINAN_CEKLER
      ORDER BY ID ASC
    `);

    console.log(`      Alınan Çek Sayısı: ${alinanlar.length}`);
    totalScanned += alinanlar.length;

    for (const r of alinanlar) {
      const checkNo = cleanTurkish(r.cek_no || '');
      const dueDate = formatDate(r.keside_tarihi);
      const issueDate = formatDate(r.kayit_tarihi) || dueDate;
      const amount = parseFloat(r.tutar || 0);
      const amountStr = amount.toFixed(2);
      const kesideci = cleanTurkish(r.kesideci);
      const creditor = cleanTurkish(r.ciro_eden || r.kesideci);
      const ciroEdilen = cleanTurkish(r.ciro_edilen);
      const debtor = cleanTurkish(r.asil_alacakli || '');
      const bankName = cleanTurkish(r.cek_banka);
      const bankBranch = cleanTurkish(r.cek_banka_sube);
      const tahsildar = cleanTurkish(r.tahsildar_banka);
      const kesideYeri = cleanTurkish(r.keside_yeri);
      const paraBirimi = cleanTurkish(r.para_birimi || 'TL');
      const ozelAlan = cleanTurkish(r.notlar || '');
      const isSenet = bankName.toUpperCase().includes('SENET') || ozelAlan.toUpperCase().includes('SENET');
      const documentType = isSenet ? 'senet' : 'cek';

      // Durum Eşleme (6 = Portföyden Tahsil, 8 = Bankadan Tahsil -> Ödendi)
      let status = 'Portföyde';
      if (r.cek_durum === 3) status = 'Teminata Verildi';
      else if (r.cek_durum === 6 || r.cek_durum === 8) status = 'Ödendi';
      else if (r.cek_durum === 2) status = 'Ciro Edildi';
      else if (r.cek_durum === 4 || r.cek_durum === 5) status = 'İade';
      else if (r.cek_durum === 1) status = 'Portföyde';

      const recordKey = `alinan_${checkNo}_${dueDate}_${amountStr}`;
      const existing = localIdByTypeMap.get(`alinan_${r.id}`) || existingMap.get(recordKey);

      const finalOzelAlan = existing ? getEffectiveOzelAlan(existing.ozel_alan, ozelAlan) : ozelAlan;
      const finalDebtor = existing ? getEffectiveDebtor(existing.ozel_alan, existing.debtor, debtor) : debtor;

      // Eğer webde Ödendi/İptal yapılmışsa ve vade tarihi EBS'de ileri bir tarihe ertelenmemişse koru
      let finalStatus = status;
      let needsReplace = false;
      if (existing && (existing.status === 'Ödendi' || existing.status === 'İptal') && status !== 'Ödendi' && status !== 'İptal') {
        if (existing.due_date !== dueDate && dueDate > existing.due_date) {
          // EBS'de çek ileri bir tarihe ötelenmiş! Eski 'Ödendi' kaydını yenisiyle değiştir
          needsReplace = true;
        } else {
          finalStatus = existing.status;
        }
      }

      const checkData = {
        organization_id: organizationId,
        check_type: 'alinan',
        local_id: r.id,
        check_no: checkNo,
        issue_date: issueDate,
        due_date: dueDate,
        amount: amount,
        debtor: finalDebtor,
        creditor: creditor,
        bank_name: bankName,
        bank_branch: bankBranch,
        status: finalStatus,
        para_birimi: paraBirimi,
        ozel_alan: finalOzelAlan,
        kesideci: kesideci,
        keside_yeri: kesideYeri,
        tahsildar_banka: tahsildar,
        ciro_edilen: ciroEdilen,
        document_type: documentType,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        if (needsReplace) {
          checkData.created_at = new Date().toISOString();
          toReplace.push({ deleteId: existing.id, insertData: checkData });
        } else {
          const hasDiff =
            existing.local_id !== r.id ||
            existing.document_type !== documentType ||
            existing.status !== finalStatus ||
            (existing.check_no || '') !== checkNo ||
            (existing.debtor || '') !== finalDebtor ||
            (existing.kesideci || '') !== kesideci ||
            (existing.creditor || '') !== creditor ||
            (existing.bank_name || '') !== bankName ||
            (existing.bank_branch || '') !== bankBranch ||
            (existing.keside_yeri || '') !== kesideYeri ||
            (existing.ciro_edilen || '') !== ciroEdilen ||
            (existing.tahsildar_banka || '') !== tahsildar ||
            (existing.ozel_alan || '') !== finalOzelAlan ||
            Math.abs(parseFloat(existing.amount || 0) - amount) > 0.005 ||
            existing.due_date !== dueDate;

          if (hasDiff) {
            toUpdate.push({ id: existing.id, ...checkData });
          } else {
            unchangedCount++;
          }
          if (finalStatus === 'Ödendi') {
            const dups = existingListByKey.get(recordKey) || [];
            for (const dup of dups) {
              if (dup.id !== existing.id && dup.status !== 'Ödendi') {
                toUpdate.push({ id: dup.id, status: 'Ödendi', updated_at: checkData.updated_at });
                dup.status = 'Ödendi';
              }
            }
          }
        }
      } else if (!isPartialUnpaidOnly || finalStatus !== 'Ödendi') {
        checkData.created_at = new Date().toISOString();
        toInsert.push(checkData);
        existingMap.set(recordKey, checkData);
      }
    }
  } catch (e) {
    console.warn(`    [!] Alınan Çekler okunamadı:`, e.message);
  }

  // B) KESİLEN ÇEKLER (Gerçek Borçlu Banka / Asıl Borçlanılan ile)
  try {
    const kesilenler = await queryDb(activeDbPath, `
      SELECT 
        C.ID, C.CEK_NO, C.TUTAR, C.KESIDE_TARIHI, C.KAYIT_TARIHI, C.ODENDI, C.OZEL_ALAN,
        C.PARA_BIRIMI, C.KESIDE_YERI,
        B.BANKA_ADI as TURU, B.SUBE_ADI,
        F.FIRMA as ALACAKLI_FIRMA,
        F2.FIRMA as ASIL_BORCLANILAN_FIRMA
      FROM CEKLER C
      LEFT JOIN BANKA_HESAPLARI B ON C.BANKA_HESAP_ID = B.ID
      LEFT JOIN FIRMA F ON C.FIRMA_ID = F.ID
      LEFT JOIN FIRMA F2 ON C.ASIL_BORCLANILAN_ID = F2.ID
      ORDER BY C.ID ASC
    `);

    console.log(`      Kesilen Çek Sayısı: ${kesilenler.length}`);
    totalScanned += kesilenler.length;

    for (const r of kesilenler) {
      const checkNo = cleanTurkish(r.cek_no || '');
      const dueDate = formatDate(r.keside_tarihi);
      const issueDate = formatDate(r.kayit_tarihi) || dueDate;
      const amount = parseFloat(r.tutar || 0);
      const amountStr = amount.toFixed(2);
      const creditor = cleanTurkish(r.alacakli_firma || '');
      const debtorBank = cleanTurkish(r.asil_borclanilan_firma || r.turu || '');
      const bankName = debtorBank;
      const bankBranch = cleanTurkish(r.sube_adi || '');
      const kesideYeri = cleanTurkish(r.keside_yeri || '');
      const paraBirimi = cleanTurkish(r.para_birimi || 'TL');
      const ozelAlan = cleanTurkish(r.ozel_alan || '');
      const isSenet = ozelAlan.toUpperCase().includes('SENET');
      const documentType = isSenet ? 'senet' : 'cek';

      // Durum Eşleme
      let status = 'Tahsilde';
      if (r.odendi === 2 || r.odendi === 6) status = 'Ödendi';
      else if (r.odendi === 1) status = 'Tahsilde';
      else if (r.odendi === 3) status = 'İptal';
      else if (r.odendi === 4) status = 'Geri Alındı';

      const recordKey = `kesilen_${checkNo}_${dueDate}_${amountStr}`;
      const existing = localIdByTypeMap.get(`kesilen_${r.id}`) || existingMap.get(recordKey);

      const finalOzelAlan = existing ? getEffectiveOzelAlan(existing.ozel_alan, ozelAlan) : ozelAlan;
      const finalDebtor = existing ? getEffectiveDebtor(existing.ozel_alan, existing.debtor, debtorBank) : debtorBank;

      let finalStatus = status;
      let needsReplace = false;
      if (existing && (existing.status === 'Ödendi' || existing.status === 'İptal') && status !== 'Ödendi' && status !== 'İptal') {
        if (existing.due_date !== dueDate && dueDate > existing.due_date) {
          needsReplace = true;
        } else {
          finalStatus = existing.status;
        }
      } else if (existing && /takasta olmayan/i.test(finalOzelAlan || '') && status === 'Geri Alındı' && existing.status === 'Tahsilde') {
        finalStatus = 'Tahsilde';
      }

      const checkData = {
        organization_id: organizationId,
        check_type: 'kesilen',
        local_id: r.id,
        check_no: checkNo,
        issue_date: issueDate,
        due_date: dueDate,
        amount: amount,
        debtor: finalDebtor,
        creditor: creditor,
        bank_name: bankName,
        bank_branch: bankBranch,
        status: finalStatus,
        para_birimi: paraBirimi,
        ozel_alan: finalOzelAlan,
        kesideci: '',
        keside_yeri: kesideYeri,
        tahsildar_banka: '',
        ciro_edilen: '',
        document_type: documentType,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        if (needsReplace) {
          checkData.created_at = new Date().toISOString();
          toReplace.push({ deleteId: existing.id, insertData: checkData });
        } else {
          const hasDiff =
            existing.local_id !== r.id ||
            existing.document_type !== documentType ||
            existing.status !== finalStatus ||
            (existing.check_no || '') !== checkNo ||
            (existing.debtor || '') !== finalDebtor ||
            (existing.creditor || '') !== creditor ||
            (existing.bank_name || '') !== bankName ||
            (existing.bank_branch || '') !== bankBranch ||
            (existing.keside_yeri || '') !== kesideYeri ||
            (existing.ozel_alan || '') !== finalOzelAlan ||
            Math.abs(parseFloat(existing.amount || 0) - amount) > 0.005 ||
            existing.due_date !== dueDate;

          if (hasDiff) {
            toUpdate.push({ id: existing.id, ...checkData });
          } else {
            unchangedCount++;
          }
          if (finalStatus === 'Ödendi') {
            const dups = existingListByKey.get(recordKey) || [];
            for (const dup of dups) {
              if (dup.id !== existing.id && dup.status !== 'Ödendi') {
                toUpdate.push({ id: dup.id, status: 'Ödendi', updated_at: checkData.updated_at });
                dup.status = 'Ödendi';
              }
            }
          }
        }
      } else if (!isPartialUnpaidOnly || finalStatus !== 'Ödendi') {
        checkData.created_at = new Date().toISOString();
        toInsert.push(checkData);
        existingMap.set(recordKey, checkData);
      }
    }
  } catch (e) {
    console.warn(`    [!] Kesilen Çekler okunamadı:`, e.message);
  }

  // 3. Supabase'e Ekleme ve Güncelleme İşlemleri
  console.log(`\n[4/5] Bulut Senkronizasyonu Gerçekleştiriliyor...`);
  console.log(`      Taranan Toplam Çek: ${totalScanned} adet`);
  console.log(`      Yeni Eklenecek Çek: ${toInsert.length} adet`);
  console.log(`      Güncellenecek Çek:  ${toUpdate.length} adet`);
  console.log(`      Yenilenecek Çek:    ${toReplace.length} adet`);
  console.log(`      Değişmeyen Çek:     ${unchangedCount} adet`);

  // 0) Ertelenen ve eski kaydı Ödendi kalmış olanları yenile
  if (toReplace.length > 0) {
    for (const item of toReplace) {
      await supabase.from('ebs_checks').delete().eq('id', item.deleteId);
      const { error } = await supabase.from('ebs_checks').insert(item.insertData);
      if (error) {
        console.error('      HATA (Replace):', error.message);
      }
    }
  }

  // A) Yeni Kayıtları Ekle (Batch 100)
  if (toInsert.length > 0) {
    console.log(`\n      Yeni kayıtlar Supabase'e ekleniyor...`);
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('ebs_checks').insert(batch);
      if (error) {
        console.error(`      HATA (Insert batch ${i}-${i + batch.length}):`, error.message);
      } else {
        process.stdout.write(`      [+] ${Math.min(i + batchSize, toInsert.length)} / ${toInsert.length} yeni çek eklendi...\r`);
      }
    }
    console.log(`\n      Yeni kayıtların aktarımı tamamlandı.`);
  }

  // B) Güncellenecek Kayıtları Güncelle
  if (toUpdate.length > 0) {
    console.log(`\n      Mevcut kayıtlar güncelleniyor (Gerçek Banka ve Ödeme Bilgileriyle)...`);
    let updatedSuccess = 0;
    const updateBatchSize = 50;
    for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
      const chunk = toUpdate.slice(i, i + updateBatchSize);
      await Promise.all(chunk.map(async (item) => {
        const { id, ...updateFields } = item;
        const { error } = await supabase.from('ebs_checks').update(updateFields).eq('id', id);
        if (!error) updatedSuccess++;
        else console.error(`      HATA (Update ${id}):`, error.message);
      }));
      process.stdout.write(`      [*] ${Math.min(i + updateBatchSize, toUpdate.length)} / ${toUpdate.length} çek güncellendi...\r`);
    }
    console.log(`\n      ${updatedSuccess} adet çek başarıyla güncellendi.`);
  }

  // Yerel önbelleği güncellenen durumlarla senkronize et
  if (toUpdate.length > 0 || toReplace.length > 0) {
    try {
      const updateMap = new Map(toUpdate.map(u => [u.id, u]));
      const replacedSet = new Set(toReplace.map(r => r.deleteId));
      const nextCache = existingChecks
        .filter(c => !replacedSet.has(c.id))
        .map(c => updateMap.has(c.id) ? { ...c, ...updateMap.get(c.id) } : c);
      fs.writeFileSync(SUPA_CACHE_FILE, JSON.stringify({ timestamp: Date.now(), items: nextCache }), 'utf8');
    } catch {}
  }

  console.log('\n====================================================');
  console.log('            ✅ EŞİTLEME BAŞARIYLA TAMAMLANDI!        ');
  console.log(`   * Toplam Taranan: ${totalScanned} adet`);
  console.log(`   * Yeni Eklenen:   ${toInsert.length} adet`);
  console.log(`   * Güncellenen:    ${toUpdate.length + toReplace.length} adet`);
  console.log(`   * Değişmeyen:     ${unchangedCount} adet`);
  console.log('====================================================\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('\nKritik Hata:', err);
    process.exit(1);
  });
}

module.exports = { runEbsSync: main };
