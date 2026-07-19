import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API = 'https://api.telegram.org';
const REMINDER_DAYS = [2, 1] as const;
const TIME_ZONE = 'Europe/Istanbul';

interface CardRow {
  id: string;
  organization_id: string;
  bank: string;
  card_name: string;
  last4: string;
  status: string;
  card_limit: number | string;
  current_debt: number | string;
  statement_day: number;
  due_day: number;
}

interface StatementRow {
  id: string;
  card_id: string;
  period: string;
  statement_date: string;
  due_date: string;
  payment_status: string;
}

const fixedHolidayKeys = new Set(['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29']);
const dateKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
const parseDate = (value: string) => { const [year, month, day] = value.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(year, month - 1, day, 12)); };

function localDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(date: string, days: number): string {
  const value = parseDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return dateKey(value);
}

function isBusinessDay(date: Date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6 && !fixedHolidayKeys.has(dateKey(date).slice(5));
}

function moveToBusinessDay(value: Date, direction: -1 | 1) {
  const date = new Date(value);
  while (!isBusinessDay(date)) date.setUTCDate(date.getUTCDate() + direction);
  return date;
}

function estimatedDueDate(card: CardRow, today: string) {
  const reference = parseDate(today);
  for (const offset of [-1, 0, 1, 2]) {
    const nominalStatement = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + offset, card.statement_day, 12));
    const statementDate = moveToBusinessDay(nominalStatement, -1);
    const dueMonthOffset = card.due_day <= card.statement_day ? 1 : 0;
    const nominalDue = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + offset + dueMonthOffset, card.due_day, 12));
    const dueDate = moveToBusinessDay(nominalDue, 1);
    if (dueDate >= reference && statementDate <= reference) return dateKey(dueDate);
  }
  return '';
}

function money(value: number | string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseDate(value));
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!supabaseUrl || !serviceRoleKey || !telegramToken || !telegramChatId) {
    return Response.json({ error: 'Gerekli sunucu secret de\u011ferleri eksik.' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.test === true) {
    const testResponse = await fetch(`${TELEGRAM_API}/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramChatId, text: '\u2705 OPS360 Telegram ba\u011flant\u0131s\u0131 ba\u015far\u0131yla kuruldu. Kredi kart\u0131 hat\u0131rlatmalar\u0131 bu sohbetten g\u00f6nderilecek.' }),
    });
    const testResult = await testResponse.json().catch(() => null);
    return Response.json(testResult, { status: testResponse.ok ? 200 : 502 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const today = localDate(new Date());
  const targetDueDates = REMINDER_DAYS.map((days) => addDays(today, days));
  const reminderDaysByDueDate = new Map(REMINDER_DAYS.map((days) => [addDays(today, days), days]));

  const { data: cardData, error: cardError } = await supabase
    .from('credit_cards')
    .select('id,organization_id,bank,card_name,last4,status,card_limit,current_debt,statement_day,due_day')
    .eq('status', 'aktif')
    .gt('card_limit', 0)
    .gt('current_debt', 0);
  if (cardError) return Response.json({ error: cardError.message }, { status: 500 });

  const cards = (cardData ?? []) as CardRow[];
  const cardIds = cards.map((card) => card.id);
  let statements: StatementRow[] = [];
  if (cardIds.length > 0) {
    const { data: statementData, error: statementError } = await supabase
      .from('statements')
      .select('id,card_id,period,statement_date,due_date,payment_status')
      .in('card_id', cardIds)
      .neq('payment_status', 'odendi')
      .order('statement_date', { ascending: false });
    if (statementError) return Response.json({ error: statementError.message }, { status: 500 });
    statements = (statementData ?? []) as StatementRow[];
  }

  const latestStatementByCard = new Map<string, StatementRow>();
  for (const statement of statements) {
    if (!latestStatementByCard.has(statement.card_id)) latestStatementByCard.set(statement.card_id, statement);
  }

  const candidates = cards.flatMap((card) => {
    const statement = latestStatementByCard.get(card.id);
    const dueDate = statement?.due_date?.slice(0, 10) || estimatedDueDate(card, today);
    const reminderDays = reminderDaysByDueDate.get(dueDate);
    return reminderDays ? [{ card, statement, dueDate, reminderDays }] : [];
  });

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];
  for (const { card, statement, dueDate, reminderDays } of candidates) {
    const { data: previous } = await supabase
      .from('credit_card_reminder_logs')
      .select('id')
      .eq('card_id', card.id)
      .eq('due_date', dueDate)
      .eq('channel', 'telegram')
      .eq('reminder_days', reminderDays)
      .eq('recipient_ref', telegramChatId)
      .maybeSingle();
    if (previous) { skipped += 1; continue; }

    const message = [
      '\ud83d\udd14 Kredi Kart\u0131 Son \u00d6deme Hat\u0131rlatmas\u0131',
      '',
      `Kart: ${card.bank} ${card.card_name} \u2022\u2022\u2022\u2022 ${card.last4}`,
      statement ? `Ekstre: ${statement.period}` : 'Ekstre: Hen\u00fcz y\u00fcklenmedi',
      `G\u00fcncel bor\u00e7: ${money(card.current_debt)}`,
      `Son \u00f6deme: ${displayDate(dueDate)}`,
      `Kalan s\u00fcre: ${reminderDays} g\u00fcn`,
    ].join('\n');

    const telegramResponse = await fetch(`${TELEGRAM_API}/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramChatId, text: message }),
    });
    const telegramResult = await telegramResponse.json().catch(() => null);
    if (!telegramResponse.ok || !telegramResult?.ok) {
      failures.push(`${card.id}: ${telegramResult?.description ?? telegramResponse.statusText}`);
      continue;
    }

    const { error: logError } = await supabase.from('credit_card_reminder_logs').insert({
      organization_id: card.organization_id,
      card_id: card.id,
      statement_id: statement?.id ?? null,
      due_date: dueDate,
      channel: 'telegram',
      reminder_days: reminderDays,
      recipient_ref: telegramChatId,
    });
    if (logError && logError.code !== '23505') failures.push(`${card.id}: ${logError.message}`);
    sent += 1;
  }

  return Response.json({ date: today, targetDueDates, cards: cards.length, found: candidates.length, sent, skipped, failures });
});
