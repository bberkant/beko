create table if not exists public.ebs_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  check_type text not null check (check_type in ('kesilen', 'alinan')),
  issue_date date,
  due_date date,
  amount numeric(16,2) not null,
  check_no text,
  debtor text,
  creditor text,
  bank_name text,
  bank_branch text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ebs_checks_org_idx on public.ebs_checks(organization_id);

alter table public.ebs_checks enable row level security;

create policy "ebs_checks_select_members" on public.ebs_checks for select using (public.is_org_member(organization_id));
create policy "ebs_checks_all_staff" on public.ebs_checks for all using (public.has_org_role(organization_id, array['admin', 'muhasebe'])) with check (public.has_org_role(organization_id, array['admin', 'muhasebe']));
