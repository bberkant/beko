-- Create system_backups table for full site snapshot and recovery
create table if not exists public.system_backups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by_name text,
  created_by_email text,
  tables_count int default 0,
  total_records int default 0,
  file_size_kb numeric default 0,
  backup_data jsonb not null
);

alter table public.system_backups enable row level security;

-- Admin and developer access policy
drop policy if exists "system_backups_manage_policy" on public.system_backups;
create policy "system_backups_manage_policy" on public.system_backups
  for all
  using (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
    or auth.email() like '%@dars.local'
    or auth.email() like '%@ets360.local'
  )
  with check (
    organization_id in (
      select organization_id from public.organization_members where user_id = auth.uid()
    )
    or auth.email() like '%@dars.local'
    or auth.email() like '%@ets360.local'
  );
