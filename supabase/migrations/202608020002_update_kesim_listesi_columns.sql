-- Alter public.kesim_listesi table to match the real Excel schema
alter table public.kesim_listesi
  add column if not exists head_count integer not null default 1,
  add column if not exists pesinat numeric(14,2) not null default 0,
  add column if not exists kalan_tutar numeric(14,2) not null default 0,
  add column if not exists payment_date text;

-- Update trigger function to calculate yield_rate, total_amount AND kalan_tutar
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

  -- Toplam Tutar hesaplama (Karkas Kilo * Kg Fiyatı)
  new.total_amount := round((new.carcass_weight * new.price_per_kg)::numeric, 2);

  -- Kalan Tutar hesaplama (Toplam Tutar - Peşinat)
  new.kalan_tutar := round((new.total_amount - new.pesinat)::numeric, 2);

  return new;
end;
$$;
