import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

const orgId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
const userId = '8dee555d-fbc6-443e-8197-b441a0ee1052';

const bankMap = {
  'HALKBANK': '25a9c792-f748-492f-8012-4f2b2a1c1de0',
  'ZİRAAT': '50889516-8822-4f72-bc66-be7203f7db56',
  'İŞBANK': 'efb00d61-ab8c-4b60-8361-d297f844326a',
  'DENİZ': '39621db8-0b16-422a-9cbb-9004e2ad3ab8',
  'KUVEYT': '94ce8de5-eaff-43e7-b816-97ef8a3ba0b7'
};

function cleanAmount(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (val.includes('TOPLAM') || val.includes('Bakiye') || val.includes('Fark')) return null;
    const clean = val.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  }
  return null;
}

function escapeSqlString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function parseDate(fileName) {
  const clean = path.basename(fileName);
  const match = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return null;
}

const cashboxFolderPath = path.join('dosyalar', 'ANA KASA RAPORU');
const bankFolderPath = path.join('dosyalar', 'GÜNLÜK HESAP');

const cashboxFiles = fs.readdirSync(cashboxFolderPath).filter(f => f.endsWith('.xlsx'));
const bankFiles = fs.readdirSync(bankFolderPath).filter(f => f.endsWith('.xlsx'));

// We want to collect all dates from both folders
const allDates = new Set();
cashboxFiles.forEach(f => {
  const d = parseDate(f);
  if (d) allDates.add(d);
});
bankFiles.forEach(f => {
  const d = parseDate(f);
  if (d) allDates.add(d);
});

const sortedDates = Array.from(allDates).sort();
console.log(`Processing reports for ${sortedDates.length} days...`);

let sqlContent = '';

// Track transaction counts to report back
const importStats = {};

