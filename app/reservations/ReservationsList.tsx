
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Reservation {
  id: string;
  ref: string;
  date_event: string;
  heure_event: string;
  ville_zone: string;
  statut: string;
  prix_total_ttc: number;
  acompte_du: number;
  acompte_regle: boolean;
  solde_du: number;
  solde_regle: boolean;
  caution_eur: number;
  caution_statut: string;
  deadline_paiement: string;
  clients: {
    prenom: string;
    nom: string;
  };
  packs: {
    nom_pack: string;
  };
}

export default function ReservationsList() {
  const [filters, setFilters] = useState({
    statut: '',
    periode: '',
    pack: '',
    ville: '',
    acompteRegle: '',
    soldeRegle: ''
  });

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, reservationId: string, reservationRef: string}>({
    show: false,
    reservationId: '',
    reservationRef: ''
  });

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
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
        .order('date_event', { ascending: false });

      if (error) throw error;
      
      // Corriger automatiquement les références manquantes
      const reservationsWithRefs = await Promise.all((data || []).map(async (reservation) => {
        if (!reservation.ref || reservation.ref === 'N/A') {
          const newRef = await generateReservationRef();
          
          // Mettre à jour dans la base de données
          const { error: updateError } = await supabase
            .from('reservations')
            .update({ ref: newRef })
            .eq('id', reservation.id);
            
          if (!updateError) {
            return { ...reservation, ref: newRef };
          }
        }
        return reservation;
      }));
      
      setReservations(reservationsWithRefs);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour générer une référence unique
  const generateReservationRef = async () => {
    try {
      const currentYear = new Date().getFullYear();
      
      // Obtenir toutes les références existantes pour l'année courante
      const { data: existingRefs, error } = await supabase
        .from('reservations')
        .select('ref')
        .like('ref', `RES-${currentYear}-%`)
        .order('ref', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (existingRefs && existingRefs.length > 0 && existingRefs[0].ref) {
        const lastRef = existingRefs[0].ref;
        const parts = lastRef.split('-');
        if (parts.length === 3) {
          const lastNumber = parseInt(parts[2], 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }

      return `RES-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Erreur génération référence:', error);
      // Fallback avec timestamp
      return `RES-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles: { [key: string]: string } = {
      'Brouillon': 'bg-gray-100 text-gray-800',
      'Confirmée': 'bg-blue-100 text-blue-800',
      'Acompte payé': 'bg-orange-100 text-orange-800',
      'Soldée': 'bg-green-100 text-green-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return { style: styles[statut] || 'bg-gray-100 text-gray-800', label: statut };
  };

  const getPaiementBadge = (regle: boolean, urgent: boolean = false) => {
    if (regle) return { style: 'bg-green-100 text-green-800', label: 'Payé' };
    if (urgent) return { style: 'bg-red-100 text-red-800', label: 'Urgent' };
    return { style: 'bg-gray-100 text-gray-800', label: 'Dû' };
  };

  const getCautionBadge = (statut: string) => {
    const styles: { [key: string]: string } = {
      'À percevoir': 'bg-gray-100 text-gray-800',
      'Reçue': 'bg-blue-100 text-blue-800',
      'À restituer': 'bg-purple-100 text-purple-800',
      'Restituée': 'bg-green-100 text-green-800',
      'Partiellement retenue': 'bg-yellow-100 text-yellow-800'
    };
    return { style: styles[statut] || 'bg-gray-100 text-gray-800', label: statut };
  };

  const isUrgent = (deadline: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 72;
  };

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };

  const handleAction = async (action: string, reservationId: string) => {
    try {
      let updateData: any = {};
      
      switch (action) {
        case 'acompte_paye':
          const reservation = reservations.find(r => r.id === reservationId);
          if (reservation && reservation.acompte_du) {
            // Créer le paiement AVANT de mettre à jour la réservation
            const { error: paiementError } = await supabase.from('paiements').insert([{
              reservation_id: reservationId,
              type: 'Acompte',
              montant_eur: reservation.acompte_du,
              moyen: 'CB',
              date_paiement: new Date().toISOString().split('T')[0],
              notes: `Acompte marqué comme payé depuis la liste des réservations - ${reservation.ref}`
            }]);
            
            if (paiementError) {
              console.error('Erreur création paiement acompte:', paiementError);
              throw paiementError;
            }
            
            console.log(`✅ Paiement acompte créé: ${reservation.acompte_du}€ pour ${reservation.ref}`);
          }
          
          updateData = { 
            acompte_regle: true,
            statut: 'Acompte payé'
          };
          break;
          
        case 'solde_paye':
          const reservationSolde = reservations.find(r => r.id === reservationId);
          if (reservationSolde && reservationSolde.solde_du) {
            // Créer le paiement AVANT de mettre à jour la réservation
            const { error: paiementError } = await supabase.from('paiements').insert([{
              reservation_id: reservationId,
              type: 'Solde',
              montant_eur: reservationSolde.solde_du,
              moyen: 'CB',
              date_paiement: new Date().toISOString().split('T')[0],
              notes: `Solde marqué comme payé depuis la liste des réservations - ${reservationSolde.ref}`
            }]);
            
            if (paiementError) {
              console.error('Erreur création paiement solde:', paiementError);
              throw paiementError;
            }
            
            console.log(`✅ Paiement solde créé: ${reservationSolde.solde_du}€ pour ${reservationSolde.ref}`);
          }
          
          updateData = { 
            solde_regle: true,
            statut: 'Soldée'
          };
          break;
          
        case 'caution_recue':
          updateData = { caution_statut: 'Reçue' };
          break;
        case 'caution_restituee':
          updateData = { caution_statut: 'Restituée' };
          break;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('reservations')
          .update(updateData)
          .eq('id', reservationId);

        if (error) throw error;
        
        console.log(`✅ Réservation mise à jour avec statut: ${updateData.statut || 'Statut inchangé'}`);
        
        // Actualiser immédiatement la liste
        await fetchReservations();
        
        // Déclencher une actualisation du dashboard et des paiements
        window.dispatchEvent(new CustomEvent('reservation-payment-updated', {
          detail: { reservationId, action, updateData }
        }));
        
        console.log('🔄 Événement de synchronisation déclenché');
      }
    } catch (error: any) {
      console.error(`Erreur lors de l'action ${action}:`, error);
      alert(`Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', deleteModal.reservationId);

      if (error) throw error;
      
      setDeleteModal({ show: false, reservationId: '', reservationRef: '' });
      await fetchReservations();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la réservation');
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filters.statut && reservation.statut !== filters.statut) return false;
    if (filters.periode && !reservation.date_event.includes(filters.periode)) return false;
    if (filters.pack && !reservation.packs?.nom_pack.toLowerCase().includes(filters.pack.toLowerCase())) return false;
    if (filters.ville && !reservation.ville_zone.toLowerCase().includes(filters.ville.toLowerCase())) return false;
    if (filters.acompteRegle && reservation.acompte_regle.toString() !== filters.acompteRegle) return false;
    if (filters.soldeRegle && reservation.solde_regle.toString() !== filters.soldeRegle) return false;
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
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-600">Gérez toutes vos réservations</p>
        </div>
        <Link
          href="/reservations/new"
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nouvelle réservation
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <select 
            value={filters.statut}
            onChange={(e) => setFilters({...filters, statut: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          >
            <option value="">Tous les statuts</option>
            <option value="Brouillon">Brouillon</option>
            <option value="Confirmée">Confirmée</option>
            <option value="Acompte payé">Acompte payé</option>
            <option value="Soldée">Soldée</option>
            <option value="Annulée">Annulée</option>
          </select>

          <input
            type="date"
            value={filters.periode}
            onChange={(e) => setFilters({...filters, periode: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />

          <input
            type="text"
            placeholder="Pack..."
            value={filters.pack}
            onChange={(e) => setFilters({...filters, pack: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />

          <select 
            value={filters.ville}
            onChange={(e) => setFilters({...filters, ville: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          >
            <option value="">Toutes les zones</option>
            <option value="Paris">Paris</option>
            <option value="Hors Paris">Hors Paris</option>
            <option value="Retrait agence">Retrait agence</option>
          </select>

          <select 
            value={filters.acompteRegle}
            onChange={(e) => setFilters({...filters, acompteRegle: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          >
            <option value="">Acompte</option>
            <option value="true">Payé</option>
            <option value="false">Non payé</option>
          </select>

          <select 
            value={filters.soldeRegle}
            onChange={(e) => setFilters({...filters, soldeRegle: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
          >
            <option value="">Solde</option>
            <option value="true">Payé</option>
            <option value="false">Non payé</option>
          </select>
        </div>
      </div>

      {/* Liste des réservations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pack
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acompte
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solde
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caution
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReservations.map((reservation) => {
                const statutBadge = getStatutBadge(reservation.statut || '');
                const acompteBadge = getPaiementBadge(reservation.acompte_regle, isUrgent(reservation.deadline_paiement) && !reservation.acompte_regle);
                const soldeBadge = getPaiementBadge(reservation.solde_regle, isUrgent(reservation.deadline_paiement) && !reservation.solde_regle);
                const cautionBadge = getCautionBadge(reservation.caution_statut || '');

                return (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link 
                        href={`/reservations/${reservation.id}`}
                        className="text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                      >
                        {reservation.ref || 'N/A'}
                      </Link>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statutBadge.style}`}>
                          {statutBadge.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.clients?.prenom || ''} {reservation.clients?.nom || ''}
                      </div>
                      <div className="text-sm text-gray-500">{reservation.ville_zone || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {reservation.date_event ? new Date(reservation.date_event).toLocaleDateString('fr-FR') : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">{reservation.heure_event || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reservation.packs?.nom_pack || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatNumber(reservation.prix_total_ttc)} €
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(reservation.acompte_du)} €</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${acompteBadge.style}`}>
                        {acompteBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(reservation.solde_du)} €</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${soldeBadge.style}`}>
                        {soldeBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(reservation.caution_eur)} €</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cautionBadge.style}`}>
                        {cautionBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {!reservation.acompte_regle && (
                          <button
                            onClick={() => handleAction('acompte_paye', reservation.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                            title="Marquer acompte payé"
                          >
                            <i className="ri-check-line text-sm"></i>
                          </button>
                        )}
                        {!reservation.solde_regle && reservation.acompte_regle && (
                          <button
                            onClick={() => handleAction('solde_paye', reservation.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Marquer solde payé"
                          >
                            <i className="ri-money-euro-circle-line text-sm"></i>
                          </button>
                        )}
                        {reservation.caution_statut === 'À percevoir' && (
                          <button
                            onClick={() => handleAction('caution_recue', reservation.id)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded cursor-pointer"
                            title="Caution reçue"
                          >
                            <i className="ri-safe-line text-sm"></i>
                          </button>
                        )}
                        {reservation.caution_statut === 'Reçue' && (
                          <button
                            onClick={() => handleAction('caution_restituee', reservation.id)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                            title="Caution restituée"
                          >
                            <i className="ri-refund-line text-sm"></i>
                          </button>
                        )}
                        <button
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded cursor-pointer"
                          title="Dupliquer réservation"
                        >
                          <i className="ri-file-copy-line text-sm"></i>
                        </button>
                        <button
                          onClick={() => setDeleteModal({
                            show: true,
                            reservationId: reservation.id,
                            reservationRef: reservation.ref || 'N/A'
                          })}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Supprimer réservation"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredReservations.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-calendar-line text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">
              {reservations.length === 0 ? 'Aucune réservation trouvée' : 'Aucune réservation ne correspond aux filtres'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de suppression */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <i className="ri-delete-bin-line text-red-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Supprimer la réservation</h3>
                <p className="text-sm text-gray-500">Cette action ne peut pas être annulée</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement la réservation <strong>{deleteModal.reservationRef}</strong> ?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
              >
                Supprimer définitivement
              </button>
              <button
                onClick={() => setDeleteModal({ show: false, reservationId: '', reservationRef: '' })}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
