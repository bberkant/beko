-- Create kesim_listesi table
create table if not exists public.kesim_listesi (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slaughter_date date not null default current_date,
  supplier text not null,
  ear_tag_no text,
  animal_type text not null,
  live_weight numeric(10,2),
  carcass_weight numeric(10,2) not null,
  yield_rate numeric(5,2),
  price_per_kg numeric(12,2) not null,
  total_amount numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to auto-calculate yield_rate and total_amount
create or replace function public.calculate_kesim_fields()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Randıman hesaplama (%)
  if new.live_weight is not null and new.live_weight > 0 then
    new.yield_rate := round(((new.carcass_weight / new.live_weight) * 100)::numeric, 2);
  else
    new.yield_rate := null;
  end if;

  -- Toplam Tutar hesaplama (Carkas Kilo * Kg Fiyatı)
  new.total_amount := round((new.carcass_weight * new.price_per_kg)::numeric, 2);

  return new;
end;
$$;

drop trigger if exists trg_calculate_kesim_fields on public.kesim_listesi;
create trigger trg_calculate_kesim_fields
before insert or update on public.kesim_listesi
for each row
execute function public.calculate_kesim_fields();

-- Enable Row Level Security (RLS)
alter table public.kesim_listesi enable row level security;

-- Add RLS policies for multi-tenant isolation
drop policy if exists "kesim_listesi_all_staff" on public.kesim_listesi;
create policy "kesim_listesi_all_staff" on public.kesim_listesi
  for all
  using (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']))
  with check (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']));
