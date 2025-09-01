'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PaymentHistoryItem {
  id: string;
  payment_type: string;
  amount_cents: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
  reservations: {
    ref: string;
    clients: {
      prenom: string;
      nom: string;
    };
  };
}

export default function PaymentHistory() {
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stripe_payment_links')
        .select(`
          *,
          reservations (
            ref,
            clients (
              prenom,
              nom
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'completed') {
      return 'bg-green-100 text-green-800';
    } else if (status === 'expired' || (status === 'pending' && isExpired)) {
      return 'bg-red-100 text-red-800';
    } else if (status === 'pending') {
      return 'bg-orange-100 text-orange-800';
    } else if (status === 'cancelled') {
      return 'bg-gray-100 text-gray-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'completed') {
      return { icon: 'ri-check-line', text: 'Payé' };
    } else if (status === 'expired' || (status === 'pending' && isExpired)) {
      return { icon: 'ri-time-line', text: 'Expiré' };
    } else if (status === 'pending') {
      return { icon: 'ri-loader-4-line', text: 'En attente' };
    } else if (status === 'cancelled') {
      return { icon: 'ri-close-line', text: 'Annulé' };
    }
    return { icon: 'ri-question-line', text: 'Inconnu' };
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'pending') return item.status === 'pending' && new Date(item.expires_at) > new Date();
    if (filter === 'expired') return item.status === 'expired' || (item.status === 'pending' && new Date(item.expires_at) < new Date());
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Historique des liens Stripe</h2>
          <p className="text-gray-600">Suivi complet des liens de paiement générés</p>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
        >
          <option value="all">Tous les statuts</option>
          <option value="completed">Payés</option>
          <option value="pending">En attente</option>
          <option value="expired">Expirés</option>
        </select>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-check-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-green-600">Payés</p>
              <p className="text-lg font-bold text-green-800">
                {history.filter(h => h.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-loader-4-line text-orange-600"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-orange-600">En attente</p>
              <p className="text-lg font-bold text-orange-800">
                {history.filter(h => h.status === 'pending' && new Date(h.expires_at) > new Date()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-time-line text-red-600"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">Expirés</p>
              <p className="text-lg font-bold text-red-800">
                {history.filter(h => h.status === 'expired' || (h.status === 'pending' && new Date(h.expires_at) < new Date())).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-money-euro-circle-line text-blue-600"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">Total encaissé</p>
              <p className="text-lg font-bold text-blue-800">
                {history
                  .filter(h => h.status === 'completed')
                  .reduce((sum, h) => sum + h.amount_cents, 0) / 100
                } €
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des liens */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date création
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Réservation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expire le
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payé le
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item) => {
                const statusInfo = getStatusText(item.status, item.expires_at);
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.reservations?.ref}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.reservations?.clients?.prenom} {item.reservations?.clients?.nom}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.payment_type === 'Acompte' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.payment_type}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {(item.amount_cents / 100).toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status, item.expires_at)}`}>
                        <i className={`${statusInfo.icon} mr-1`}></i>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.expires_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(item.expires_at).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {item.completed_at ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(item.completed_at).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(item.completed_at).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-link text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">
              {history.length === 0 ? 'Aucun lien de paiement créé' : 'Aucun lien ne correspond aux filtres'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}