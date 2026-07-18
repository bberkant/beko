import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API = 'https://api.telegram.org';
const REMINDER_DAYS = 2;
const TIME_ZONE = 'Europe/Istanbul';

interface CardRow {
  id: string;
  bank: string;
  card_name: string;
  last4: string;
  status: string;
}

interface StatementRow {
  id: string;
  organization_id: string;
  card_id: string;
  period: string;
  due_date: string;
  total_debt: number | string;
  payment_status: string;
  credit_cards: CardRow | CardRow[];
}

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
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
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
  }).format(new Date(`${value}T12:00:00+03:00`));
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID');

  if (!supabaseUrl || !serviceRoleKey || !telegramToken || !telegramChatId) {
    return Response.json({ error: 'Gerekli sunucu secret değerleri eksik.' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.test === true) {
    const testResponse = await fetch(`${TELEGRAM_API}/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: '✅ OPS360 Telegram bağlantısı başarıyla kuruldu. Kredi kartı hatırlatmaları bu sohbetten gönderilecek.',
      }),
    });
    const testResult = await testResponse.json().catch(() => null);
    return Response.json(testResult, { status: testResponse.ok ? 200 : 502 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const today = localDate(new Date());
  const targetDueDate = addDays(today, REMINDER_DAYS);

  const { data, error } = await supabase
    .from('statements')
    .select('id,organization_id,card_id,period,due_date,total_debt,payment_status,credit_cards!statements_card_id_fkey(id,bank,card_name,last4,status)')
    .eq('due_date', targetDueDate)
    .neq('payment_status', 'odendi')
    .eq('credit_cards.status', 'aktif');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const statement of (data ?? []) as unknown as StatementRow[]) {
    const card = Array.isArray(statement.credit_cards)
      ? statement.credit_cards[0]
      : statement.credit_cards;
    if (!card) continue;

    const { data: previous } = await supabase
      .from('credit_card_reminder_logs')
      .select('id')
      .eq('statement_id', statement.id)
      .eq('channel', 'telegram')
      .eq('reminder_days', REMINDER_DAYS)
      .eq('recipient_ref', telegramChatId)
      .maybeSingle();
    if (previous) {
      skipped += 1;
      continue;
    }

    const message = [
      '🔔 Kredi Kartı Son Ödeme Hatırlatması',
      '',
      `Kart: ${card.bank} ${card.card_name} •••• ${card.last4}`,
      `Ekstre: ${statement.period}`,
      `Toplam borç: ${money(statement.total_debt)}`,
      `Son ödeme: ${displayDate(statement.due_date)}`,
      `Kalan süre: ${REMINDER_DAYS} gün`,
    ].join('\n');

    const telegramResponse = await fetch(`${TELEGRAM_API}/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramChatId, text: message }),
    });
    const telegramResult = await telegramResponse.json().catch(() => null);
    if (!telegramResponse.ok || !telegramResult?.ok) {
      failures.push(`${statement.id}: ${telegramResult?.description ?? telegramResponse.statusText}`);
      continue;
    }

    const { error: logError } = await supabase.from('credit_card_reminder_logs').insert({
      organization_id: statement.organization_id,
      card_id: statement.card_id,
      statement_id: statement.id,
      channel: 'telegram',
      reminder_days: REMINDER_DAYS,
      recipient_ref: telegramChatId,
    });
    if (logError && logError.code !== '23505') failures.push(`${statement.id}: ${logError.message}`);
    sent += 1;
  }

  return Response.json({ date: today, targetDueDate, found: data?.length ?? 0, sent, skipped, failures });
});
