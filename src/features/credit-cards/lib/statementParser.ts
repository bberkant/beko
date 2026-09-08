import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { SpendingCategory, TransactionReviewStatus } from '../types';

GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfTextItem {
  str: string;
  width: number;
  transform: number[];
}

export interface ParsedStatementTransaction {
  date: string;
  merchant: string;
  description: string;
  category: SpendingCategory;
  amount: number;
  installments: number;
  reviewStatus: TransactionReviewStatus;
}

export interface ParsedStatement {
  statementDate?: string;
  dueDate?: string;
  totalDebt?: number;
  minPayment?: number;
  transactions: ParsedStatementTransaction[];
}

const MONTHS: Record<string, number> = {
  Ocak: 1, Şubat: 2, Mart: 3, Nisan: 4, Mayıs: 5, Haziran: 6,
  Temmuz: 7, Ağustos: 8, Eylül: 9, Ekim: 10, Kasım: 11, Aralık: 12,
};

const DATE_PATTERN = '(?:(\\d{1,2})\\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\\s+(\\d{4})|(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{4}))';
const MONEY_PATTERN = /-?\b\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\b/g;

function decodeGarbledLine(text: string): string {
  // Replace control characters (like unrenderable \u0003 boxes) with space first
  const cleanText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();

  // Clean common word formatting issues first
  const cleanedText = cleanText
    .replace(/gGHPH/g, 'ÖDEME')
    .replace(/%RUo/g, 'BORÇ')
    .replace(/\.UHGL/g, 'KREDİ')
    .replace(/\.DUWÕ/g, 'KARTI')
    .replace(/B\/DUMLU/g, 'DUMLU')
    .replace(/B\/YENİYIL/g, 'YENİYIL')
    .replace(/g=\//g, 'ÖZ')
    .replace(/g=$/g, 'ÖZ');

  // Check if the entire line has any signs of being garbled
  const hasGarbledSignatures = /ø|ù|Õ|5\(0=|&ø7|3\(752\//.test(cleanedText) || 
                               /[A-Z]{2}L[A-Z]{2}L[A-Z]{4}/.test(cleanedText) ||
                               /[\$%&'\(\)\*\+:=<>øùÕ]/.test(cleanedText);

  if (!hasGarbledSignatures) {
    return cleanedText.replace(/MARKEL/g, 'MARKET');
  }

  // Split into words and decode each word individually to protect clean dates and amounts
  const words = cleanedText.split(' ');
  const decodedWords = words.map(word => {
    const isDate = /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(word);
    const isCurrency = /^-?(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2}$/.test(word);
    
    // If it's a clean date or currency amount, protect it from shifting
    if (isDate || isCurrency) {
      return word;
    }

    let result = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const code = char.charCodeAt(0);
      if (code >= 36 && code <= 61) {
        result += String.fromCharCode(code + 29);
      } else {
        switch (char) {
          case 'ø': result += 'İ'; break;
          case 'ù': result += 'Ş'; break;
          case 'Õ': result += 'I'; break;
          case 'o': result += 'Ç'; break;
          case 'g': result += 'Ö'; break;
          case 'd': result += 'Ç'; break;
          case 'h': result += 'Ü'; break;
          case 'ö': result += 'Ğ'; break;
          default: result += char; break;
        }
      }
    }
    return result;
  });

  return decodedWords.join(' ').replace(/MARKEL/g, 'MARKET');
}

function parseMoney(value: string): number {
  const isNegative = value.startsWith('-');
  let clean = value.replace(/[+-]/g, '').replace(/TL/g, '').trim();
  
  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');
  
  if (hasComma && hasDot) {
    if (clean.indexOf(',') < clean.indexOf('.')) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    const parts = clean.split(',');
    if (parts[1] && parts[1].length === 3) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(',', '.');
    }
  } else if (hasDot) {
    const parts = clean.split('.');
    if (parts[1] && parts[1].length === 3 && parts.length === 2) {
      clean = clean.replace(/\./g, '');
    }
  }
  
  const amount = Number(clean);
  return isNegative ? -amount : amount;
}

function parseMatchedDate(
  day1: string | undefined, monthWord: string | undefined, year1: string | undefined,
  day2: string | undefined, monthNum: string | undefined, year2: string | undefined
): string {
  if (day1 && monthWord && year1) {
    return `${year1}-${String(MONTHS[monthWord]).padStart(2, '0')}-${String(Number(day1)).padStart(2, '0')}`;
  }
  if (day2 && monthNum && year2) {
    return `${year2}-${String(Number(monthNum)).padStart(2, '0')}-${String(Number(day2)).padStart(2, '0')}`;
  }
  return '';
}

function categoryFor(text: string): SpendingCategory {
  const normalized = text.toLocaleUpperCase('tr-TR');
  if (/ÖDEME|ODEME/.test(normalized)) return 'odeme';
  if (/AKARYAKIT|OPET|SHELL|PETROL|TOTAL|BP|POAS|PINAR OKSUZ|REMZİ TEMEL|T\s*O\s*T\s*A\s*L/.test(normalized)) return 'yakit';
  if (/RESTORAN|CAFE|KAFE|YEMEK|DÖNER|DONER|KEBAP|LOKANTA|PİZZA|PIZZA|MUTFAK/.test(normalized)) return 'yemek';
  if (/TURKCELL|VODAFONE|TELEKOMUNIKASYON|GSM/.test(normalized)) return 'telefon';
  if (/FATURA|ELEKTRİK|ELEKTRIK|SU KANAL|ASKI|ISKI|BUSKI|DOGALGAZ|DOĞALGAZ|DIGITURK|D-SMART|TELEKOM/.test(normalized)) return 'fatura';
  if (/MARKET|MİGROS|MIGROS|ŞOK|SOK /.test(normalized)) return 'market';
  if (/OTEL|HOTEL|KONAK/.test(normalized)) return 'konaklama';
  if (/UÇAK|HAVAYOL|SEYAHAT|BİLET/.test(normalized)) return 'seyahat';
  if (/SERVİS|BAKIM|YEDEK PARÇA/.test(normalized)) return 'bakim';
  if (/KOÇTAŞ|MALZEME|HIRDAVAT/.test(normalized)) return 'malzeme';
  return 'diger';
}

function lineText(items: PdfTextItem[]): string {
  const sorted = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  let result = '';
  let previousEnd = 0;
  for (const item of sorted) {
    const x = item.transform[4];
    const gap = x - previousEnd;
    if (result && gap > 2) result += ' ';
    result += item.str;
    previousEnd = x + item.width;
  }
  return result.replace(/\s+/g, ' ').trim();
}

async function extractLines(file: File): Promise<string[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pdf = await getDocument({
    data,
    cMapUrl: baseUrl ? `${baseUrl}/cmaps/` : '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: baseUrl ? `${baseUrl}/standard_fonts/` : '/standard_fonts/',
  }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, PdfTextItem[]>();
    for (const rawItem of content.items) {
      if (!('str' in rawItem) || !rawItem.str.trim()) continue;
      const item = rawItem as PdfTextItem;
      const y = Math.round(item.transform[5] * 2) / 2;
      const existingY = [...rows.keys()].find((key) => Math.abs(key - y) <= 1.5);
      const rowY = existingY ?? y;
      rows.set(rowY, [...(rows.get(rowY) ?? []), item]);
    }
    [...rows.entries()]
      .sort(([a], [b]) => b - a)
      .forEach(([, items]) => {
        const line = lineText(items);
        if (line) lines.push(line);
      });
  }
  return lines.map(decodeGarbledLine);
}

function headerDate(text: string, label: string): string | undefined {
  const match = text.match(new RegExp(`${label}[^\\d]*?${DATE_PATTERN}`, 'i'));
  if (!match) return undefined;
  return parseMatchedDate(match[1], match[2], match[3], match[4], match[5], match[6]);
}

function headerMoney(text: string, label: string): number | undefined {
  const match = text.match(new RegExp(`${label}[^\\d]*?([-+]?\\d{1,3}(?:[.,]\\d{3})*[.,]\\d{2})\\s*(?:TL)?`, 'i'));
  return match ? parseMoney(match[1]) : undefined;
}

export async function parseStatementPdf(file: File): Promise<ParsedStatement> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Yalnızca PDF dosyaları işlenebilir.');
  }

  const lines = await extractLines(file);
  const fullText = lines.join('\n');
  const transactions: ParsedStatementTransaction[] = [];
  let current: ParsedStatementTransaction | null = null;
  const transactionRegex = new RegExp(`^${DATE_PATTERN}\\s+(.+)$`);

  for (const line of lines) {
    const match = line.match(transactionRegex);
    if (match) {
      const remainder = match[7];
      const moneyMatches = [...remainder.matchAll(MONEY_PATTERN)];
      if (moneyMatches.length === 0) continue;
      const amountMatch = moneyMatches[0];
      const rawDescription = remainder.slice(0, amountMatch.index).trim();
      if (!rawDescription || /ÖNCEKİ DÖNEM HESAP ÖZETİ BORCU/i.test(rawDescription)) continue;

      const isPayment = /ÖDEME|ODEME/i.test(rawDescription);
      current = {
        date: parseMatchedDate(match[1], match[2], match[3], match[4], match[5], match[6]),
        merchant: rawDescription,
        description: isPayment ? 'Kredi kartı ödemesi' : rawDescription,
        category: 'diger',
        amount: parseMoney(amountMatch[0]),
        installments: 1,
        reviewStatus: 'normal',
      };
      current.category = isPayment ? 'odeme' : categoryFor(rawDescription);
      const installmentMatch = remainder.match(/\/\s*(\d+)\s*$/);
      if (installmentMatch) current.installments = Number(installmentMatch[1]);
      transactions.push(current);
      continue;
    }

    if (current && /(?:işlemin\s+\d+\s*\/\s*(\d+)\s+taksidi|İşlem Tutarı:|ABNO|FTNO)/i.test(line)) {
      current.description = `${current.description} · ${line}`;
      const installmentMatch = line.match(/işlemin\s+\d+\s*\/\s*(\d+)\s+taksidi/i);
      if (installmentMatch) current.installments = Number(installmentMatch[1]);
    }
  }

  // Allow empty transactions array for statements with no transactions (e.g. zero debt statements)

  return {
    statementDate: headerDate(fullText, 'Hesap Kesim Tarihi'),
    dueDate: headerDate(fullText, 'Son Ödeme Tarihi'),
    totalDebt: headerMoney(fullText, 'Dönem Borcu'),
    minPayment: headerMoney(fullText, 'Ödenmesi Gereken Asgari Tutar(?:/Oran)?') ?? headerMoney(fullText, 'Asgari Ödeme Tutarı'),
    transactions,
  };
}
