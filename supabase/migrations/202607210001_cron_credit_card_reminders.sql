begin;

-- Enable pg_cron and pg_net extensions for automated daily reminders
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule daily credit card reminder at 09:00 AM Europe/Istanbul (06:00 UTC)
select cron.schedule(
  'daily-credit-card-reminder',
  '0 6 * * *',
  $$
  select net.http_post(
    url:='https://zubhjybqzcpplultpsgt.supabase.co/functions/v1/credit-card-reminder',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb,
    timeout_milliseconds:='15000'
  );
  $$
);

commit;
