begin;

-- SECURITY DEFINER helpers must never be callable by anonymous/public roles.
revoke all on function public.bootstrap_organization(text) from public, anon;
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, text[]) from public, anon;
grant execute on function public.bootstrap_organization(text) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

-- Keep document buckets private even if their dashboard settings were changed.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf']
where id in ('credit-card-statements', 'operations-documents');

-- Enforce that every child row references a parent from the same organization.
create unique index if not exists credit_cards_org_id_uidx on public.credit_cards (organization_id, id);
create unique index if not exists statements_org_id_uidx on public.statements (organization_id, id);
create unique index if not exists bank_accounts_org_id_uidx on public.bank_accounts (organization_id, id);
create unique index if not exists vehicles_org_id_uidx on public.vehicles (organization_id, id);
create unique index if not exists drivers_org_id_uidx on public.drivers (organization_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'statements_card_same_org_fk') then
    alter table public.statements add constraint statements_card_same_org_fk
      foreign key (organization_id, card_id) references public.credit_cards (organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_card_same_org_fk') then
    alter table public.transactions add constraint transactions_card_same_org_fk
      foreign key (organization_id, card_id) references public.credit_cards (organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_statement_same_org_fk') then
    alter table public.transactions add constraint transactions_statement_same_org_fk
      foreign key (organization_id, statement_id) references public.statements (organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_card_same_org_fk') then
    alter table public.payments add constraint payments_card_same_org_fk
      foreign key (organization_id, card_id) references public.credit_cards (organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_statement_same_org_fk') then
    alter table public.payments add constraint payments_statement_same_org_fk
      foreign key (organization_id, statement_id) references public.statements (organization_id, id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bank_transactions_account_same_org_fk') then
    alter table public.bank_transactions add constraint bank_transactions_account_same_org_fk
      foreign key (organization_id, account_id) references public.bank_accounts (organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vehicle_expenses_vehicle_same_org_fk') then
    alter table public.vehicle_expenses add constraint vehicle_expenses_vehicle_same_org_fk
      foreign key (organization_id, vehicle_id) references public.vehicles (organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'drivers_vehicle_same_org_fk') then
    alter table public.drivers add constraint drivers_vehicle_same_org_fk
      foreign key (organization_id, assigned_vehicle_id) references public.vehicles (organization_id, id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'traffic_fines_vehicle_same_org_fk') then
    alter table public.traffic_fines add constraint traffic_fines_vehicle_same_org_fk
      foreign key (organization_id, vehicle_id) references public.vehicles (organization_id, id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'traffic_fines_driver_same_org_fk') then
    alter table public.traffic_fines add constraint traffic_fines_driver_same_org_fk
      foreign key (organization_id, driver_id) references public.drivers (organization_id, id) on delete set null;
  end if;
end $$;

-- Metadata must point only to the caller organization's expected private path.
alter table public.module_documents drop constraint if exists module_documents_secure_path;
alter table public.module_documents add constraint module_documents_secure_path check (
  file_path like organization_id::text || '/modules/' || module || '/%'
);
alter table public.statements drop constraint if exists statements_secure_file_path;
alter table public.statements add constraint statements_secure_file_path check (
  file_path is null or file_path like organization_id::text || '/' || card_id::text || '/%'
);

-- Recreate storage policies with explicit UUID/path checks and UPDATE checks.
drop policy if exists "statement_files_read_members" on storage.objects;
drop policy if exists "statement_files_insert_staff" on storage.objects;
drop policy if exists "statement_files_update_staff" on storage.objects;
drop policy if exists "statement_files_delete_staff" on storage.objects;

create policy "statement_files_read_members" on storage.objects for select to authenticated
using (
  bucket_id = 'credit-card-statements'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy "statement_files_insert_staff" on storage.objects for insert to authenticated
with check (
  bucket_id = 'credit-card-statements'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe'])
);
create policy "statement_files_update_staff" on storage.objects for update to authenticated
using (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']))
with check (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));
create policy "statement_files_delete_staff" on storage.objects for delete to authenticated
using (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));

drop policy if exists "operations_documents_read" on storage.objects;
drop policy if exists "operations_documents_insert" on storage.objects;
drop policy if exists "operations_documents_update" on storage.objects;
drop policy if exists "operations_documents_delete" on storage.objects;

create policy "operations_documents_read" on storage.objects for select to authenticated
using (
  bucket_id = 'operations-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy "operations_documents_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'operations-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe'])
);
create policy "operations_documents_update" on storage.objects for update to authenticated
using (bucket_id = 'operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']))
with check (bucket_id = 'operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));
create policy "operations_documents_delete" on storage.objects for delete to authenticated
using (bucket_id = 'operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe']));

commit;
