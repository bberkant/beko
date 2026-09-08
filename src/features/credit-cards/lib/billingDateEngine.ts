import type { CreditCard, Statement } from '../types';

export type BillingDateSource = 'statement' | 'estimated';

export interface ResolvedBillingDate {
  date: string;
  source: BillingDateSource;
  adjusted: boolean;
}

const fixedHolidayKeys = new Set(['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29']);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = (value: string) => { const [y, m, d] = value.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6 && !fixedHolidayKeys.has(dateKey(date).slice(5));
}

function moveToBusinessDay(value: Date, direction: -1 | 1) {
  const date = new Date(value);
  while (!isBusinessDay(date)) date.setDate(date.getDate() + direction);
  return date;
}

function estimatedCycles(card: CreditCard, reference: Date) {
  return [-1, 0, 1, 2].map((offset) => {
    const nominalStatement = new Date(reference.getFullYear(), reference.getMonth() + offset, card.statementDay);
    const statementDate = moveToBusinessDay(nominalStatement, -1);
    const dueMonthOffset = card.dueDay <= card.statementDay ? 1 : 0;
    const nominalDue = new Date(reference.getFullYear(), reference.getMonth() + offset + dueMonthOffset, card.dueDay);
    const dueDate = moveToBusinessDay(nominalDue, 1);
    return { statementDate, dueDate, adjusted: dateKey(nominalDue) !== dateKey(dueDate) || dateKey(nominalStatement) !== dateKey(statementDate) };
  });
}

export function resolveCardDueDate(card: CreditCard, statements: Statement[], reference = new Date()): ResolvedBillingDate {
  const today = new Date(reference); today.setHours(0, 0, 0, 0);

  const openStatement = statements
    .filter((statement) => statement.cardId === card.id && statement.paymentStatus !== 'odendi' && statement.dueDate)
    .sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];

  if (openStatement) {
    const stmtDue = parseDate(openStatement.dueDate);
    stmtDue.setHours(0, 0, 0, 0);
    const debt = Number(card.currentDebt) || 0;
    // Eğer ekstre vadesi geçmişte kaldıysa VE kartın güncel borcu sıfırsa,
    // kartı eski ayda takılı bırakma, yeni dönemin tahmini vadesine geç
    if (stmtDue < today && debt <= 0) {
      // Bir sonraki periyoda geç
    } else {
      return { date: openStatement.dueDate.slice(0, 10), source: 'statement', adjusted: false };
    }
  }

  const cycles = estimatedCycles(card, today);
  const cycle = cycles.find((item) => item.dueDate >= today) ?? cycles[cycles.length - 1];
  return { date: dateKey(cycle.dueDate), source: 'estimated', adjusted: cycle.adjusted };
}

export function resolveCardOutstandingDebt(card: CreditCard, statements: Statement[]) {
  const openStatement = statements
    .filter((statement) => statement.cardId === card.id && statement.paymentStatus !== 'odendi')
    .sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0];
  return openStatement ? Number(openStatement.totalDebt) || 0 : card.currentDebt;
}

export function isCardPaymentOverdue(card: CreditCard, statements: Statement[], reference = new Date()) {
  const today = new Date(reference); today.setHours(0, 0, 0, 0);
  const dueDate = resolveCardDueDate(card, statements, today).date;
  return (Number(card.currentDebt) || 0) > 0 && parseDate(dueDate) < today;
}
