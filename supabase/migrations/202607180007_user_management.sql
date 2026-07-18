begin;

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','muhasebe','goruntuleyici')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null default auth.uid() references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists organization_invitations_org_idx
  on public.organization_invitations (organization_id, created_at desc);
alter table public.organization_invitations enable row level security;

drop policy if exists "invitations_admin_read" on public.organization_invitations;
drop policy if exists "invitations_admin_delete" on public.organization_invitations;
create policy "invitations_admin_read" on public.organization_invitations for select to authenticated
  using (public.has_org_role(organization_id, array['admin']));
create policy "invitations_admin_delete" on public.organization_invitations for delete to authenticated
  using (public.has_org_role(organization_id, array['admin']));

create or replace function public.list_organization_users()
returns table (
  user_id uuid, full_name text, email text, role text, active boolean, joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare current_org uuid;
begin
  select organization_id into current_org
  from public.organization_members
  where organization_members.user_id = auth.uid() and organization_members.active
  limit 1;
  if current_org is null then raise exception 'Şirket üyeliği bulunamadı'; end if;

  return query
  select m.user_id, coalesce(p.full_name, ''), p.email, m.role, m.active, m.created_at
  from public.organization_members m
  join public.profiles p on p.id = m.user_id
  where m.organization_id = current_org
  order by m.active desc, p.full_name, p.email;
end;
$$;

create or replace function public.create_organization_invitation(invite_email text, invite_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare current_org uuid; new_token uuid;
begin
  select organization_id into current_org
  from public.organization_members
  where user_id = auth.uid() and active and role = 'admin'
  limit 1;
  if current_org is null then raise exception 'Yalnızca yöneticiler kullanıcı davet edebilir'; end if;
  if invite_role not in ('admin','muhasebe','goruntuleyici') then raise exception 'Geçersiz rol'; end if;
  if trim(invite_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Geçerli e-posta adresi gerekli'; end if;
  if exists (
    select 1 from public.organization_members m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = current_org and lower(p.email) = lower(trim(invite_email))
  ) then raise exception 'Bu kullanıcı zaten şirkete bağlı'; end if;

  delete from public.organization_invitations
  where organization_id = current_org and lower(email) = lower(trim(invite_email)) and accepted_at is null;
  insert into public.organization_invitations (organization_id, email, role)
  values (current_org, lower(trim(invite_email)), invite_role)
  returning token into new_token;
  return new_token;
end;
$$;

create or replace function public.accept_organization_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare invitation public.organization_invitations%rowtype; account_email text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select email into account_email from auth.users where id = auth.uid();
  select * into invitation from public.organization_invitations
  where token = invitation_token and accepted_at is null and expires_at > now()
  for update;
  if invitation.id is null then raise exception 'Davet geçersiz veya süresi dolmuş'; end if;
  if lower(coalesce(account_email, '')) <> lower(invitation.email) then
    raise exception 'Bu davet başka bir e-posta adresine ait';
  end if;
  if exists (select 1 from public.organization_members where user_id = auth.uid() and active) then
    raise exception 'Kullanıcı zaten bir şirkete bağlı';
  end if;

  insert into public.organization_members (organization_id, user_id, role, active)
  values (invitation.organization_id, auth.uid(), invitation.role, true)
  on conflict (organization_id, user_id) do update set role = excluded.role, active = true;
  update public.organization_invitations set accepted_at = now() where id = invitation.id;
  return invitation.organization_id;
end;
$$;

create or replace function public.manage_organization_user(target_user uuid, new_role text, new_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare current_org uuid; old_role text; old_active boolean; admin_count integer;
begin
  select organization_id into current_org from public.organization_members
  where user_id = auth.uid() and active and role = 'admin' limit 1;
  if current_org is null then raise exception 'Yalnızca yöneticiler kullanıcıları yönetebilir'; end if;
  if new_role not in ('admin','muhasebe','goruntuleyici') then raise exception 'Geçersiz rol'; end if;
  select role, active into old_role, old_active from public.organization_members
  where organization_id = current_org and user_id = target_user for update;
  if old_role is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if old_role = 'admin' and old_active and (new_role <> 'admin' or not new_active) then
    select count(*) into admin_count from public.organization_members
    where organization_id = current_org and role = 'admin' and active;
    if admin_count <= 1 then raise exception 'Son aktif yönetici pasifleştirilemez'; end if;
  end if;
  update public.organization_members set role = new_role, active = new_active
  where organization_id = current_org and user_id = target_user;
end;
$$;

revoke all on function public.list_organization_users() from public, anon;
revoke all on function public.create_organization_invitation(text, text) from public, anon;
revoke all on function public.accept_organization_invitation(uuid) from public, anon;
revoke all on function public.manage_organization_user(uuid, text, boolean) from public, anon;
grant execute on function public.list_organization_users() to authenticated;
grant execute on function public.create_organization_invitation(text, text) to authenticated;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;
grant execute on function public.manage_organization_user(uuid, text, boolean) to authenticated;

commit;
