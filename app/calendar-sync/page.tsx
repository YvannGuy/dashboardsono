
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Layout from '../components/Layout';
import CalendarSync from '../components/CalendarSync';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Reservation {
  id: string;
  date_event: string;
  clients: {
    prenom: string;
    nom: string;
  };
  packs: {
    nom_pack: string;
  };
  [key: string]: any;
}

export default function CalendarSyncPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          clients (
            prenom,
            nom
          ),
          packs (
            nom_pack
          )
        `)
        .order('date_event', { ascending: true });

      if (error) {
        console.error('Erreur Supabase:', error);
        return;
      }

      setReservations(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Synchronisation calendrier</h1>
            <p className="text-gray-600">Synchronisez automatiquement vos réservations avec vos calendriers externes</p>
          </div>
        </div>

        <CalendarSync reservations={reservations} />
      </div>
    </Layout>
  );
}
