begin;

alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('admin','muhasebe','finans','goruntuleyici'));
alter table public.organization_invitations drop constraint if exists organization_invitations_role_check;
alter table public.organization_invitations add constraint organization_invitations_role_check
  check (role in ('admin','muhasebe','finans','goruntuleyici'));

drop policy if exists "cards_write_staff" on public.credit_cards;
drop policy if exists "cards_update_staff" on public.credit_cards;
drop policy if exists "statements_write_staff" on public.statements;
drop policy if exists "transactions_write_staff" on public.transactions;
drop policy if exists "payments_write_staff" on public.payments;
drop policy if exists "bank_accounts_write_staff" on public.bank_accounts;
drop policy if exists "bank_transactions_write_staff" on public.bank_transactions;

create policy "cards_write_staff" on public.credit_cards for insert to authenticated
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "cards_update_staff" on public.credit_cards for update to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "statements_write_staff" on public.statements for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "transactions_write_staff" on public.transactions for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "payments_write_staff" on public.payments for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "bank_accounts_write_staff" on public.bank_accounts for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "bank_transactions_write_staff" on public.bank_transactions for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

drop policy if exists "statement_files_insert_staff" on storage.objects;
drop policy if exists "statement_files_update_staff" on storage.objects;
drop policy if exists "statement_files_delete_staff" on storage.objects;
create policy "statement_files_insert_staff" on storage.objects for insert to authenticated
with check (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe','finans']));
create policy "statement_files_update_staff" on storage.objects for update to authenticated
using (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe','finans']))
with check (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe','finans']));
create policy "statement_files_delete_staff" on storage.objects for delete to authenticated
using (bucket_id = 'credit-card-statements' and public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe','finans']));

drop policy if exists "operations_documents_insert" on storage.objects;
drop policy if exists "operations_documents_update" on storage.objects;
drop policy if exists "operations_documents_delete" on storage.objects;
create policy "operations_documents_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'operations-documents' and (
    public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe'])
    or ((storage.foldername(name))[2] = 'modules' and (storage.foldername(name))[3] = 'bank_accounts'
      and public.has_org_role((storage.foldername(name))[1]::uuid, array['finans']))
  )
);
create policy "operations_documents_update" on storage.objects for update to authenticated
using (bucket_id = 'operations-documents' and (
  public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe'])
  or ((storage.foldername(name))[2] = 'modules' and (storage.foldername(name))[3] = 'bank_accounts' and public.has_org_role((storage.foldername(name))[1]::uuid, array['finans']))
))
with check (bucket_id = 'operations-documents' and (
  public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe'])
  or ((storage.foldername(name))[2] = 'modules' and (storage.foldername(name))[3] = 'bank_accounts' and public.has_org_role((storage.foldername(name))[1]::uuid, array['finans']))
));
create policy "operations_documents_delete" on storage.objects for delete to authenticated
using (bucket_id = 'operations-documents' and (
  public.has_org_role((storage.foldername(name))[1]::uuid, array['admin','muhasebe'])
  or ((storage.foldername(name))[2] = 'modules' and (storage.foldername(name))[3] = 'bank_accounts' and public.has_org_role((storage.foldername(name))[1]::uuid, array['finans']))
));

create or replace function public.create_organization_invitation(invite_email text, invite_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare current_org uuid; new_token uuid;
begin
  select organization_id into current_org from public.organization_members
  where user_id = auth.uid() and active and role = 'admin' limit 1;
  if current_org is null then raise exception 'Yalnızca yöneticiler kullanıcı davet edebilir'; end if;
  if invite_role not in ('admin','muhasebe','finans','goruntuleyici') then raise exception 'Geçersiz rol'; end if;
  if trim(invite_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Geçerli e-posta adresi gerekli'; end if;
  if exists (select 1 from public.organization_members m join public.profiles p on p.id=m.user_id
    where m.organization_id=current_org and lower(p.email)=lower(trim(invite_email))) then raise exception 'Bu kullanıcı zaten şirkete bağlı'; end if;
  delete from public.organization_invitations where organization_id=current_org and lower(email)=lower(trim(invite_email)) and accepted_at is null;
  insert into public.organization_invitations (organization_id,email,role)
  values (current_org,lower(trim(invite_email)),invite_role) returning token into new_token;
  return new_token;
end; $$;

create or replace function public.manage_organization_user(target_user uuid, new_role text, new_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare current_org uuid; old_role text; old_active boolean; admin_count integer;
begin
  select organization_id into current_org from public.organization_members where user_id=auth.uid() and active and role='admin' limit 1;
  if current_org is null then raise exception 'Yalnızca yöneticiler kullanıcıları yönetebilir'; end if;
  if new_role not in ('admin','muhasebe','finans','goruntuleyici') then raise exception 'Geçersiz rol'; end if;
  select role,active into old_role,old_active from public.organization_members where organization_id=current_org and user_id=target_user for update;
  if old_role is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if old_role='admin' and old_active and (new_role<>'admin' or not new_active) then
    select count(*) into admin_count from public.organization_members where organization_id=current_org and role='admin' and active;
    if admin_count<=1 then raise exception 'Son aktif yönetici pasifleştirilemez'; end if;
  end if;
  update public.organization_members set role=new_role,active=new_active where organization_id=current_org and user_id=target_user;
end; $$;

revoke all on function public.create_organization_invitation(text,text) from public,anon;
revoke all on function public.manage_organization_user(uuid,text,boolean) from public,anon;
grant execute on function public.create_organization_invitation(text,text) to authenticated;
grant execute on function public.manage_organization_user(uuid,text,boolean) to authenticated;

commit;
