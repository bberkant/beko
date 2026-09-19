begin;

-- Drop the old constraint restricting reminder_days to [0, 30]
alter table public.credit_card_reminder_logs
  drop constraint if exists credit_card_reminder_logs_reminder_days_check;

-- Add a new constraint allowing negative values (representing overdue days)
alter table public.credit_card_reminder_logs
  add constraint credit_card_reminder_logs_reminder_days_check
  check (reminder_days between -1000 and 30);

commit;
