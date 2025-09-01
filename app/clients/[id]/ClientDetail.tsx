
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  type_client: string;
  notes?: string;
  date_creation: string;
}

interface Reservation {
  id: string;
  reference: string;
  date_event: string;
  lieu: string;
  statut: string;
  prix_total_ttc: number;
  acompte_recu?: number;
  solde_recu?: number;
}

interface ClientDetailProps {
  clientId: string;
}

export default function ClientDetail({ clientId }: ClientDetailProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    type_client: 'Particulier',
    notes: ''
  });

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les données du client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('Erreur client:', clientError);
        return;
      }

      setClient(clientData);
      setFormData({
        nom: clientData.nom,
        prenom: clientData.prenom,
        email: clientData.email,
        telephone: clientData.telephone,
        type_client: clientData.type_client,
        notes: clientData.notes || ''
      });

      // Récupérer les réservations du client
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('client_id', clientId)
        .order('date_event', { ascending: false });

      if (reservationsError) {
        console.error('Erreur réservations:', reservationsError);
      } else {
        setReservations(reservationsData || []);
      }

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          nom: formData.nom.trim(),
          prenom: formData.prenom.trim(),
          email: formData.email.trim().toLowerCase(),
          telephone: formData.telephone.trim(),
          type_client: formData.type_client,
          notes: formData.notes.trim() || null
        })
        .eq('id', clientId);

      if (error) throw error;

      // Recharger les données
      await fetchClientData();
      setShowEditForm(false);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour du client');
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles: { [key: string]: string } = {
      'Confirmé': 'bg-green-100 text-green-800',
      'En attente': 'bg-orange-100 text-orange-800',
      'Annulé': 'bg-red-100 text-red-800',
      'Terminé': 'bg-blue-100 text-blue-800'
    };
    return styles[statut] || 'bg-gray-100 text-gray-800';
  };

  const calculateStats = () => {
    const totalReservations = reservations.length;
    const totalDepense = reservations.reduce((sum, res) => sum + (res.prix_total_ttc || 0), 0);
    const totalAcomptes = reservations.reduce((sum, res) => sum + (res.acompte_recu || 0), 0);
    const totalSoldes = reservations.reduce((sum, res) => sum + (res.solde_recu || 0), 0);
    const moyenneReservation = totalReservations > 0 ? totalDepense / totalReservations : 0;

    return {
      totalReservations,
      totalDepense,
      totalAcomptes,
      totalSoldes,
      moyenneReservation
    };
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <i className="ri-user-line text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">Client non trouvé</p>
            <Link
              href="/clients"
              className="text-orange-600 hover:text-orange-700 mt-4 inline-block"
            >
              Retour à la liste des clients
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = calculateStats();

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/clients"
              className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <i className="ri-arrow-left-line text-xl text-gray-600"></i>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client.prenom} {client.nom}
              </h1>
              <p className="text-gray-600">Détails du client</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-edit-line mr-2"></i>
              Modifier
            </button>
            <Link
              href={`/reservations/new?client=${client.id}`}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-calendar-check-line mr-2"></i>
              Nouvelle réservation
            </Link>
          </div>
        </div>

        {/* Formulaire de modification */}
        {showEditForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifier le client</h2>
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de client
                  </label>
                  <select
                    value={formData.type_client}
                    onChange={(e) => setFormData({...formData, type_client: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                  >
                    <option value="Particulier">Particulier</option>
                    <option value="Association">Association</option>
                    <option value="Entreprise">Entreprise</option>
                    <option value="Église">Église</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-save-line mr-2"></i>
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Informations du client */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Prénom et Nom</label>
                <p className="text-sm text-gray-900">{client.prenom} {client.nom}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm text-gray-900">{client.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Téléphone</label>
                <p className="text-sm text-gray-900">{client.telephone}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Type de client</label>
                <p className="text-sm text-gray-900">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {client.type_client}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Client depuis</label>
                <p className="text-sm text-gray-900">
                  {new Date(client.date_creation).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {client.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-sm text-gray-900">{client.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-calendar-check-line text-blue-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReservations}</p>
                <p className="text-sm text-gray-600">Réservations</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-money-euro-circle-line text-green-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDepense.toLocaleString()} €</p>
                <p className="text-sm text-gray-600">Total dépensé</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-bar-chart-line text-purple-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{Math.round(stats.moyenneReservation).toLocaleString()} €</p>
                <p className="text-sm text-gray-600">Panier moyen</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-wallet-line text-orange-600 text-xl"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{(stats.totalAcomptes + stats.totalSoldes).toLocaleString()} €</p>
                <p className="text-sm text-gray-600">Total encaissé</p>
              </div>
            </div>
          </div>
        </div>

        {/* Historique des réservations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Historique des réservations ({reservations.length})
            </h2>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-calendar-line text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">Aucune réservation trouvée</p>
              <Link
                href={`/reservations/new?client=${client.id}`}
                className="text-orange-600 hover:text-orange-700 mt-4 inline-block"
              >
                Créer une première réservation
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Lieu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.reference}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(reservation.date_event).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-sm text-gray-500">{reservation.lieu}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutBadge(reservation.statut)}`}>
                          {reservation.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {reservation.prix_total_ttc?.toLocaleString()} €
                        </div>
                        <div className="text-sm text-gray-500">
                          Encaissé: {((reservation.acompte_recu || 0) + (reservation.solde_recu || 0)).toLocaleString()} €
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/reservations/${reservation.id}`}
                          className="text-orange-600 hover:text-orange-700 cursor-pointer"
                          title="Voir détails"
                        >
                          <i className="ri-eye-line text-lg"></i>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
