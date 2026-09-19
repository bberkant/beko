import fs from 'fs';
import path from 'path';
import os from 'os';

const searchRecursive = (dir, depth = 0) => {
  if (depth > 4) return;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        if (f.startsWith('.') || f === 'node_modules' || f === 'AppData') continue;
        searchRecursive(fullPath, depth + 1);
      } else {
        if (f.toLowerCase().includes('desktop-sjq3lnb') || f.toLowerCase() === 'f.lnk' || f.includes('192.168')) {
          console.log(`Found match: ${fullPath}`);
        }
      }
    }
  } catch (err) {}
};

searchRecursive(os.homedir());
console.log("Done searching.");
