import type { GuaranteeLetter } from '../data/seedGuaranteeLetters';

export type LetterType = 'KESİN' | 'GEÇİCİ' | 'AVANS';
export type LetterStatus = 'aktif' | 'iade_edildi' | 'hukumsuz';

export type SortField =
  | 'end_date'
  | 'institution_name'
  | 'amount'
  | 'issue_date'
  | 'bank_name'
  | 'letter_type'
  | 'status';

export interface GuaranteeMetrics {
  totalCount: number;
  activeCount: number;
  totalAmount: number;
  kesinCount: number;
  kesinAmount: number;
  geciciCount: number;
  geciciAmount: number;
  avansCount: number;
  avansAmount: number;
  expiringCount: number;
  expiringAmount: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
}

/**
 * Normalizes Turkish text for search, mapping uppercase dotted/dotless I,
 * Turkish characters (ç, ğ, ı, ö, ş, ü), and accents (â, î, û) to provide seamless instant search.
 */
export function normalizeTurkishSearch(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * Robust money parser that correctly handles Turkish and European currency formats:
 * - "1.500.000" -> 1500000
 * - "250.000" -> 250000
 * - "1.500.000,50" -> 1500000.5
 * - "1,500,000.50" -> 1500000.5
 * - "1.500 (KDV Dahil)" -> 1500
 * - "500000" -> 500000
 * - "500,50" -> 500.5
 * - "₺ 25.307.831" -> 25307831
 */
export function parseMoneyInput(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;

  // Retain only digits, dots, commas, and optional leading minus
  let str = String(val).trim().replace(/[^0-9.,-]/g, '');
  if (!str) return 0;

  const isNegative = str.startsWith('-');
  if (isNegative) {
    str = str.slice(1);
  }

  if (str.includes('.') && str.includes(',')) {
    // Both present: check which is the decimal separator
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // European/Turkish: dots for thousands, comma for decimal (e.g. 1.500.000,50)
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US/EN: commas for thousands, dot for decimal (e.g. 1,500,000.50)
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const commaParts = str.split(',');
    if (commaParts.length === 2 && commaParts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      // Multiple dots -> all thousands separators (e.g. 1.500.000)
      str = str.replace(/\./g, '');
    } else if (dotParts.length === 2 && dotParts[1].length === 3) {
      // Single dot followed by exactly 3 digits -> thousands separator (e.g. 250.000 or 1.500)
      str = str.replace(/\./g, '');
    }
  }

  const result = parseFloat(str);
  if (isNaN(result)) return 0;
  return isNegative ? -result : result;
}

export function formatMoneyInput(val: string | number): string {
  if (val === null || val === undefined || val === '') return '';

  if (typeof val === 'number') {
    if (isNaN(val)) return '';
    return val.toLocaleString('tr-TR', {
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  let s = String(val).trim();
  if (!s) return '';

  const withoutDots = s.replace(/\./g, '');
  let cleanVal = '';
  let hasComma = false;
  for (let i = 0; i < withoutDots.length; i++) {
    const char = withoutDots[i];
    if (char >= '0' && char <= '9') {
      cleanVal += char;
    } else if (char === ',' && !hasComma) {
      cleanVal += char;
      hasComma = true;
    }
  }

  const parts = cleanVal.split(',');
  let integerPart = parts[0] || '';
  const decimalPart = parts[1];

  if (integerPart.length > 1 && integerPart.startsWith('0')) {
    integerPart = integerPart.replace(/^0+/, '') || '0';
  }

  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  if (hasComma) {
    const dec = decimalPart !== undefined ? decimalPart.slice(0, 2) : '';
    return (integerPart || '0') + ',' + dec;
  }

  return integerPart;
}

export function formatMoney(amount: number): string {
  const hasFraction = amount % 1 !== 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined' || dateStr === '-') return '-';
  const clean = String(dateStr).trim().slice(0, 10);
  if (clean.includes('.')) {
    const dotParts = clean.split('.');
    if (dotParts.length === 3 && dotParts[2].length === 4) return clean;
  }
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return clean;
}

/**
 * Deterministic calendar day difference between target date and refDate (today).
 * Uses local calendar year/month/day to prevent UTC midnight timezone shifts.
 * Supports both ISO 'YYYY-MM-DD' and Turkish 'DD.MM.YYYY' formats.
 */
export function getDaysDiff(dateStr: string | null | undefined, refDate: Date = new Date()): number | null {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return null;
  const clean = String(dateStr).trim().slice(0, 10);
  let y: number, m: number, d: number;

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length !== 3) return null;
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) - 1;
    d = parseInt(parts[2], 10);
  } else if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length !== 3) return null;
    d = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) - 1;
    y = parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const target = new Date(y, m, d);
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone || phone === 'null' || phone === 'undefined') return '-';
  const clean = String(phone).trim();
  if (!clean) return '-';

  // Retain non-digit characters if there is an extension like '-6724' or '/'
  if (clean.includes('/') || (clean.includes('-') && clean.replace(/\D/g, '').length > 12)) {
    return clean;
  }

  const digits = clean.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('90')) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  return clean;
}

