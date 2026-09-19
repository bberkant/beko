import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '\\\\192.168.1.37\\f\\GİRİŞ-ÇIKIŞ GÜNLÜK\\2026 YILI\\08-AĞUSTOS\\AĞUSTOS-2026.xlsx';

try {
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist!');
  } else {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets['13'];
    if (worksheet) {
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log('--- NETWORK SHEET 13 ROWS ---');
      rows.forEach((row, i) => {
        if (row.length > 0) {
          const cells = row.map((cell, idx) => {
            const colName = XLSX.utils.encode_col(idx);
            return `${colName}: ${cell}`;
          }).filter(c => !c.endsWith(': undefined'));
          console.log(`Row ${i}:`, cells.join(' | '));
        }
      });
    }
  }
} catch (err) {
  console.error('Error:', err);
}
