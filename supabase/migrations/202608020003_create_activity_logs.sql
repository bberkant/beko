-- Create activity_logs table
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid,
  user_email text,
  action_type text not null, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name text not null,
  record_id text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies
alter table public.activity_logs enable row level security;

-- Admin role can select all logs for their organization
create policy activity_logs_admin_select on public.activity_logs
  for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = activity_logs.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.role = 'admin'
    )
    or auth.email() = 'admin@ops360.local'
  );

-- Create generic audit log trigger function
create or replace function public.log_activity_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  current_org_id uuid := null;
  current_user_id uuid := auth.uid();
  current_user_email text := auth.email();
  rec_id text;
  old_val jsonb := null;
  new_val jsonb := null;
begin
  if tg_op = 'DELETE' then
    rec_id := coalesce(old.id::text, '');
    old_val := to_jsonb(old);
    begin
      current_org_id := old.organization_id;
    exception when others then
      current_org_id := null;
    end;
  elsif tg_op = 'INSERT' then
    rec_id := coalesce(new.id::text, '');
    new_val := to_jsonb(new);
    begin
      current_org_id := new.organization_id;
    exception when others then
      current_org_id := null;
    end;
  else
    rec_id := coalesce(new.id::text, '');
    old_val := to_jsonb(old);
    new_val := to_jsonb(new);
    begin
      current_org_id := new.organization_id;
    exception when others then
      current_org_id := null;
    end;
  end if;

  -- Only log if organization_id is determined
  if current_org_id is not null then
    insert into public.activity_logs (
      organization_id,
      user_id,
      user_email,
      action_type,
      table_name,
      record_id,
      old_data,
      new_data
    ) values (
      current_org_id,
      current_user_id,
      coalesce(current_user_email, 'Sistem / EBS Sync'),
      tg_op,
      tg_table_name,
      rec_id,
      old_val,
      new_val
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

-- Attach triggers to key tables
create or replace trigger trg_audit_ebs_checks
  after insert or update or delete on public.ebs_checks
  for each row execute function public.log_activity_changes();

create or replace trigger trg_audit_vehicles
  after insert or update or delete on public.vehicles
  for each row execute function public.log_activity_changes();

create or replace trigger trg_audit_tenders
  after insert or update or delete on public.tenders
  for each row execute function public.log_activity_changes();

create or replace trigger trg_audit_kesim_listesi
  after insert or update or delete on public.kesim_listesi
  for each row execute function public.log_activity_changes();

create or replace trigger trg_audit_real_estates
  after insert or update or delete on public.real_estates
  for each row execute function public.log_activity_changes();
