begin;

drop policy if exists "ebs_checks_all_staff" on public.ebs_checks;
create policy "ebs_checks_all_staff" on public.ebs_checks
  for all
  using (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']))
  with check (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']));

commit;
