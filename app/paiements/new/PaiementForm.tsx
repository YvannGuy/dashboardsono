'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Reservation {
  id: string;
  ref: string;
  acompte_du: number;
  acompte_regle: boolean;
  solde_du: number;
  solde_regle: boolean;
  clients: {
    prenom: string;
    nom: string;
  }[];
}

export default function PaiementForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const [formData, setFormData] = useState({
    reservation_id: '',
    type: 'Acompte',
    montant_eur: 0,
    moyen: 'CB',
    date_paiement: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          ref,
          acompte_du,
          acompte_regle,
          solde_du,
          solde_regle,
          clients (
            prenom,
            nom
          )
        `)
        .neq('statut', 'Annulée')
        .order('ref', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
    }
  };

  const handleReservationChange = (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId);
    setSelectedReservation(reservation || null);
    
    if (reservation) {
      // Suggérer le montant selon le type
      let montantSuggere = 0;
      if (formData.type === 'Acompte' && !reservation.acompte_regle) {
        montantSuggere = reservation.acompte_du;
      } else if (formData.type === 'Solde' && !reservation.solde_regle) {
        montantSuggere = reservation.solde_du;
      }
      
      setFormData(prev => ({
        ...prev,
        reservation_id: reservationId,
        montant_eur: montantSuggere
      }));
    }
  };

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({ ...prev, type }));
    
    if (selectedReservation) {
      let montantSuggere = 0;
      if (type === 'Acompte' && !selectedReservation.acompte_regle) {
        montantSuggere = selectedReservation.acompte_du;
      } else if (type === 'Solde' && !selectedReservation.solde_regle) {
        montantSuggere = selectedReservation.solde_du;
      }
      
      setFormData(prev => ({ ...prev, montant_eur: montantSuggere }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Créer le paiement
      const { data: paiement, error: paiementError } = await supabase
        .from('paiements')
        .insert([{
          reservation_id: formData.reservation_id,
          type: formData.type,
          montant_eur: formData.montant_eur,
          moyen: formData.moyen,
          date_paiement: formData.date_paiement
        }])
        .select()
        .single();

      if (paiementError) throw paiementError;

      // Mettre à jour le statut de la réservation
      if (selectedReservation) {
        let updateData: any = {};
        
        if (formData.type === 'Acompte') {
          updateData.acompte_regle = true;
          updateData.statut = 'Acompte payé';
        } else if (formData.type === 'Solde') {
          updateData.solde_regle = true;
          updateData.statut = 'Soldée';
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('reservations')
            .update(updateData)
            .eq('id', formData.reservation_id);

          if (updateError) throw updateError;
        }
      }

      router.push('/paiements');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du paiement');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableTypes = () => {
    if (!selectedReservation) return ['Acompte', 'Solde', 'Autre'];
    
    const types = [];
    if (!selectedReservation.acompte_regle) types.push('Acompte');
    if (!selectedReservation.solde_regle) types.push('Solde');
    types.push('Autre');
    
    return types;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/paiements"
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau paiement</h1>
            <p className="text-gray-600">Enregistrer un nouveau paiement</p>
          </div>
        </div>
        <button
          form="paiement-form"
          type="submit"
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {saving ? (
            <i className="ri-loader-4-line animate-spin mr-2"></i>
          ) : (
            <i className="ri-save-line mr-2"></i>
          )}
          Enregistrer
        </button>
      </div>

      <form id="paiement-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Informations principales */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du paiement</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Réservation *
              </label>
              <select
                required
                value={formData.reservation_id}
                onChange={(e) => handleReservationChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                <option value="">Sélectionner une réservation</option>
                {reservations.map(reservation => (
                  <option key={reservation.id} value={reservation.id}>
                    {reservation.ref} - {reservation.clients?.[0]?.prenom} {reservation.clients?.[0]?.nom}
                  </option>
                ))}
              </select>
              
              {selectedReservation && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Acompte ({selectedReservation.acompte_du} €):</span>
                      <span className={selectedReservation.acompte_regle ? 'text-green-600 font-medium' : 'text-red-600'}>
                        {selectedReservation.acompte_regle ? 'Payé' : 'Dû'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Solde ({selectedReservation.solde_du} €):</span>
                      <span className={selectedReservation.solde_regle ? 'text-green-600 font-medium' : 'text-red-600'}>
                        {selectedReservation.solde_regle ? 'Payé' : 'Dû'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de paiement *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                {getAvailableTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (€) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.montant_eur}
                onChange={(e) => setFormData({...formData, montant_eur: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moyen de paiement *
              </label>
              <select
                required
                value={formData.moyen}
                onChange={(e) => setFormData({...formData, moyen: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                <option value="CB">Carte bancaire</option>
                <option value="Virement">Virement bancaire</option>
                <option value="Espèces">Espèces</option>
                <option value="Lien Stripe">Lien Stripe</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date du paiement *
              </label>
              <input
                type="date"
                required
                value={formData.date_paiement}
                onChange={(e) => setFormData({...formData, date_paiement: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Notes optionnelles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            rows={3}
            maxLength={500}
            placeholder="Informations complémentaires sur le paiement..."
          />
          <div className="mt-1 text-right">
            <span className="text-xs text-gray-500">
              {(formData.notes || '').length}/500 caractères
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}