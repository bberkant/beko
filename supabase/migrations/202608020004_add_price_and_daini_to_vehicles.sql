alter table public.vehicles 
  add column if not exists daini_murtehin text,
  add column if not exists purchase_price bigint default 0,
  add column if not exists current_price bigint default 0;
