begin;

drop policy if exists "vehicles_write_staff" on public.vehicles;
drop policy if exists "vehicle_expenses_write_staff" on public.vehicle_expenses;
drop policy if exists "drivers_write_staff" on public.drivers;
drop policy if exists "traffic_fines_write_staff" on public.traffic_fines;
drop policy if exists "module_documents_write_staff" on public.module_documents;

create policy "vehicles_write_staff" on public.vehicles for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "vehicle_expenses_write_staff" on public.vehicle_expenses for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "drivers_write_staff" on public.drivers for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "traffic_fines_write_staff" on public.traffic_fines for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "module_documents_write_staff" on public.module_documents for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

drop policy if exists "operations_documents_insert" on storage.objects;
drop policy if exists "operations_documents_update" on storage.objects;
drop policy if exists "operations_documents_delete" on storage.objects;
create policy "operations_documents_insert" on storage.objects for insert to authenticated
with check (bucket_id='operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']));
create policy "operations_documents_update" on storage.objects for update to authenticated
using (bucket_id='operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']))
with check (bucket_id='operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']));
create policy "operations_documents_delete" on storage.objects for delete to authenticated
using (bucket_id='operations-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']));

create or replace function public.list_organization_users()
returns table (user_id uuid, full_name text, email text, role text, active boolean, joined_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare current_org uuid;
begin
  select organization_id into current_org from public.organization_members
  where organization_members.user_id=auth.uid() and organization_members.active and organization_members.role='admin' limit 1;
  if current_org is null then raise exception 'Yalnızca yöneticiler kullanıcıları görüntüleyebilir'; end if;
  return query select m.user_id,coalesce(p.full_name,''),p.email,m.role,m.active,m.created_at
  from public.organization_members m join public.profiles p on p.id=m.user_id
  where m.organization_id=current_org order by m.active desc,p.full_name,p.email;
end; $$;
revoke all on function public.list_organization_users() from public,anon;
grant execute on function public.list_organization_users() to authenticated;

commit;
