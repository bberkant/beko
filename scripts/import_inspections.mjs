import XLSX from 'xlsx';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

// 1. Fetch current vehicles from Supabase
console.log('Fetching vehicles from database...');
let dbVehicles = [];
try {
  const query = 'SELECT id, plate, brand, inspection_date FROM vehicles;';
  const rawJson = execSync(`cmd /c npx supabase db query --linked --output-format json "${query}"`, { encoding: 'utf-8' });
  const parsed = JSON.parse(rawJson);
  dbVehicles = parsed.rows || parsed.data || parsed || [];
  console.log(`Fetched ${dbVehicles.length} vehicles from database.`);
} catch (error) {
  console.error('Failed to fetch vehicles from database:', error.message);
  process.exit(1);
}

// 2. Read Excel file
const excelPath = path.join('dosyalar', 'ARAÇ LİSTESİ MUAYENE.xlsx');
console.log(`Reading Excel file: ${excelPath}`);
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['ETİK'];
if (!sheet) {
  console.error('ETİK sheet not found in the Excel file.');
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Excel Sheet ETİK total rows:', rows.length);
console.log('First 5 rows of sheet:');
for (let i = 0; i < Math.min(rows.length, 5); i++) {
  console.log(`Row ${i + 1}:`, rows[i]);
}

// Find headers row and columns index
let headerIdx = -1;
let plakaCol = -1;
let muayeneCol = -1;

for (let r = 0; r < rows.length; r++) {
  const row = rows[r];
  if (row && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('plaka'))) {
    headerIdx = r;
    plakaCol = row.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes('plaka'));
    muayeneCol = row.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes('muayene'));
    break;
  }
}

if (headerIdx === -1 || plakaCol === -1 || muayeneCol === -1) {
  console.error('Could not locate PLAKA and MUAYENE SON TARİHİ columns in sheet.');
  process.exit(1);
}

console.log(`Found headers at row ${headerIdx + 1}. PLAKA col: ${plakaCol}, MUAYENE col: ${muayeneCol}`);

// Date helper
function parseExcelDate(val) {
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    const matchDot = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (matchDot) {
      const d = matchDot[1].padStart(2, '0');
      const m = matchDot[2].padStart(2, '0');
      const y = matchDot[3];
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

const todayStr = '2026-07-21';
let sqlUpdates = '';
let updatedCount = 0;
let skippedCount = 0;
let unmatchedCount = 0;

const matchedDbIds = new Set();

for (let r = headerIdx + 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length === 0) continue;
  
  const rawPlate = row[plakaCol];
  const rawMuayene = row[muayeneCol];
  
  if (!rawPlate) continue;
  
  const plateStr = String(rawPlate).trim();
  const plateClean = plateStr.replace(/\s+/g, '').toUpperCase();
  
  // Find vehicle in DB
  const dbMatch = dbVehicles.find(v => v.plate.replace(/\s+/g, '').toUpperCase() === plateClean);
  
  if (!dbMatch) {
    console.log(`[UNMATCHED] Plate "${plateStr}" not found in database.`);
    unmatchedCount++;
    continue;
  }
  
  matchedDbIds.add(dbMatch.id);
  
  const parsedDate = parseExcelDate(rawMuayene);
  if (!parsedDate) {
    console.log(`[NO DATE -> NULL] Plate "${plateStr}" -> Setting to NULL (Excel: "${rawMuayene}")`);
    sqlUpdates += `UPDATE vehicles SET inspection_date = NULL WHERE id = '${dbMatch.id}';\n`;
    updatedCount++;
    continue;
  }
  
  // Check if date is in the past (only log it, do not skip!)
  if (parsedDate < todayStr) {
    console.log(`[OVERDUE] Plate "${plateStr}" date ${parsedDate} is in the past.`);
    skippedCount++;
  }
  
  console.log(`[UPDATE] Plate "${plateStr}" -> New Date: ${parsedDate} (Old Date: ${dbMatch.inspection_date || 'None'})`);
  sqlUpdates += `UPDATE vehicles SET inspection_date = '${parsedDate}' WHERE id = '${dbMatch.id}';\n`;
  updatedCount++;
}

// Clear vehicles not found in Excel
let clearedCount = 0;
for (const dbV of dbVehicles) {
  if (!matchedDbIds.has(dbV.id)) {
    console.log(`[NOT IN EXCEL -> NULL] Plate "${dbV.plate}" not found in Excel, setting to NULL (Old Date: ${dbV.inspection_date || 'None'})`);
    sqlUpdates += `UPDATE vehicles SET inspection_date = NULL WHERE id = '${dbV.id}';\n`;
    updatedCount++;
    clearedCount++;
  }
}

console.log(`\nSummary:`);
console.log(`- Prepared updates: ${updatedCount}`);
console.log(`- Overdue dates: ${skippedCount}`);
console.log(`- Unmatched Excel plates: ${unmatchedCount}`);
console.log(`- Cleared database plates (not in Excel): ${clearedCount}`);

if (updatedCount > 0) {
  const tempSqlFile = 'temp_update_inspections.sql';
  fs.writeFileSync(tempSqlFile, sqlUpdates);
  
  console.log('Executing updates against remote database...');
  try {
    const runOutput = execSync(`cmd /c npx supabase db query --linked --file ${tempSqlFile}`, { encoding: 'utf-8' });
    console.log('Database update completed successfully!');
    console.log(runOutput);
  } catch (error) {
    console.error('Failed executing updates against database:', error.message);
    if (error.stdout) console.error('Stdout:', error.stdout);
    if (error.stderr) console.error('Stderr:', error.stderr);
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
} else {
  console.log('No updates were executed.');
}
