-- 1) ENUM pour classer les dépenses (gestion des types existants)
DO $$ BEGIN
    CREATE TYPE expense_simple_type AS ENUM (
      'marketing',
      'sub_rental',          -- sous-location de matériel
      'equipment_purchase',  -- achat matériel
      'vehicle_rental',      -- location camion
      'fuel',
      'software',
      'maintenance',
      'tax',
      'misc'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2) Table des dépenses
create table if not exists public.expenses_simple (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  occurred_at date not null default current_date,
  category    expense_simple_type not null,
  description text,
  amount_eur  numeric(12,2) not null check (amount_eur >= 0),
  created_at  timestamptz not null default now()
);

-- 3) Vue simple : dépenses par mois
create or replace view public.v_expenses_simple_monthly as
select
  date_trunc('month', occurred_at)::date as month,
  user_id,
  category,
  sum(amount_eur) as total_out_eur
from public.expenses_simple
group by 1,2,3
order by 1 desc, 3;

-- 4) RLS (sécurité par user)
alter table public.expenses_simple enable row level security;

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "expenses_simple per user" ON public.expenses_simple;

create policy "expenses_simple per user" on public.expenses_simple
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) Index utiles
create index if not exists idx_expenses_simple_user_date on public.expenses_simple(user_id, occurred_at desc);
create index if not exists idx_expenses_simple_category  on public.expenses_simple(category);
