begin;

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tender_number text not null,
  title text not null,
  institution text not null,
  tender_type text not null default 'hizmet' check (tender_type in ('mal','hizmet','yapim','danismanlik','diger')),
  method text not null default 'acik' check (method in ('acik','pazarlik','dogrudan','davet')),
  status text not null default 'hazirlaniyor' check (status in ('hazirlaniyor','teklif-verildi','degerlendirme','kazanildi','kaybedildi','iptal')),
  estimated_amount numeric(16,2) not null default 0 check (estimated_amount >= 0),
  bid_amount numeric(16,2) check (bid_amount is null or bid_amount >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  publication_date date,
  deadline_at timestamptz not null,
  result_date date,
  assigned_to text not null default '',
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tender_number)
);
create index if not exists tenders_org_deadline_idx on public.tenders (organization_id, deadline_at);
alter table public.tenders enable row level security;
create policy "tenders_select_members" on public.tenders for select to authenticated
  using (public.is_org_member(organization_id));
create policy "tenders_write_staff" on public.tenders for all to authenticated
  using (public.has_org_role(organization_id,array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id,array['admin','muhasebe','finans']));

alter table public.module_documents drop constraint if exists module_documents_module_check;
alter table public.module_documents add constraint module_documents_module_check
  check (module in ('bank_accounts','vehicles','traffic_fines','drivers','tenders'));

commit;