export function calculateMetrics(letters: GuaranteeLetter[], refDate: Date = new Date()): GuaranteeMetrics {
  const activeLetters = letters.filter((l) => l.status === 'aktif');
  const totalAmount = activeLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const kesinLetters = activeLetters.filter((l) => l.letter_type === 'KESİN');
  const kesinAmount = kesinLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const geciciLetters = activeLetters.filter((l) => l.letter_type === 'GEÇİCİ');
  const geciciAmount = geciciLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const avansLetters = activeLetters.filter((l) => l.letter_type === 'AVANS');
  const avansAmount = avansLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const overdueLetters = activeLetters.filter((l) => {
    const diff = getDaysDiff(l.end_date, refDate);
    return diff !== null && diff < 0;
  });
  const overdueAmount = overdueLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const upcomingLetters = activeLetters.filter((l) => {
    const diff = getDaysDiff(l.end_date, refDate);
    return diff !== null && diff >= 0 && diff <= 30;
  });
  const upcomingAmount = upcomingLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const expiringLetters = activeLetters.filter((l) => {
    const diff = getDaysDiff(l.end_date, refDate);
    return diff !== null && diff <= 30;
  });
  const expiringAmount = expiringLetters.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  return {
    totalCount: letters.length,
    activeCount: activeLetters.length,
    totalAmount,
    kesinCount: kesinLetters.length,
    kesinAmount,
    geciciCount: geciciLetters.length,
    geciciAmount,
    avansCount: avansLetters.length,
    avansAmount,
    expiringCount: expiringLetters.length,
    expiringAmount,
    overdueCount: overdueLetters.length,
    overdueAmount,
    upcomingCount: upcomingLetters.length,
    upcomingAmount,
  };
}

export function sortLetters(
  letters: GuaranteeLetter[],
  sortField: SortField,
  sortOrder: 'asc' | 'desc'
): GuaranteeLetter[] {
  return [...letters].sort((a, b) => {
    if (sortField === 'end_date' || sortField === 'issue_date') {
      const dateA = a[sortField];
      const dateB = b[sortField];
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // null dates always at bottom
      if (!dateB) return -1;
      const timeA = new Date(dateA).getTime();
      const timeB = new Date(dateB).getTime();
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    }

    if (sortField === 'amount') {
      const valA = Number(a.amount) || 0;
      const valB = Number(b.amount) || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    // institution_name, bank_name, letter_type, status
    // Use Turkish localeCompare directly to preserve proper ordering of I / İ, Ş / S, etc.
    const valA = (a[sortField] || '').trim();
    const valB = (b[sortField] || '').trim();
    return sortOrder === 'asc' ? valA.localeCompare(valB, 'tr') : valB.localeCompare(valA, 'tr');
  });
}
