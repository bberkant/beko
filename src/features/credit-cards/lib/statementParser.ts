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

const DATE_PATTERN = '(\\d{1,2})\\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\\s+(\\d{4})';
const MONEY_PATTERN = /[+-]?\d{1,3}(?:\.\d{3})*,\d{2}/g;

function parseMoney(value: string): number {
  const sign = value.startsWith('+') ? -1 : 1;
  return sign * Number(value.replace(/[+-]/g, '').replace(/\./g, '').replace(',', '.'));
}

function parseDate(day: string, month: string, year: string): string {
  return `${year}-${String(MONTHS[month]).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
}

function categoryFor(text: string): SpendingCategory {
  const normalized = text.toLocaleUpperCase('tr-TR');
  if (/AKARYAKIT|OPET|SHELL|PETROL/.test(normalized)) return 'yakit';
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
  const pdf = await getDocument({ data }).promise;
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
  return lines;
}

function headerDate(text: string, label: string): string | undefined {
  const match = text.match(new RegExp(`${label}\\s*:?\\s*${DATE_PATTERN}`, 'i'));
  return match ? parseDate(match[1], match[2], match[3]) : undefined;
}

function headerMoney(text: string, label: string): number | undefined {
  const match = text.match(new RegExp(`${label}\\s*:?\\s*([\\d.]+,\\d{2})\\s*TL`, 'i'));
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
      const remainder = match[4];
      const moneyMatches = [...remainder.matchAll(MONEY_PATTERN)];
      if (moneyMatches.length === 0) continue;
      const amountMatch = moneyMatches[0];
      const rawDescription = remainder.slice(0, amountMatch.index).trim();
      if (!rawDescription || /ÖNCEKİ DÖNEM HESAP ÖZETİ BORCU/i.test(rawDescription)) continue;

      const isPayment = /^ÖDEME[- ]/i.test(rawDescription);
      current = {
        date: parseDate(match[1], match[2], match[3]),
        merchant: rawDescription,
        description: isPayment ? 'Kredi kartı ödemesi' : rawDescription,
        category: 'diger',
        amount: parseMoney(amountMatch[0]),
        installments: 1,
        reviewStatus: 'normal',
      };
      current.category = categoryFor(rawDescription);
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

  if (transactions.length === 0) {
    throw new Error('PDF içinde okunabilir ekstre hareketi bulunamadı.');
  }

  return {
    statementDate: headerDate(fullText, 'Hesap Kesim Tarihi'),
    dueDate: headerDate(fullText, 'Son Ödeme Tarihi'),
    totalDebt: headerMoney(fullText, 'Dönem Borcu'),
    minPayment: headerMoney(fullText, 'Ödenmesi Gereken Asgari Tutar(?:/Oran)?'),
    transactions,
  };
}
