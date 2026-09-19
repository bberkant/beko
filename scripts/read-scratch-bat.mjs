import fs from 'fs';
const p = 'C:/Users/berka/.gemini/antigravity/scratch/beko-guncel/baslat-pos-watcher.bat';
try {
  console.log(fs.readFileSync(p, 'utf8'));
} catch (e) {
  console.error(e);
}
