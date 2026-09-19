import { getDocument } from 'pdfjs-dist/build/pdf.mjs';
import fs from 'fs';

async function run() {
  try {
    const data = new Uint8Array(fs.readFileSync('C:/Users/berka/OneDrive/Desktop/Ekstre1.pdf'));
    const pdf = await getDocument({ data }).promise;
    console.log(`PDF Pages: ${pdf.numPages}`);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      console.log(`--- Page ${pageNumber} Items Count: ${content.items.length} ---`);
      
      const rows = new Map();
      for (const item of content.items) {
        if (!item.str.trim()) continue;
        const y = Math.round(item.transform[5] * 2) / 2;
        const existingY = [...rows.keys()].find((key) => Math.abs(key - y) <= 1.5);
        const rowY = existingY ?? y;
        rows.set(rowY, [...(rows.get(rowY) ?? []), item]);
      }
      
      [...rows.entries()]
        .sort(([a], [b]) => b - a)
        .forEach(([y, items]) => {
          const sorted = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
          const line = sorted.map(i => i.str).join(' ').trim();
          if (line) {
            console.log(`y=${y}: ${line}`);
          }
        });
    }
  } catch (error) {
    console.error(error);
  }
}

run();
