begin;

create table if not exists public.vehicle_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  document_type text not null check (document_type in ('sigorta', 'kasko', 'muayene')),
  due_date date not null,
  channel text not null default 'telegram' check (channel in ('telegram')),
  recipient_ref text not null,
  sent_at timestamptz not null default now(),
  unique (vehicle_id, document_type, due_date, channel, recipient_ref)
);

create index if not exists vehicle_reminder_logs_org_sent_idx
  on public.vehicle_reminder_logs (organization_id, sent_at desc);

alter table public.vehicle_reminder_logs enable row level security;

create policy "vehicle_reminder_logs_select_admin"
  on public.vehicle_reminder_logs for select to authenticated
  using (public.has_org_role(organization_id, array['admin']));

commit;
