import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zubhjybqzcpplultpsgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG";
const TUNNEL_URL = "https://vega-api.amasyaetas.com";
const DEFAULT_ORG_ID = "13b8da90-27d1-440d-a8f4-eb50dadd6391";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function log(msg) {
  const time = new Date().toLocaleTimeString('tr-TR');
  console.log(`[${time}] ${msg}`);
}

export async function syncVegaData(fullSync = false) {
  const startTime = Date.now();
  log("🚀 Vega Canlı Senkronizasyon Başlatılıyor...");

  // 1. Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'berkant@dars.local',
    password: '123berkant_'
  });

  if (authError) {
    log(`❌ Supabase kimlik doğrulama hatası: ${authError.message}`);
    throw authError;
  }
  log(`👤 Giriş yapıldı: ${authData.user.email}`);

  // 2. Fetch cariler from Vega
  log("📡 Vega API'den cari listesi çekiliyor...");
  const carilerRes = await fetch(`${TUNNEL_URL}/api/cariler`);
  if (!carilerRes.ok) {
    throw new Error(`Vega API /api/cariler yanıt vermedi: ${carilerRes.statusText}`);
  }
  const cariler = await carilerRes.json();
  if (!Array.isArray(cariler)) {
    throw new Error("Vega API geçerli bir cari listesi döndürmedi.");
  }
  log(`✔️ Toplam ${cariler.length} cari kart çekildi.`);

  // 3. Upsert cariler to Supabase vega_cariler
  log("💾 Cari kartlar Supabase'e kaydediliyor/güncelleniyor...");
  const cariPayload = cariler.map(c => ({
    organization_id: DEFAULT_ORG_ID,
    code: String(c.code),
    name: c.name || '',
    company_code: c.companyCode || null,
    company_tracking_code: c.companyTrackingCode || null,
    tax_office: c.taxOffice || null,
    tax_no: c.taxNo || null,
    type: c.type || 'Müşteri',
    city: c.city || '',
    last_transaction_date: c.lastTransactionDate || null,
    balance: Number(c.balance || 0)
  }));

  for (let i = 0; i < cariPayload.length; i += 1000) {
    const chunk = cariPayload.slice(i, i + 1000);
    const { error: upsertErr } = await supabase
      .from('vega_cariler')
      .upsert(chunk, { onConflict: 'organization_id,code' });
    if (upsertErr) {
      log(`⚠️ vega_cariler upsert uyarısı: ${upsertErr.message}`);
    }
  }
  log("✔️ vega_cariler tablosu güncellendi.");

  // 4. Identify cariler whose movements need syncing
  // In incremental mode: sync cariler with transactions from September 2026 onwards (or after 2026-09-01)
  // In full mode: sync all cariler with lastTransactionDate or balance
  const targetCariler = fullSync
    ? cariler.filter(c => c.lastTransactionDate || Math.abs(c.balance || 0) > 0.01)
    : cariler.filter(c => c.lastTransactionDate && c.lastTransactionDate >= '2026-09-01');

  log(`🎯 Senkronize edilecek cari sayısı: ${targetCariler.length} (Mod: ${fullSync ? 'Tam' : 'Eylül 2026 + Güncel'})`);

  const concurrency = 15;
  let totalMovementsCount = 0;
  let syncedCariCount = 0;

  for (let i = 0; i < targetCariler.length; i += concurrency) {
    const chunk = targetCariler.slice(i, i + concurrency);

    await Promise.all(chunk.map(async (cari) => {
      try {
        const movRes = await fetch(`${TUNNEL_URL}/api/cariler/${encodeURIComponent(cari.code)}/hareketler`);
        if (!movRes.ok) return;
        const movements = await movRes.json();
        if (!Array.isArray(movements) || movements.length === 0) return;

        const mapped = movements.map(m => ({
          organization_id: DEFAULT_ORG_ID,
          cari_code: String(cari.code),
          date: m.date || new Date().toISOString(),
          invoice_no: m.invoiceNo || '',
          izahat: m.izahat || '',
          description: m.description || '',
          quantity: Number(m.quantity || 0),
          unit_price: Number(m.unitPrice || 0),
          line_tutar: Number(m.lineTutar || 0),
          product_name: m.productName || null,
          unit_name: m.unitName || null,
          borc: Number(m.borc || 0),
          alacak: Number(m.alacak || 0),
          vade: m.vade || null,
          type: m.type || '',
          amount: Number(m.amount || 0)
        }));

        // Delete existing rows for this cari
        await supabase
          .from('vega_cari_hareketler')
          .delete()
          .eq('organization_id', DEFAULT_ORG_ID)
          .eq('cari_code', String(cari.code));

        // Insert fresh rows in batches of 500
        for (let k = 0; k < mapped.length; k += 500) {
          const subChunk = mapped.slice(k, k + 500);
          const { error: insErr } = await supabase
            .from('vega_cari_hareketler')
            .insert(subChunk);
          if (insErr) {
            log(`⚠️ Cari ${cari.code} hareket ekleme hatası: ${insErr.message}`);
          }
        }

        totalMovementsCount += mapped.length;
        syncedCariCount++;
      } catch (err) {
        log(`⚠️ Cari ${cari.code} işlenirken hata: ${err.message}`);
      }
    }));

    const progress = Math.min(i + concurrency, targetCariler.length);
    log(`⏳ İlerleme: ${progress}/${targetCariler.length} cari tamamlandı... (${totalMovementsCount} hareket)`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`🎉 Senkronizasyon Başarıyla Tamamlandı!`);
  log(`📊 Özet: ${syncedCariCount} cari için toplam ${totalMovementsCount} hareket güncellendi (${durationSec} saniye).`);

  // Verify KARKAS DANA ETİ
  const { data: karkasData } = await supabase
    .from('vega_cari_hareketler')
    .select('date, product_name, invoice_no, quantity, borc, unit_price')
    .ilike('product_name', '%KARKAS%')
    .order('date', { ascending: false })
    .limit(5);

  log(`🥩 En son KARKAS hareketleri: ${JSON.stringify(karkasData, null, 2)}`);
  return { syncedCariCount, totalMovementsCount, durationSec };
}

// If run directly from CLI
if (process.argv[1]?.endsWith('sync_vega_hareketler.mjs')) {
  syncVegaData(false)
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Hata:", err);
      process.exit(1);
    });
}
