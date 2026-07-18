begin;

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bank text not null,
  account_name text not null,
  account_type text not null check (account_type in ('vadesiz','vadeli','kredi','pos')),
  iban text not null,
  account_number text not null default '',
  branch_name text not null default '',
  currency text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  balance numeric(16,2) not null default 0,
  available_balance numeric(16,2) not null default 0,
  status text not null default 'aktif' check (status in ('aktif','pasif','bloke')),
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('giris','cikis')),
  category text not null default 'diger',
  amount numeric(16,2) not null check (amount > 0),
  counterparty text not null default '',
  description text not null default '',
  receipt_path text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plate text not null,
  brand text not null,
  model text not null,
  model_year smallint not null check (model_year between 1950 and 2100),
  vehicle_type text not null default 'otomobil',
  fuel_type text not null default 'dizel',
  current_km integer not null default 0 check (current_km >= 0),
  assigned_to text not null default '',
  department text not null default '',
  purchase_date date,
  inspection_date date,
  insurance_date date,
  casco_date date,
  status text not null default 'aktif' check (status in ('aktif','bakimda','pasif','satildi')),
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plate)
);

create table if not exists public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  expense_date date not null,
  expense_type text not null check (expense_type in ('yakit','bakim','onarim','sigorta','kasko','muayene','vergi','otopark','diger')),
  amount numeric(16,2) not null check (amount > 0),
  km integer check (km is null or km >= 0),
  supplier text not null default '',
  description text not null default '',
  document_path text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists bank_accounts_org_idx on public.bank_accounts(organization_id);
create index if not exists bank_transactions_account_idx on public.bank_transactions(account_id, transaction_date desc);
create index if not exists vehicles_org_idx on public.vehicles(organization_id);
create index if not exists vehicle_expenses_vehicle_idx on public.vehicle_expenses(vehicle_id, expense_date desc);

alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_expenses enable row level security;

create policy "bank_accounts_select_members" on public.bank_accounts for select using (public.is_org_member(organization_id));
create policy "bank_accounts_write_staff" on public.bank_accounts for all using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));
create policy "bank_transactions_select_members" on public.bank_transactions for select using (public.is_org_member(organization_id));
create policy "bank_transactions_write_staff" on public.bank_transactions for all using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));
create policy "vehicles_select_members" on public.vehicles for select using (public.is_org_member(organization_id));
create policy "vehicles_write_staff" on public.vehicles for all using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));
create policy "vehicle_expenses_select_members" on public.vehicle_expenses for select using (public.is_org_member(organization_id));
create policy "vehicle_expenses_write_staff" on public.vehicle_expenses for all using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('operations-documents', 'operations-documents', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760;

create policy "operations_documents_read" on storage.objects for select
using (bucket_id = 'operations-documents' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy "operations_documents_insert" on storage.objects for insert
with check (bucket_id = 'operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));
create policy "operations_documents_update" on storage.objects for update
using (bucket_id = 'operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));
create policy "operations_documents_delete" on storage.objects for delete
using (bucket_id = 'operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));

commit;
