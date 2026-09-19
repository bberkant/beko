begin;

create table if not exists public.main_cashbox_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_date date not null default current_date,
  transaction_type text not null check (transaction_type in ('gelir', 'gider')),
  amount numeric(16,2) not null check (amount > 0),
  currency text not null default 'TRY' check (currency in ('TRY','USD','EUR','GBP')),
  category text not null,
  recipient_payer text not null default '',
  description text not null default '',
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  file_path text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists main_cashbox_transactions_org_idx on public.main_cashbox_transactions (organization_id, transaction_date desc);

alter table public.main_cashbox_transactions enable row level security;

create policy "main_cashbox_transactions_select_members" on public.main_cashbox_transactions
  for select using (public.is_org_member(organization_id));

create policy "main_cashbox_transactions_write_staff" on public.main_cashbox_transactions
  for all using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

-- Add module documents constraint support for main_cashbox
alter table public.module_documents drop constraint if exists module_documents_module_check;
alter table public.module_documents add constraint module_documents_module_check
  check (module in ('bank_accounts','vehicles','traffic_fines','drivers','tenders','real_estates','main_cashbox'));

commit;
