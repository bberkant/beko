import XLSX from 'xlsx';

const filePath = 'C:\\Users\\berka\\OneDrive\\Desktop\\AĞUSTOS-2026.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet Names in AĞUSTOS-2026.xlsx:', workbook.SheetNames);
  
  // Print details about sheets
  workbook.SheetNames.slice(0, 15).forEach(sheetName => {
    console.log(`\n--- SHEET: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Print first 5 non-empty rows
    let printedRows = 0;
    for (let r = 0; r <= range.e.r; r++) {
      let rowCells = [];
      for (let c = 0; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = worksheet[cellRef];
        if (cell && cell.v !== undefined && cell.v !== '') {
          rowCells.push(`[Col ${c}:${cell.v}]`);
        }
      }
      if (rowCells.length > 0) {
        console.log(`Row ${r}: ${rowCells.join(' | ')}`);
        printedRows++;
        if (printedRows >= 5) break;
      }
    }
  });
} catch (e) {
  console.error(e);
}
