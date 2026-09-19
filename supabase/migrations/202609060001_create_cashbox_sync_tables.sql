begin;

-- 1. Giriş-Çıkış Günlük Rapor Tablosu
create table if not exists public.cashbox_giris_cikis_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  pos_list jsonb not null default '[]'::jsonb,
  giris_list jsonb not null default '[]'::jsonb,
  cikis_list jsonb not null default '[]'::jsonb,
  ana_kasa_list jsonb not null default '[]'::jsonb,
  pos_total numeric(16,2) default 0,
  giris_total numeric(16,2) default 0,
  cikis_total numeric(16,2) default 0,
  net_kalan numeric(16,2) default 0,
  ana_kasa_total numeric(16,2) default 0,
  bakiye_farki numeric(16,2) default 0,
  raw_file_name text,
  source text default 'office_pc_sync',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cashbox_giris_cikis_date_idx on public.cashbox_giris_cikis_reports (report_date desc);
alter table public.cashbox_giris_cikis_reports enable row level security;

create policy "cashbox_giris_cikis_select_all" on public.cashbox_giris_cikis_reports
  for select using (true);

create policy "cashbox_giris_cikis_write_all" on public.cashbox_giris_cikis_reports
  for all using (true) with check (true);


-- 2. Ana Kasa Günlük Rapor Tablosu
create table if not exists public.cashbox_ana_kasa_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  data jsonb not null default '{}'::jsonb,
  raw_file_name text,
  source text default 'office_pc_sync',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cashbox_ana_kasa_date_idx on public.cashbox_ana_kasa_reports (report_date desc);
alter table public.cashbox_ana_kasa_reports enable row level security;

create policy "cashbox_ana_kasa_select_all" on public.cashbox_ana_kasa_reports
  for select using (true);

create policy "cashbox_ana_kasa_write_all" on public.cashbox_ana_kasa_reports
  for all using (true) with check (true);


-- 3. Günlük Hesap Tablosu
create table if not exists public.cashbox_gunluk_hesap_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  data jsonb not null default '{}'::jsonb,
  raw_file_name text,
  source text default 'office_pc_sync',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cashbox_gunluk_hesap_date_idx on public.cashbox_gunluk_hesap_reports (report_date desc);
alter table public.cashbox_gunluk_hesap_reports enable row level security;

create policy "cashbox_gunluk_hesap_select_all" on public.cashbox_gunluk_hesap_reports
  for select using (true);

create policy "cashbox_gunluk_hesap_write_all" on public.cashbox_gunluk_hesap_reports
  for all using (true) with check (true);


-- 4. Storage Bucket for Excel Backups
insert into storage.buckets (id, name, public)
values ('kasa-excel-yedekleri', 'kasa-excel-yedekleri', true)
on conflict (id) do nothing;

create policy "kasa_excel_bucket_select" on storage.objects
  for select using (bucket_id = 'kasa-excel-yedekleri');

create policy "kasa_excel_bucket_insert" on storage.objects
  for insert with check (bucket_id = 'kasa-excel-yedekleri');

create policy "kasa_excel_bucket_update" on storage.objects
  for update using (bucket_id = 'kasa-excel-yedekleri');

commit;
