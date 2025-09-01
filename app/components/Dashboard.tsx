
'use client';

import { useState, useEffect } from 'react';
import KPICard from './KPICard';
import CalendarView from './CalendarView';
import AlertCard from './AlertCard';
import { supabaseClient } from '../../lib/supabase';

interface DashboardStats {
  reservationsMois: number;
  caPayeMois: number;
  acomptesAttente: number;
  soldesTotaux: number;
  clientsActifs: number;
  reservationsProchaines: number;
  depensesMois: number;
}

interface Alert {
  type: 'acompte' | 'solde' | 'caution';
  count: number;
  items: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    reservationsMois: 0,
    caPayeMois: 0,
    acomptesAttente: 0,
    soldesTotaux: 0,
    clientsActifs: 0,
    reservationsProchaines: 0,
    depensesMois: 0
  });

  const [alerts, setAlerts] = useState<Alert[]>([
    { type: 'acompte', count: 0, items: [] },
    { type: 'solde', count: 0, items: [] },
    { type: 'caution', count: 0, items: [] }
  ]);

  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Synchronisation automatique toutes les 30 secondes
    const interval = setInterval(fetchDashboardData, 30000);
    
    // Écouter les changements en temps réel
    const subscription = supabaseClient
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paiements' }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses_simple' }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const handleRealtimeUpdate = (payload: any) => {
    console.log('Changement détecté dans la base de données:', payload);
    // Actualiser les données immédiatement
    fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchAlerts()
      ]);
      setLastUpdate(new Date().toISOString());
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const in90Days = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    // Réservations du mois avec gestion d'erreur
    const { data: reservations, error: resError } = await supabaseClient
      .from('reservations')
      .select('*')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (resError) console.error('Erreur réservations:', resError);

    // CA payé ce mois avec gestion d'erreur
    const { data: paiements, error: paiError } = await supabaseClient
      .from('paiements')
      .select('montant_eur')
      .gte('date_paiement', startOfMonth.toISOString())
      .lte('date_paiement', endOfMonth.toISOString());

    if (paiError) console.error('Erreur paiements:', paiError);

    // Acomptes en attente
    const { data: acomptes, error: acompteError } = await supabaseClient
      .from('reservations')
      .select('*')
      .eq('statut', 'Confirmée');

    if (acompteError) console.error('Erreur acomptes:', acompteError);

    // Soldes à encaisser
    const { data: soldes, error: soldeError } = await supabaseClient
      .from('reservations')
      .select('solde_du')
      .eq('statut', 'Acompte payé');

    if (soldeError) console.error('Erreur soldes:', soldeError);

    // Nombre total de clients avec requête plus fiable
    const { data: clients, error: clientError } = await supabaseClient
      .from('clients')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (clientError) console.error('Erreur clients:', clientError);

    // Réservations dans les 90 prochains jours
    const { data: reservationsProchaines, error: prochainesError } = await supabaseClient
      .from('reservations')
      .select('*')
      .gte('date_event', now.toISOString().split('T')[0])
      .lte('date_event', in90Days.toISOString().split('T')[0])
      .in('statut', ['Confirmée', 'Acompte payé', 'Soldée']);

    if (prochainesError) console.error('Erreur réservations prochaines:', prochainesError);

    // Dépenses du mois
    const { data: depenses, error: depensesError } = await supabaseClient
      .from('expenses_simple')
      .select('amount_eur')
      .gte('occurred_at', startOfMonth.toISOString().split('T')[0])
      .lte('occurred_at', endOfMonth.toISOString().split('T')[0]);

    if (depensesError) console.error('Erreur dépenses:', depensesError);

    const caPayeMois = paiements?.reduce((sum: number, p: any) => sum + (p.montant_eur || 0), 0) || 0;
    const soldesTotaux = soldes?.reduce((sum: number, s: any) => sum + (s.solde_du || 0), 0) || 0;
    const depensesMois = depenses?.reduce((sum: number, d: any) => sum + (d.amount_eur || 0), 0) || 0;

    const newStats = {
      reservationsMois: reservations?.length || 0,
      caPayeMois,
      acomptesAttente: acomptes?.length || 0,
      soldesTotaux,
      clientsActifs: clients?.length || 0,
      reservationsProchaines: reservationsProchaines?.length || 0,
      depensesMois
    };

    console.log('Nouvelles statistiques:', newStats);
    setStats(newStats);
  };

  const fetchAlerts = async () => {
    const now = new Date();
    const in72Hours = new Date(now.getTime() + (72 * 60 * 60 * 1000));

        // Acomptes non payés avec échéance < 72h
    const { data: acomptesUrgents, error: acompteUrgentError } = await supabaseClient
      .from('reservations')
      .select('*, clients(*)')
      .eq('statut', 'Confirmée')
      .lte('date_event', in72Hours.toISOString().split('T')[0]);

    if (acompteUrgentError) console.error('Erreur acomptes urgents:', acompteUrgentError);

    // Soldes non payés avec échéance < 72h
    const { data: soldesUrgents, error: soldeUrgentError } = await supabaseClient  
      .from('reservations')  
      .select('*, clients(*)')
      .eq('statut', 'Acompte payé')
      .lte('date_event', in72Hours.toISOString().split('T')[0]);

    if (soldeUrgentError) console.error('Erreur soldes urgents:', soldeUrgentError);

    const newAlerts = [
      { type: 'acompte' as const, count: acomptesUrgents?.length || 0, items: acomptesUrgents || [] },
      { type: 'solde' as const, count: soldesUrgents?.length || 0, items: soldesUrgents || [] },
      { type: 'caution' as const, count: 0, items: [] }
    ];

    console.log('Nouvelles alertes:', newAlerts);
    setAlerts(newAlerts);
  };

  const forceRefresh = () => {
    console.log('Actualisation forcée du tableau de bord...');
    fetchDashboardData();
  };

  if (loading && !lastUpdate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto space-y-6 lg:space-y-8">
        {/* Header responsive avec indicateur de synchronisation */}
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">Tableau de Bord</h1>
              <p className="text-base lg:text-lg text-gray-600">Bienvenue sur votre espace de gestion SoundRent</p>
            </div>
            <button
              onClick={forceRefresh}
              disabled={loading}
              className={`bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap flex items-center ${loading ? 'animate-pulse' : ''}`}
            >
              <i className={`ri-refresh-line mr-2 ${loading ? 'animate-spin' : ''}`}></i>
              {loading ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center mt-4 space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-4 h-4 flex items-center justify-center mr-2">
                <i className="ri-calendar-line"></i>
              </div>
              <span suppressHydrationWarning={true}>{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 flex items-center justify-center mr-2">
                <i className="ri-time-line"></i>
              </div>
              <span suppressHydrationWarning={true}>{new Date().toLocaleTimeString('fr-FR')}</span>
            </div>
            {lastUpdate && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-xs">
                  Synchronisé à {new Date(lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* KPIs responsive avec animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 mb-8 lg:mb-12">
          <KPICard
            title="Réservations du mois"
            value={stats.reservationsMois}
            icon="ri-calendar-check-line"
            color="gray"
            trend="+12%"
          />
          <KPICard
            title="CA payé ce mois"
            value={`${stats.caPayeMois.toLocaleString()} €`}
            icon="ri-money-euro-circle-line"
            color="gray"
            trend="+8%"
          />
          <KPICard
            title="Dépenses du mois"
            value={`${stats.depensesMois.toLocaleString()} €`}
            icon="ri-money-dollar-circle-line"
            color="red"
            trend="-5%"
          />
          <KPICard
            title="Acomptes en attente"
            value={stats.acomptesAttente}
            icon="ri-time-line"
            color="gray"
            trend="-3%"
          />
          <KPICard
            title="Soldes à encaisser"
            value={`${stats.soldesTotaux.toLocaleString()} €`}
            icon="ri-bank-card-line"
            color="gray"
            trend="+15%"
          />
        </div>

        {/* Section principale responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Calendrier responsive - ordre mobile d'abord */}
          <div className="lg:col-span-2 order-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden h-full">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-calendar-2-line text-sm text-blue-600"></i>
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Planning</h2>
                      <p className="text-sm text-gray-500 mt-1">Gérez vos réservations</p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    <span>Temps réel</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                <CalendarView key={lastUpdate} />
              </div>
            </div>
          </div>

          {/* Alertes responsive */}
          <div className="lg:col-span-1 order-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-alert-line text-sm text-red-600"></i>
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Alertes</h2>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${alerts.some(a => a.count > 0) ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 space-y-4">
                <AlertCard
                  title="Acomptes urgents"
                  count={alerts[0].count}
                  items={alerts[0].items}
                  type="acompte_urgent"
                />
                <AlertCard
                  title="Soldes urgents"
                  count={alerts[1].count}
                  items={alerts[1].items}
                  type="solde_urgent"
                />
                <AlertCard
                  title="Cautions à traiter"
                  count={alerts[2].count}
                  items={alerts[2].items}
                  type="caution"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques rapides responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Événements à venir</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.reservationsProchaines}</p>
                <p className="text-xs text-gray-400 mt-1">90 prochains jours</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="ri-calendar-event-line text-lg text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Clients actifs</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.clientsActifs}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="ri-team-line text-lg text-purple-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Taux de conversion</p>
                <p className="text-xl sm:text-2xl font-semibold text-gray-900">73%</p>
                <p className="text-xs text-gray-400 mt-1">Devis → Réservations</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="ri-line-chart-line text-lg text-indigo-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Indicateur de synchronisation automatique */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-gray-900">Synchronisation automatique activée</p>
                <p className="text-sm text-gray-600">Les données se mettent à jour automatiquement toutes les 30 secondes</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {lastUpdate && `Dernière maj: ${new Date(lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}