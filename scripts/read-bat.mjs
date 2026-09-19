import fs from 'fs';

const paths = [
  'C:/Users/berka/OneDrive/Desktop/baslat-pos-watcher.bat',
  'C:/Users/berka/OneDrive/Masaüstü/baslat-pos-watcher.bat'
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log(`--- Content of ${p} ---`);
    console.log(fs.readFileSync(p, 'utf8'));
  } else {
    console.log(`Not found: ${p}`);
  }
}
