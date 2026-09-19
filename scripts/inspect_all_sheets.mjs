import XLSX from 'xlsx';
import path from 'path';

const excelPath = path.join('dosyalar', 'ARAÇ LİSTESİ MUAYENE.xlsx');
const workbook = XLSX.readFile(excelPath);

for (const name of workbook.SheetNames) {
  console.log(`\n================ Sheet: ${name} ================`);
  const sheet = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (rows.length > 0) {
    // Print first 5 rows to see headers/layout
    for (let i = 0; i < Math.min(rows.length, 6); i++) {
      console.log(`Row ${i+1}:`, rows[i]);
    }
  }
}
