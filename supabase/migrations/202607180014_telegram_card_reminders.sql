begin;

create table if not exists public.credit_card_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid not null references public.statements(id) on delete cascade,
  channel text not null default 'telegram' check (channel in ('telegram')),
  reminder_days smallint not null default 2 check (reminder_days between 0 and 30),
  recipient_ref text not null,
  sent_at timestamptz not null default now(),
  unique (statement_id, channel, reminder_days, recipient_ref)
);

create index if not exists credit_card_reminder_logs_org_sent_idx
  on public.credit_card_reminder_logs (organization_id, sent_at desc);

alter table public.credit_card_reminder_logs enable row level security;

create policy "credit_card_reminder_logs_select_admin"
  on public.credit_card_reminder_logs for select to authenticated
  using (public.has_org_role(organization_id, array['admin']));

commit;
