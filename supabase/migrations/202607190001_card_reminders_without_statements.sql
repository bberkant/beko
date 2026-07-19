begin;

alter table public.credit_card_reminder_logs
  add column if not exists due_date date;

update public.credit_card_reminder_logs as reminder
set due_date = statement.due_date
from public.statements as statement
where reminder.statement_id = statement.id
  and reminder.due_date is null;

alter table public.credit_card_reminder_logs
  alter column statement_id drop not null;

drop index if exists public.credit_card_reminder_logs_card_due_unique_idx;
create unique index credit_card_reminder_logs_card_due_unique_idx
  on public.credit_card_reminder_logs (card_id, due_date, channel, reminder_days, recipient_ref);

commit;
