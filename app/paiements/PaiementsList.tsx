
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Paiement {
  id: string;
  type: string;
  montant_eur: number;
  moyen: string;
  date_paiement: string;
  notes?: string;
  reservations: {
    ref: string;
    date_event: string;
    fullName?: string;
    clients?: {
      prenom: string;
      nom: string;
    };
  };
}

export default function PaiementsList() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    moyen: '',
    periode: '',
    montant_min: '',
    montant_max: ''
  });

  useEffect(() => {
    fetchPaiements();
    
    // Écouter les événements de mise à jour des réservations
    const handleReservationUpdate = () => {
      console.log('🔄 Actualisation des paiements suite à une mise à jour de réservation');
      fetchPaiements();
    };
    
    window.addEventListener('reservation-payment-updated', handleReservationUpdate);
    window.addEventListener('reservation-updated', handleReservationUpdate);
    
    // Actualisation automatique toutes les 30 secondes
    const interval = setInterval(fetchPaiements, 30000);
    
    return () => {
      window.removeEventListener('reservation-payment-updated', handleReservationUpdate);
      window.removeEventListener('reservation-updated', handleReservationUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchPaiements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('paiements')
        .select(`
          *,
          reservations (
            ref,
            date_event,
            fullName,
            clients (
              prenom,
              nom
            )
          )
        `)
        .order('date_paiement', { ascending: false });

      if (error) {
        console.error('Erreur Supabase paiements:', error);
        throw error;
      }
      
      console.log(`📊 ${data?.length || 0} paiements chargés`);
      setPaiements(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: { [key: string]: string } = {
      'Acompte': 'bg-orange-100 text-orange-800',
      'Solde': 'bg-green-100 text-green-800',
      'Autre': 'bg-blue-100 text-blue-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  const getMoyenIcon = (moyen: string) => {
    const icons: { [key: string]: string } = {
      'CB': 'ri-bank-card-line',
      'Virement': 'ri-exchange-line',
      'Espèces': 'ri-money-euro-circle-line',
      'Lien Stripe': 'ri-secure-payment-line'
    };
    return icons[moyen] || 'ri-money-euro-circle-line';
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };

  const filteredPaiements = paiements.filter(paiement => {
    if (filters.type && paiement.type !== filters.type) return false;
    if (filters.moyen && paiement.moyen !== filters.moyen) return false;
    if (filters.periode && !paiement.date_paiement.includes(filters.periode)) return false;
    if (filters.montant_min && paiement.montant_eur < parseFloat(filters.montant_min)) return false;
    if (filters.montant_max && paiement.montant_eur > parseFloat(filters.montant_max)) return false;
    return true;
  });

  const totalPaiements = filteredPaiements.reduce((sum, p) => sum + (p.montant_eur || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-600">Suivi de tous les encaissements</p>
        </div>
        <div className="flex space-x-2">
          <Link
            href="/paiements/history"
            className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
          >
            <i className="ri-history-line mr-2"></i>
            Historique
          </Link>
          <Link
            href="/paiements/new"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nouveau paiement
          </Link>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total affiché</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(totalPaiements)} €</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="ri-money-euro-circle-line text-green-600 text-xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Acomptes</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatNumber(filteredPaiements.filter(p => p.type === 'Acompte').reduce((sum, p) => sum + p.montant_eur, 0))} €
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <i className="ri-wallet-line text-orange-600 text-xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Soldes</p>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(filteredPaiements.filter(p => p.type === 'Solde').reduce((sum, p) => sum + p.montant_eur, 0))} €
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <i className="ri-bank-line text-green-600 text-xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{filteredPaiements.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <i className="ri-file-list-line text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <select 
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          >
            <option value="">Tous les types</option>
            <option value="Acompte">Acompte</option>
            <option value="Solde">Solde</option>
            <option value="Autre">Autre</option>
          </select>

          <select 
            value={filters.moyen}
            onChange={(e) => setFilters({...filters, moyen: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          >
            <option value="">Tous les moyens</option>
            <option value="CB">Carte bancaire</option>
            <option value="Virement">Virement</option>
            <option value="Espèces">Espèces</option>
            <option value="Lien Stripe">Lien Stripe</option>
          </select>

          <input
            type="date"
            value={filters.periode}
            onChange={(e) => setFilters({...filters, periode: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />

          <input
            type="number"
            placeholder="Montant min..."
            value={filters.montant_min}
            onChange={(e) => setFilters({...filters, montant_min: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />

          <input
            type="number"
            placeholder="Montant max..."
            value={filters.montant_max}
            onChange={(e) => setFilters({...filters, montant_max: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Liste des paiements */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Réservation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Moyen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPaiements.map((paiement) => {
                const clientName = paiement.reservations?.fullName || 
                  (paiement.reservations?.clients ? 
                    `${paiement.reservations.clients.prenom} ${paiement.reservations.clients.nom}` : 
                    'Client inconnu');

                return (
                  <tr key={paiement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link 
                        href={`/paiements/${paiement.id}`}
                        className="text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                      >
                        {paiement.reservations?.ref || 'N/A'}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {paiement.reservations?.date_event ? 
                          new Date(paiement.reservations.date_event).toLocaleDateString('fr-FR') : 
                          'Date inconnue'
                        }
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {clientName}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(paiement.type)}`}>
                        {paiement.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatNumber(paiement.montant_eur)} €
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <i className={`${getMoyenIcon(paiement.moyen)} text-gray-400 mr-2`}></i>
                        <span className="text-sm text-gray-900">{paiement.moyen}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        <Link
                          href={`/paiements/${paiement.id}`}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          title="Voir détails"
                        >
                          <i className="ri-eye-line text-sm"></i>
                        </Link>
                        <button
                          className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                          title="Générer reçu"
                        >
                          <i className="ri-file-pdf-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPaiements.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-money-euro-circle-line text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">
              {paiements.length === 0 ? 'Aucun paiement trouvé' : 'Aucun paiement ne correspond aux filtres'}
            </p>
          </div>
        )}
      </div>

      {/* Indicateur de synchronisation */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-medium text-gray-900">Synchronisation automatique activée</p>
              <p className="text-sm text-gray-600">Les paiements se mettent à jour automatiquement quand vous modifiez les réservations</p>
            </div>
          </div>
          <button
            onClick={fetchPaiements}
            className="text-green-600 hover:text-green-700 cursor-pointer p-1"
            title="Actualiser maintenant"
          >
            <i className="ri-refresh-line text-lg"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
