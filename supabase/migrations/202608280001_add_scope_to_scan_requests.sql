begin;

alter table public.ekap_scan_requests 
  add column scope text not null default 'tender' 
  check (scope in ('tender', 'dogrudan_temin'));

commit;
