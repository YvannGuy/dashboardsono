-- Script de diagnostic et création de la table expenses_simple

-- 1. Vérifier si le type existe
SELECT typname FROM pg_type WHERE typname = 'expense_simple_type';

-- 2. Vérifier si la table existe
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'expenses_simple';

-- 3. Créer le type s'il n'existe pas
DO $$ BEGIN
    CREATE TYPE expense_simple_type AS ENUM (
      'marketing',
      'sub_rental',
      'equipment_purchase',
      'vehicle_rental',
      'fuel',
      'software',
      'maintenance',
      'tax',
      'misc'
    );
    RAISE NOTICE 'Type expense_simple_type créé avec succès';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Type expense_simple_type existe déjà';
END $$;

-- 4. Créer la table
CREATE TABLE IF NOT EXISTS public.expenses_simple (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid(),
  occurred_at date NOT NULL DEFAULT current_date,
  category    expense_simple_type NOT NULL,
  description text,
  amount_eur  numeric(12,2) NOT NULL CHECK (amount_eur >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 5. Vérifier que la table a été créée
SELECT 'Table expenses_simple créée avec succès' as status;

-- 6. Activer RLS
ALTER TABLE public.expenses_simple ENABLE ROW LEVEL SECURITY;

-- 7. Créer la politique
DROP POLICY IF EXISTS "expenses_simple per user" ON public.expenses_simple;
CREATE POLICY "expenses_simple per user" ON public.expenses_simple
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Créer les index
CREATE INDEX IF NOT EXISTS idx_expenses_simple_user_date ON public.expenses_simple(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_simple_category ON public.expenses_simple(category);

-- 9. Vérification finale
SELECT 'Configuration terminée avec succès' as final_status;