for (const date of sortedDates) {
  importStats[date] = { cashboxOut: 0, cashboxIn: 0, bankTx: 0 };
  
  // Add deletes for this day to avoid duplicate records
  sqlContent += `-- ==================== DATE: ${date} ====================\n`;
  sqlContent += `DELETE FROM main_cashbox_transactions WHERE transaction_date = '${date}' AND organization_id = '${orgId}';\n`;
  sqlContent += `DELETE FROM bank_transactions WHERE transaction_date = '${date}' AND organization_id = '${orgId}';\n\n`;

  // 1. Parse ANA KASA RAPORU for this date
  const cashboxFileName = cashboxFiles.find(f => parseDate(f) === date);
  if (cashboxFileName) {
    const filePath = path.join(cashboxFolderPath, cashboxFileName);
    try {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets['ANA KASA'];
      if (sheet) {
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Rows start from Row 4 (index 3 of sheets array)
        for (let r = 3; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;

          // Outflows (Gider)
          const outCari = row[0] ? String(row[0]).trim() : '';
          const outBankRaw = row[1] ? String(row[1]).trim() : '';
          const outAmt = cleanAmount(row[2]) || 0.01;
          const rowIndexStr = String(r - 3);

          if (outCari || outBankRaw || row[2] !== undefined) {
            if (outCari.toUpperCase().includes('TOPLAM') || outBankRaw.toUpperCase().includes('TOPLAM')) {
              // skip summary row
              continue;
            }

            // Parse company prefix
            let company = 'NULL';
            let cleanCategory = outBankRaw;
            if (outBankRaw.toUpperCase().startsWith('E.')) {
              company = "'Etik Et'";
              cleanCategory = outBankRaw.substring(2);
            } else if (outBankRaw.toUpperCase().startsWith('M.')) {
              company = "'Marif Et'";
              cleanCategory = outBankRaw.substring(2);
            } else if (outBankRaw.toUpperCase().startsWith('MARİF')) {
              company = "'Marif Et'";
              cleanCategory = outBankRaw.substring(5).trim();
            }

            sqlContent += `INSERT INTO main_cashbox_transactions (organization_id, transaction_date, transaction_type, amount, currency, category, recipient_payer, description, company, exclude_from_report, created_by) VALUES ('${orgId}', '${date}', 'gider', ${outAmt}, 'TRY', '${escapeSqlString(cleanCategory)}', '${escapeSqlString(outCari)}', '${rowIndexStr}', ${company}, false, '${userId}');\n`;
            importStats[date].cashboxOut++;
          }

          // Inflows (Gelir)
          const inCari = row[4] ? String(row[4]).trim() : '';
          const inAmt = cleanAmount(row[5]) || 0.01;

          if (inCari || row[5] !== undefined) {
            if (inCari.toUpperCase().includes('TOPLAM')) {
              // skip summary row
              continue;
            }

            // Row 0 of inflow side is KASA Devir
            const isKasaDevir = (r - 3) === 0;
            const category = isKasaDevir ? 'Kasa Devir' : 'Tahsilat';

            sqlContent += `INSERT INTO main_cashbox_transactions (organization_id, transaction_date, transaction_type, amount, currency, category, recipient_payer, description, company, exclude_from_report, created_by) VALUES ('${orgId}', '${date}', 'gelir', ${inAmt}, 'TRY', '${category}', '${escapeSqlString(inCari)}', '${rowIndexStr}', NULL, false, '${userId}');\n`;
            importStats[date].cashboxIn++;
          }
        }
      }
    } catch (e) {
      console.error(`Error reading cashbox report for ${date}:`, e.message);
    }
  }

  // 2. Parse GÜNLÜK HESAP for this date
  const bankFileName = bankFiles.find(f => parseDate(f) === date);
  if (bankFileName) {
    const filePath = path.join(bankFolderPath, bankFileName);
    try {
      const workbook = XLSX.readFile(filePath);
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length === 0) continue;

        const bank1Name = String(rows[0][0] || '').trim().toUpperCase();
        const bank2Name = String(rows[0][5] || '').trim().toUpperCase();

        // Bank 1 columns: 0 (Çıkış Tutar), 1 (Çıkış Açıklama), 2 (Giriş Tutar), 3 (Giriş Açıklama)
        const bank1Id = bankMap[bank1Name];
        if (bank1Id) {
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row) continue;

            const outAmt = cleanAmount(row[0]);
            const outDesc = row[1] ? String(row[1]).trim() : '';
            const inAmt = cleanAmount(row[2]);
            const inDesc = row[3] ? String(row[3]).trim() : '';
            const rowIndexStr = String(r - 1);

            // Skip summary rows
            if (outDesc.toUpperCase().includes('TOPLAM') || inDesc.toUpperCase().includes('TOPLAM') || 
                outDesc.toUpperCase().includes('BAKİYE') || inDesc.toUpperCase().includes('BAKİYE') ||
                outDesc.toUpperCase().includes('MUTABAKAT') || inDesc.toUpperCase().includes('MUTABAKAT')) {
              continue;
            }

            if (outAmt) {
              sqlContent += `INSERT INTO bank_transactions (organization_id, account_id, transaction_date, transaction_type, amount, counterparty, category, description, created_by) VALUES ('${orgId}', '${bank1Id}', '${date}', 'cikis', ${outAmt}, '${escapeSqlString(outDesc)}', 'diger', '${rowIndexStr}', '${userId}');\n`;
              importStats[date].bankTx++;
            }
            if (inAmt) {
              sqlContent += `INSERT INTO bank_transactions (organization_id, account_id, transaction_date, transaction_type, amount, counterparty, category, description, created_by) VALUES ('${orgId}', '${bank1Id}', '${date}', 'giris', ${inAmt}, '${escapeSqlString(inDesc)}', 'diger', '${rowIndexStr}', '${userId}');\n`;
              importStats[date].bankTx++;
            }
          }
        }

        // Bank 2 columns: 5 (Çıkış Tutar), 6 (Çıkış Açıklama), 7 (Giriş Tutar), 8 (Giriş Açıklama)
        const bank2Id = bankMap[bank2Name];
        if (bank2Id) {
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row) continue;

            const outAmt = cleanAmount(row[5]);
            const outDesc = row[6] ? String(row[6]).trim() : '';
            const inAmt = cleanAmount(row[7]);
            const inDesc = row[8] ? String(row[8]).trim() : '';
            const rowIndexStr = String(r - 1);

            // Skip summary rows
            if (outDesc.toUpperCase().includes('TOPLAM') || inDesc.toUpperCase().includes('TOPLAM') || 
                outDesc.toUpperCase().includes('BAKİYE') || inDesc.toUpperCase().includes('BAKİYE') ||
                outDesc.toUpperCase().includes('MUTABAKAT') || inDesc.toUpperCase().includes('MUTABAKAT')) {
              continue;
            }

            if (outAmt) {
              sqlContent += `INSERT INTO bank_transactions (organization_id, account_id, transaction_date, transaction_type, amount, counterparty, category, description, created_by) VALUES ('${orgId}', '${bank2Id}', '${date}', 'cikis', ${outAmt}, '${escapeSqlString(outDesc)}', 'diger', '${rowIndexStr}', '${userId}');\n`;
              importStats[date].bankTx++;
            }
            if (inAmt) {
              sqlContent += `INSERT INTO bank_transactions (organization_id, account_id, transaction_date, transaction_type, amount, counterparty, category, description, created_by) VALUES ('${orgId}', '${bank2Id}', '${date}', 'giris', ${inAmt}, '${escapeSqlString(inDesc)}', 'diger', '${rowIndexStr}', '${userId}');\n`;
              importStats[date].bankTx++;
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error reading bank report for ${date}:`, e.message);
    }
  }
}

// Write the SQL file
const sqlFilePath = 'temp_import_all_records.sql';
fs.writeFileSync(sqlFilePath, sqlContent);
console.log(`\nGenerated SQL script with all inserts at: ${sqlFilePath}`);

// Log import details
console.log('\nImport breakdown per date:');
console.table(importStats);

console.log('\nExecuting SQL script against remote database...');
try {
  const output = execSync(`cmd /c npx supabase db query --linked --file ${sqlFilePath}`, { encoding: 'utf-8' });
  console.log('\nRemote database import finished successfully!');
  console.log(output);
} catch (error) {
  console.error('\nFailed to execute SQL import script:', error.message);
  if (error.stdout) console.error('Stdout:', error.stdout);
  if (error.stderr) console.error('Stderr:', error.stderr);
} finally {
  if (fs.existsSync(sqlFilePath)) {
    fs.unlinkSync(sqlFilePath);
  }
}
