begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'muhasebe', 'goruntuleyici')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = auth.uid() and active
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org
      and user_id = auth.uid()
      and active
      and role = any(allowed_roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name)
select id, coalesce(email, ''), coalesce(raw_user_meta_data->>'full_name', '')
from auth.users
on conflict (id) do update set email = excluded.email;

create or replace function public.bootstrap_organization(company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if exists (select 1 from public.organization_members where user_id = auth.uid() and active) then
    raise exception 'Kullanıcı zaten bir şirkete bağlı';
  end if;
  if length(trim(company_name)) < 2 then raise exception 'Geçerli şirket adı gerekli'; end if;

  insert into public.organizations (name, created_by)
  values (trim(company_name), auth.uid()) returning id into new_org_id;
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, auth.uid(), 'admin');
  return new_org_id;
end;
$$;

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bank text not null,
  bank_short text not null,
  card_name text not null,
  card_type text not null,
  last4 text not null check (last4 ~ '^\\d{4}$'),
  holder text not null,
  department text not null default '',
  card_limit numeric(16,2) not null default 0,
  current_debt numeric(16,2) not null default 0,
  currency text not null default 'TRY',
  statement_day smallint not null check (statement_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  min_payment_rate numeric(5,4) not null default 0.20,
  start_date date not null,
  expiry_month smallint not null check (expiry_month between 1 and 12),
  expiry_year smallint not null,
  status text not null,
  statement_status text not null default 'bekleniyor',
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.statements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  period text not null,
  statement_date date not null,
  due_date date not null,
  total_debt numeric(16,2) not null default 0,
  min_payment numeric(16,2) not null default 0,
  transaction_count integer not null default 0,
  file_name text,
  file_path text,
  ai_status text not null default 'analiz-bekliyor',
  payment_status text not null default 'odenmedi',
  note text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, card_id, statement_date)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid not null references public.statements(id) on delete cascade,
  transaction_date date not null,
  merchant text not null,
  description text not null default '',
  category text not null default 'diger',
  amount numeric(16,2) not null,
  installments integer not null default 1,
  spender text not null default '',
  review_status text not null default 'normal',
  unusual boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid references public.statements(id) on delete set null,
  payment_date date not null,
  amount numeric(16,2) not null check (amount > 0),
  payment_type text not null,
  bank_account text not null,
  description text,
  receipt_path text,
  recorded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists credit_cards_org_idx on public.credit_cards(organization_id);
create index if not exists statements_org_card_idx on public.statements(organization_id, card_id);
create index if not exists transactions_statement_idx on public.transactions(statement_id);
create index if not exists payments_card_idx on public.payments(card_id);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.credit_cards enable row level security;
alter table public.statements enable row level security;
alter table public.transactions enable row level security;
alter table public.payments enable row level security;

create policy "profiles_select_self" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "organizations_select_members" on public.organizations for select using (public.is_org_member(id));
create policy "members_select_same_org" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "members_manage_admin" on public.organization_members for all using (public.has_org_role(organization_id, array['admin'])) with check (public.has_org_role(organization_id, array['admin']));

create policy "cards_select_members" on public.credit_cards for select using (public.is_org_member(organization_id));
create policy "cards_write_staff" on public.credit_cards for insert with check (public.has_org_role(organization_id, array['admin','muhasebe']));
create policy "cards_update_staff" on public.credit_cards for update using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));
create policy "cards_delete_admin" on public.credit_cards for delete using (public.has_org_role(organization_id, array['admin']));

create policy "statements_select_members" on public.statements for select using (public.is_org_member(organization_id));
create policy "statements_write_staff" on public.statements for all using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));
create policy "transactions_select_members" on public.transactions for select using (public.is_org_member(organization_id));
create policy "transactions_write_staff" on public.transactions for all using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));
create policy "payments_select_members" on public.payments for select using (public.is_org_member(organization_id));
create policy "payments_write_staff" on public.payments for all using (public.has_org_role(organization_id, array['admin','muhasebe'])) with check (public.has_org_role(organization_id, array['admin','muhasebe']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('credit-card-statements', 'credit-card-statements', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf'];

create policy "statement_files_read_members" on storage.objects for select
using (bucket_id = 'credit-card-statements' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy "statement_files_insert_staff" on storage.objects for insert
with check (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));
create policy "statement_files_update_staff" on storage.objects for update
using (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));
create policy "statement_files_delete_staff" on storage.objects for delete
using (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));

grant execute on function public.bootstrap_organization(text) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

commit;
