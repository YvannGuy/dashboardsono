-- Script SQL pour créer les tables nécessaires dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telephone VARCHAR(20),
  adresse TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des packs
CREATE TABLE IF NOT EXISTS packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_pack VARCHAR(200) NOT NULL,
  description TEXT,
  prix_ht DECIMAL(10,2),
  prix_ttc DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  date_event DATE NOT NULL,
  prix_total_ttc DECIMAL(10,2) NOT NULL,
  acompte_du DECIMAL(10,2) DEFAULT 0,
  solde_du DECIMAL(10,2) DEFAULT 0,
  acompte_regle BOOLEAN DEFAULT FALSE,
  solde_regle BOOLEAN DEFAULT FALSE,
  statut VARCHAR(50) DEFAULT 'En attente',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'Acompte', 'Solde', 'Autre'
  montant_eur DECIMAL(10,2) NOT NULL,
  moyen VARCHAR(100) NOT NULL, -- 'Espèces', 'Virement', 'Chèque', etc.
  date_paiement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs d'emails (optionnel)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'confirmation', 'reminder', etc.
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reservations_client_id ON reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_pack_id ON reservations(pack_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date_event ON reservations(date_event);
CREATE INDEX IF NOT EXISTS idx_paiements_reservation_id ON paiements(reservation_id);

-- Fonction pour générer automatiquement les références de réservation
CREATE OR REPLACE FUNCTION generate_reservation_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    NEW.ref := 'RES-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('reservation_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Séquence pour les numéros de réservation
CREATE SEQUENCE IF NOT EXISTS reservation_seq START 1;

-- Trigger pour générer automatiquement les références
DROP TRIGGER IF EXISTS trigger_generate_reservation_ref ON reservations;
CREATE TRIGGER trigger_generate_reservation_ref
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION generate_reservation_ref();

-- RLS (Row Level Security) - Optionnel mais recommandé
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (ajustez selon vos besoins)
-- Pour permettre l'accès complet aux utilisateurs authentifiés
CREATE POLICY "Allow all for authenticated users" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON packs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON reservations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON paiements FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON email_logs FOR ALL TO authenticated USING (true);
