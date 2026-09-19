const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'dosyalar', 'ARAÇ LİSTESİ MUAYENE.xlsx');
const workbook = XLSX.readFile(excelPath);

console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // print first 50 rows
  for (let r = 0; r < Math.min(rows.length, 50); r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    
    const cols = [];
    for (let c = 0; c < row.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (cell) {
        cols.push(`${cellRef}: ${cell.v} ${cell.f ? '[F: ' + cell.f + ']' : ''}`);
      }
    }
    if (cols.length > 0) {
      console.log(`Row ${r + 1}:`, cols.join(' | '));
    }
  }
}
