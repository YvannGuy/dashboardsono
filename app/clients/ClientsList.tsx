
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  nombreReservations?: number;
  totalDepense?: number;
  derniereReservation?: string;
}

export default function ClientsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    type_client: 'Particulier',
    notes: ''
  });

  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  // Effacer les messages après 5 secondes
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Début du chargement des clients...');
      
      // Récupérer d'abord les clients seuls
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('date_creation', { ascending: false });

      if (clientsError) {
        console.error('Erreur lors du chargement des clients:', clientsError);
        throw clientsError;
      }

      console.log('Clients récupérés:', clientsData?.length || 0);

      if (!clientsData || clientsData.length === 0) {
        setClients([]);
        return;
      }

      // Ensuite récupérer les statistiques de réservations pour chaque client
      const clientsWithStats = await Promise.all(
        clientsData.map(async (client) => {
          try {
            const { data: reservations, error: resError } = await supabase
              .from('reservations')
              .select('id, prix_total_ttc, date_event')
              .eq('client_id', client.id);

            if (resError) {
              console.warn(`Erreur réservations pour client ${client.id}:`, resError);
            }

            const reservationsList = reservations || [];
            
            return {
              ...client,
              nombreReservations: reservationsList.length,
              totalDepense: reservationsList.reduce((sum, res) => sum + (res.prix_total_ttc || 0), 0),
              derniereReservation: reservationsList.length > 0 
                ? reservationsList.sort((a, b) => new Date(b.date_event).getTime() - new Date(a.date_event).getTime())[0].date_event
                : null
            };
          } catch (error) {
            console.warn(`Erreur stats pour client ${client.id}:`, error);
            return {
              ...client,
              nombreReservations: 0,
              totalDepense: 0,
              derniereReservation: null
            };
          }
        })
      );

      console.log('Clients avec stats:', clientsWithStats.length);
      setClients(clientsWithStats);
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des clients:', error);
      setError(`Erreur lors du chargement des clients: ${error.message || 'Erreur inconnue'}`);
      
      // En cas d'erreur, essayer de charger au moins les clients de base
      try {
        const { data: basicClients } = await supabase
          .from('clients')
          .select('*')
          .order('date_creation', { ascending: false });
        
        if (basicClients) {
          const basicClientsWithDefaults = basicClients.map(client => ({
            ...client,
            nombreReservations: 0,
            totalDepense: 0,
            derniereReservation: null
          }));
          setClients(basicClientsWithDefaults);
          console.log('Clients de base chargés:', basicClientsWithDefaults.length);
        }
      } catch (fallbackError) {
        console.error('Erreur de fallback:', fallbackError);
        setClients([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setFormData({
      nom: client.nom,
      prenom: client.prenom,
      email: client.email,
      telephone: client.telephone,
      type_client: client.type_client,
      notes: client.notes || ''
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs
    if (!formData.nom.trim() || !formData.prenom.trim() || !formData.email.trim() || !formData.telephone.trim()) {
      setError('Tous les champs obligatoires doivent être remplis');
      return;
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (editingClient) {
        // Mode modification
        console.log('Modification du client:', editingClient.id, formData);
        
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
          .eq('id', editingClient.id);

        if (error) {
          console.error('Erreur Supabase lors de la modification:', error);
          
          if (error.code === '23505') {
            throw new Error('Un client avec cet email existe déjà');
          }
          throw error;
        }

        console.log('Client modifié avec succès');
        
        const clientName = `${formData.prenom} ${formData.nom}`;
        setFormData({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          type_client: 'Particulier',
          notes: ''
        });
        setEditingClient(null);
        setShowForm(false);
        
        await fetchClients();
        setSuccess(`Client ${clientName} modifié avec succès !`);
        
      } else {
        // Mode création
        console.log('Création du client avec les données:', formData);
        
        const { data, error } = await supabase
          .from('clients')
          .insert([{
            nom: formData.nom.trim(),
            prenom: formData.prenom.trim(),
            email: formData.email.trim().toLowerCase(),
            telephone: formData.telephone.trim(),
            type_client: formData.type_client,
            notes: formData.notes.trim() || null
          }])
          .select()
          .single();

        if (error) {
          console.error('Erreur Supabase lors de la création:', error);
          
          if (error.code === '23505') {
            throw new Error('Un client avec cet email existe déjà');
          }
          throw error;
        }

        console.log('Client créé avec succès:', data);
        
        const clientName = `${formData.prenom} ${formData.nom}`;
        setFormData({
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          type_client: 'Particulier',
          notes: ''
        });
        setShowForm(false);
        
        await fetchClients();
        setSuccess(`Client ${clientName} créé avec succès !`);
      }
      
    } catch (error: any) {
      console.error('Erreur lors de l\'opération:', error);
      setError(error.message || 'Erreur lors de l\'opération');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      type_client: 'Particulier',
      notes: ''
    });
    setEditingClient(null);
    setShowForm(false);
    setError(null);
    setSuccess(null);
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.nom.toLowerCase().includes(query) ||
      client.prenom.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.telephone.includes(query)
    );
  });

  const deleteClient = async (client: Client) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${client.prenom} ${client.nom} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression du client');
        return;
      }

      setSuccess(`Client ${client.prenom} ${client.nom} supprimé avec succès`);
      await fetchClients();
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors de la suppression du client');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">Gérez votre base de clients</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <i className="ri-error-warning-line text-red-600 mr-2"></i>
            <span className="text-red-800">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <i className="ri-check-line text-green-600 mr-2"></i>
            <span className="text-green-800">{success}</span>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Gérez votre base de clients</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
        >
          <i className="ri-user-add-line mr-2"></i>
          Nouveau client
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </h2>
            <button 
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="Jean"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="Dupont"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="jean.dupont@email.com"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de client
                </label>
                <select
                  value={formData.type_client}
                  onChange={(e) => setFormData({...formData, type_client: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                rows={3}
                maxLength={500}
                placeholder="Informations complémentaires..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    {editingClient ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  <>
                    <i className="ri-save-line mr-2"></i>
                    {editingClient ? 'Modifier le client' : 'Créer le client'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par nom, email ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
          <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <i className="ri-user-line text-blue-600 text-xl"></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              <p className="text-sm text-gray-600">Clients total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <i className="ri-money-euro-circle-line text-green-600 text-xl"></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clients.reduce((sum, client) => sum + (client.totalDepense || 0), 0).toLocaleString()} €
              </p>
              <p className="text-sm text-gray-600">CA total clients</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <i className="ri-calendar-check-line text-purple-600 text-xl"></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clients.reduce((sum, client) => sum + (client.nombreReservations || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">Réservations total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Liste des clients ({filteredClients.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total dépensé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-gray-600">
                          {client.prenom.charAt(0)}{client.nom.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.prenom} {client.nom}
                        </div>
                        <div className="text-xs text-gray-500">
                          Client depuis {new Date(client.date_creation).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.email}</div>
                    <div className="text-sm text-gray-500">{client.telephone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {client.type_client}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {client.nombreReservations || 0} réservation{(client.nombreReservations || 0) > 1 ? 's' : ''}
                    </div>
                    {client.derniereReservation && (
                      <div className="text-sm text-gray-500">
                        Dernière: {new Date(client.derniereReservation).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {(client.totalDepense || 0).toLocaleString()} €
                    </div>
                    {client.nombreReservations && client.nombreReservations > 0 && (
                      <div className="text-sm text-gray-500">
                        Moy: {Math.round((client.totalDepense || 0) / client.nombreReservations).toLocaleString()} €
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => deleteClient(client)}
                        className="text-red-600 hover:text-red-700 cursor-pointer"
                        title="Supprimer"
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                      <button
                        onClick={() => handleEditClient(client)}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
                        title="Modifier"
                      >
                        <i className="ri-edit-line text-lg"></i>
                      </button>
                      <Link
                        href={`/reservations/new?client=${client.id}`}
                        className="text-green-600 hover:text-green-700 cursor-pointer"
                        title="Nouvelle réservation"
                      >
                        <i className="ri-calendar-check-line text-lg"></i>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-user-search-line text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">Aucun client trouvé</p>
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className="flex justify-between items-center">
        <div className="space-x-2">
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap">
            <i className="ri-download-line mr-2"></i>
            Export CSV
          </button>
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap">
            <i className="ri-upload-line mr-2"></i>
            Import CSV
          </button>
        </div>
      </div>
    </div>
  );
}
