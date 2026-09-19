import XLSX from 'xlsx';
import path from 'path';

const excelPath = path.join('dosyalar', 'ARAÇ LİSTESİ MUAYENE.xlsx');
const workbook = XLSX.readFile(excelPath);

const sheet = workbook.Sheets['2019'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('2019 Sheet Max Row Length:', Math.max(...rows.map(r => r ? r.length : 0)));
console.log('Headers (Row 3):', rows[2]);
