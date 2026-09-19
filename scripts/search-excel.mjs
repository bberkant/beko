import fs from 'fs';
import path from 'path';

function findFile(dir, pattern) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!file.startsWith('.') && !file.includes('node_modules')) {
          findFile(fullPath, pattern);
        }
      } else if (file.toLowerCase().includes(pattern.toLowerCase())) {
        console.log('Found:', fullPath);
      }
    }
  } catch (e) {
    // ignore
  }
}

findFile('C:/Users/berka', 'ağustos-2026.xlsx');
findFile('C:/Users/berka', 'agustos-2026.xlsx');
