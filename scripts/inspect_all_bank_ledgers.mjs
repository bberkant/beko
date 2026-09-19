import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const folderPath = path.join('dosyalar', 'GÜNLÜK HESAP');
const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.xlsx'));

console.log(`Found ${files.length} daily ledger files.`);

for (const file of files.slice(0, 3)) {
  const filePath = path.join(folderPath, file);
  console.log(`\n================ File: ${file} ================`);
  const workbook = XLSX.readFile(filePath);
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length > 0) {
      const bank1 = rows[0][0];
      const bank2 = rows[0][5];
      console.log(`  Sheet "${sheetName}": Bank1="${bank1}", Bank2="${bank2}"`);
      console.log(`  Row 2 sample:`, rows[1]);
    }
  }
}
