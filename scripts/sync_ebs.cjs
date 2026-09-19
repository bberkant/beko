const firebird = require('node-firebird');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.*)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('=== EBS Çek Takip Veri Senkronizasyon Aracı ===\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Hata: .env.local dosyasında Supabase bilgileri bulunamadı.');
    rl.close();
    return;
  }

  const dbPath = await askQuestion('EBS Veritabanı (.FDB) Dosya Yolu [Varsayılan: C:\\Ebs Yazilim\\cek\\V105\\vt\\EbsCek.fdb]: ');
  let finalDbPath = dbPath.trim() || 'C:\\Ebs Yazilim\\cek\\V105\\vt\\EbsCek.fdb';

  // Fallback for Turkish characters in path if needed
  if (!fs.existsSync(finalDbPath)) {
    const fallbackPath = 'C:\\Ebs Yazılım\\cek\\V105\\vt\\EbsCek.fdb';
    if (fs.existsSync(fallbackPath)) {
      finalDbPath = fallbackPath;
    } else {
      console.warn(`Uyarı: Belirtilen yolda dosya bulunamadı: ${finalDbPath}`);
    }
  }

  const email = await askQuestion('Sistem Giriş E-postanız (Supabase): ');
  const password = await askQuestion('Şifreniz: ');

  console.log('\nSupabase bağlantısı kuruluyor...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Authenticate user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });

  if (authError) {
    console.error('Supabase Giriş Hatası:', authError.message);
    rl.close();
    return;
  }

  const userId = authData.user.id;
  console.log('Giriş başarılı! Kullanıcı ID:', userId);

  // Fetch user's organization
  const { data: memberData, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .single();

  if (memberError || !memberData) {
    console.error('Hata: Kullanıcının aktif bir organizasyonu bulunamadı.', memberError);
    rl.close();
    return;
  }

  const orgId = memberData.organization_id;
  console.log('Organizasyon ID:', orgId);

  const dbOptions = {
    host: '127.0.0.1',
    port: 3050,
    database: finalDbPath,
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
  };

  console.log('\nEBS Firebird Veritabanına bağlanılıyor...');
  
  firebird.attach(dbOptions, async function(err, db) {
    if (err) {
      console.error('Firebird Bağlantı Hatası:', err.message);
      console.log('Lütfen EBS Çek programının çalıştığından ve dosya yolunun doğru olduğundan emin olun.');
      rl.close();
      return;
    }

    console.log('Veritabanı bağlantısı kuruldu! Tablolar taranıyor...\n');

    // Query list of user tables in the database
    db.query(`
      SELECT DISTINCT RDB$RELATION_NAME as table_name
      FROM RDB$RELATION_FIELDS 
      WHERE RDB$SYSTEM_FLAG = 0
    `, async function(err, relations) {
      if (err) {
        console.error('Tablo listesi okunamadı:', err.message);
        db.detach();
        rl.close();
        return;
      }

      const tables = relations.map(r => r.table_name.trim());
      console.log('Veritabanında bulunan tablolar:', tables.join(', '));

      // Let's look for check tables. Commonly "ALINAN_CEK", "KESILEN_CEK", "CEK_TAKIP", etc.
      const alinanTable = tables.find(t => t.includes('ALINAN') && t.includes('CEK')) || tables.find(t => t.includes('CEK'));
      const kesilenTable = tables.find(t => t.includes('KESILEN') && t.includes('CEK'));

      console.log(`\nAlgılanan Alınan Çek Tablosu: ${alinanTable || 'Bulunamadı'}`);
      console.log(`Algılanan Kesilen Çek Tablosu: ${kesilenTable || 'Bulunamadı'}`);

      if (!alinanTable && !kesilenTable) {
        console.log('Uyarı: Çek tabloları otomatik algılanamadı. Lütfen tablo listesini iletin.');
        db.detach();
        rl.close();
        return;
      }

      // Helper function to query table schema
      const getColumns = (tableName) => {
        return new Promise((resolve) => {
          db.query(`
            SELECT RDB$FIELD_NAME as column_name
            FROM RDB$RELATION_FIELDS
            WHERE RDB$RELATION_NAME = '${tableName}'
          `, (err, cols) => {
            if (err) resolve([]);
            else resolve(cols.map(c => c.column_name.trim()));
          });
        });
      };

      if (alinanTable) {
        const cols = await getColumns(alinanTable);
        console.log(`\n[${alinanTable}] Tablosu Sütunları:`, cols.join(', '));
      }

      if (kesilenTable) {
        const cols = await getColumns(kesilenTable);
        console.log(`\n[${kesilenTable}] Tablosu Sütunları:`, cols.join(', '));
      }

      // Since we want to let the user do a run to inspect, let's read first 5 rows and print them!
      const dumpRows = (tableName) => {
        return new Promise((resolve) => {
          db.query(`SELECT FIRST 5 * FROM ${tableName}`, (err, rows) => {
            if (err) {
              console.error(`${tableName} okuma hatası:`, err.message);
              resolve();
            } else {
              console.log(`\n=== [${tableName}] Örnek Kayıtlar ===`);
              console.dir(rows, { depth: null, colors: true });
              resolve(rows);
            }
          });
        });
      };

      if (alinanTable) await dumpRows(alinanTable);
      if (kesilenTable) await dumpRows(kesilenTable);

      console.log('\nAnaliz tamamlandı. Bağlantı kapatılıyor.');
      db.detach();
      rl.close();
    });
  });
}

main().catch(console.error);
