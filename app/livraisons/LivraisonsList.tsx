
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Livraison {
  id: string;
  reservation_id: string;
  type: 'Livraison' | 'Récupération';
  statut: 'Prévue' | 'En cours' | 'Effectuée' | 'Reportée' | 'Annulée';
  date_prevue: string;
  heure_prevue: string;
  date_effective?: string;
  heure_effective?: string;
  adresse: string;
  ville: string;
  code_postal?: string;
  contact_nom: string;
  contact_telephone: string;
  notes?: string;
  chauffeur?: string;
  vehicule?: string;
  created_at: string;
  reservations?: {
    ref: string;
    date_event: string;
    clients?: {
      prenom: string;
      nom: string;
    };
    packs?: {
      nom_pack: string;
    };
  };
}

export default function LivraisonsList() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingLivraison, setEditingLivraison] = useState<Livraison | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    statut: '',
    date: '',
    chauffeur: '',
    ville: ''
  });

  useEffect(() => {
    fetchLivraisons();
  }, []);

  const syncLivraisonsFromReservations = async () => {
    try {
      setSyncing(true);
      console.log('🔄 Synchronisation des livraisons...');

      // Récupérer les réservations avec options de livraison ET leurs données clients/packs
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id, ref, date_event, date_fin_event, heure_event, ville_zone, adresse_event,
          livraison_aller, livraison_retour, fullName, telephone, email,
          clients (id, prenom, nom, telephone, email),
          packs (id, nom_pack)
        `)
        .or('livraison_aller.eq.true,livraison_retour.eq.true')
        .neq('statut', 'Annulée');

      if (reservationsError) {
        console.error('Erreur requête réservations:', reservationsError);
        throw reservationsError;
      }

      console.log(`📋 ${reservations?.length || 0} réservations avec livraison trouvées`);

      // Récupérer les livraisons existantes pour éviter les doublons
      const { data: existingLivraisons } = await supabase
        .from('livraisons')
        .select('reservation_id, type');

      // Créer une map plus précise pour éviter les doublons
      const existingMap = new Map();
      existingLivraisons?.forEach(liv => {
        const key = `${liv.reservation_id}-${liv.type}`;
        existingMap.set(key, true);
      });

      // Nettoyer d'abord les livraisons orphelines (sans réservation correspondante)
      const validReservationIds = new Set(reservations?.map(r => r.id) || []);
      const orphanedLivraisons = existingLivraisons?.filter(liv => 
        !validReservationIds.has(parseInt(liv.reservation_id))
      ) || [];

      if (orphanedLivraisons.length > 0) {
        console.log(`🧹 Suppression de ${orphanedLivraisons.length} livraisons orphelines`);
        for (const orphan of orphanedLivraisons) {
          await supabase
            .from('livraisons')
            .delete()
            .eq('reservation_id', orphan.reservation_id)
            .eq('type', orphan.type);
        }
      }

      // Créer les nouvelles livraisons nécessaires
      const newLivraisons = [];
      
      for (const reservation of reservations || []) {
        const clientData = reservation.clients;
        const packData = reservation.packs;
        
        // Construire le nom complet du client de manière robuste
        let nomComplet = '';
        if (clientData && Array.isArray(clientData) && clientData[0]?.prenom && clientData[0]?.nom) {
          nomComplet = `${clientData[0].prenom} ${clientData[0].nom}`.trim();
        } else if (reservation.fullName) {
          nomComplet = reservation.fullName;
        } else {
          nomComplet = 'Client non défini';
        }
        
        // Téléphone prioritaire : client puis réservation
        const telephoneContact = (Array.isArray(clientData) ? clientData[0]?.telephone : reservation.telephone || '').trim();
        
        const baseData = {
          reservation_id: reservation.id,
          date_prevue: reservation.date_event,
          heure_prevue: reservation.heure_event?.substring(0,5) || '14:00',
          adresse: reservation.adresse_event || '',
          ville: reservation.ville_zone || '',
          contact_nom: nomComplet,
          contact_telephone: telephoneContact,
          statut: 'Prévue' as const,
          code_postal: '00000',
          notes: `Pack: ${(Array.isArray(packData) ? packData[0]?.nom_pack : 'N/A')} | Réf: ${reservation.ref || 'N/A'}`
        };

        // Livraison aller
        if (reservation.livraison_aller && !existingMap.has(`${reservation.id}-Livraison`)) {
          newLivraisons.push({
            ...baseData,
            type: 'Livraison' as const,
            notes: `${baseData.notes} | Livraison aller vers ${reservation.ville_zone || ''}`
          });
          console.log(`➕ Nouvelle livraison ALLER pour ${nomComplet} (${reservation.ref})`);
        }

        // Livraison retour (récupération)
        if (reservation.livraison_retour && !existingMap.has(`${reservation.id}-Récupération`)) {
          // Calculer la date de récupération
          let dateRetour = reservation.date_fin_event || reservation.date_event;
          if (!reservation.date_fin_event && reservation.date_event) {
            const dateEvent = new Date(reservation.date_event);
            dateEvent.setDate(dateEvent.getDate() + 1);
            dateRetour = dateEvent.toISOString().split('T')[0];
          }
          
          newLivraisons.push({
            ...baseData,
            type: 'Récupération' as const,
            date_prevue: dateRetour,
            heure_prevue: '10:00', // Heure standard pour récupération
            notes: `${baseData.notes} | Récupération retour depuis ${reservation.ville_zone || ''}`
          });
          console.log(`➕ Nouvelle récupération pour ${nomComplet} (${reservation.ref})`);
        }
      }

      if (newLivraisons.length > 0) {
        const { error: insertError } = await supabase
          .from('livraisons')
          .insert(newLivraisons);

        if (insertError) {
          console.error('Erreur insertion:', insertError);
          throw insertError;
        }
        console.log(`✅ ${newLivraisons.length} nouvelles livraisons créées`);
      } else {
        console.log('ℹ️ Aucune nouvelle livraison à créer');
      }

    } catch (error: any) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      alert(`Erreur lors de la synchronisation: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSyncing(false);
    }
  };

  const fetchLivraisons = async () => {
    try {
      // Récupérer les livraisons avec les données des réservations associées
      const { data, error } = await supabase
        .from('livraisons')
        .select(`
          *,
          reservations (
            ref,
            date_event,
            clients (
              prenom,
              nom
            ),
            packs (
              nom_pack
            )
          )
        `)
        .order('date_prevue', { ascending: true });

      if (error) {
        console.error('Erreur chargement livraisons:', error);
        throw error;
      }
      
      console.log('Livraisons chargées:', data?.length || 0);
      setLivraisons(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des livraisons:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (livraisonId: string, newStatut: string) => {
    try {
      const updateData: any = { statut: newStatut };
      
      if (newStatut === 'En cours') {
        updateData.date_effective = new Date().toISOString().split('T')[0];
        updateData.heure_effective = new Date().toTimeString().split(' ')[0].substring(0, 5);
      } else if (newStatut === 'Effectuée') {
        updateData.date_effective = new Date().toISOString().split('T')[0];
        updateData.heure_effective = new Date().toTimeString().split(' ')[0].substring(0, 5);
      }

      const { error } = await supabase
        .from('livraisons')
        .update(updateData)
        .eq('id', livraisonId);

      if (error) throw error;
      await fetchLivraisons();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleEditLivraison = (livraison: Livraison) => {
    setEditingLivraison(livraison);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLivraison) return;

    try {
      // Normaliser le statut avant sauvegarde
      let normalizedStatut: 'Annulée' | 'Prévue' | 'En cours' | 'Effectuée' | 'Reportée' = editingLivraison.statut as any;
      
      // Mapper les nouveaux statuts vers les statuts de base compatibles
      const statutMapping: { [key: string]: 'Annulée' | 'Prévue' | 'En cours' | 'Effectuée' | 'Reportée' } = {
        'À récupérer': 'Prévue',
        'À livrer': 'Prévue', 
        'Livré': 'Effectuée',
        'Récupéré': 'Effectuée',
        'Pick up client': 'En cours',
        'Retour pick up': 'En cours'
      };
      
      if (statutMapping[editingLivraison.statut]) {
        normalizedStatut = statutMapping[editingLivraison.statut];
      }

      // Préparer les données à mettre à jour avec une date effective si nécessaire
      const updateData: any = {
        statut: normalizedStatut,
        date_prevue: editingLivraison.date_prevue,
        heure_prevue: editingLivraison.heure_prevue,
        adresse: editingLivraison.adresse,
        ville: editingLivraison.ville,
        contact_nom: editingLivraison.contact_nom,
        contact_telephone: editingLivraison.contact_telephone,
        chauffeur: editingLivraison.chauffeur || null,
        vehicule: editingLivraison.vehicule || null,
        notes: editingLivraison.notes || null
      };

      // Ajouter date/heure effective si le statut est "En cours" ou "Effectuée"
      if (normalizedStatut === 'En cours' || normalizedStatut === 'Effectuée') {
        updateData.date_effective = new Date().toISOString().split('T')[0];
        updateData.heure_effective = new Date().toTimeString().split(' ')[0].substring(0, 5);
      } else if (normalizedStatut === 'Prévue') {
        // Réinitialiser les dates effectives si on revient à "Prévue"
        updateData.date_effective = null;
        updateData.heure_effective = null;
      }

      console.log('💾 Sauvegarde livraison avec données:', updateData);

      const { error } = await supabase
        .from('livraisons')
        .update(updateData)
        .eq('id', editingLivraison.id);

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }
      
      console.log('✅ Livraison mise à jour avec succès');
      setShowEditModal(false);
      setEditingLivraison(null);
      await fetchLivraisons();
    } catch (error: any) {
      console.error('💥 Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const handleManualSync = async () => {
    try {
      await syncLivraisonsFromReservations();
      await fetchLivraisons();
    } catch (error) {
      console.error('Erreur synchronisation manuelle:', error);
    }
  };

  const getStatutBadge = (statut: string, type: string) => {
    // Adapter l'affichage du statut selon le type
    let displayStatut = statut;
    if (statut === 'Effectuée') {
      displayStatut = type === 'Livraison' ? 'Livrée' : 'Récupérée';
    } else if (statut === 'Prévue') {
      displayStatut = type === 'Récupération' ? 'À récupérer' : 'Prévue';
    }

    const styles: { [key: string]: string } = {
      'Prévue': 'bg-blue-100 text-blue-800',
      'À récupérer': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-yellow-100 text-yellow-800',
      'Effectuée': 'bg-green-100 text-green-800',
      'Livrée': 'bg-green-100 text-green-800',
      'Récupérée': 'bg-green-100 text-green-800',
      'Reportée': 'bg-orange-100 text-orange-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return { class: styles[displayStatut] || 'bg-gray-100 text-gray-800', text: displayStatut };
  };

  const getTypeBadge = (type: string) => {
    const styles: { [key: string]: string } = {
      'Livraison': 'bg-purple-100 text-purple-800',
      'Récupération': 'bg-indigo-100 text-indigo-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  const getUrgenceLevel = (datePrevue: string, type: string) => {
    const today = new Date();
    const datePreve = new Date(datePrevue);
    const diffHours = (datePreve.getTime() - today.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'expired';
    if (diffHours <= 4) return 'urgent';
    if (diffHours <= 24) return 'soon';
    return 'normal';
  };

  const filteredLivraisons = livraisons.filter(livraison => {
    if (filters.type && livraison.type !== filters.type) return false;
    if (filters.statut && livraison.statut !== filters.statut) return false;
    if (filters.date && !livraison.date_prevue.includes(filters.date)) return false;
    if (filters.chauffeur && !livraison.chauffeur?.toLowerCase().includes(filters.chauffeur.toLowerCase())) return false;
    if (filters.ville && !livraison.ville.toLowerCase().includes(filters.ville.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livraisons & Récupérations</h1>
          <p className="text-gray-600">Gérez toutes vos livraisons en temps réel</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {syncing ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-2"></i>
                Synchronisation...
              </>
            ) : (
              <>
                <i className="ri-refresh-line mr-2"></i>
                Actualiser
              </>
            )}
          </button>
          <div className="flex space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {livraisons.filter(l => l.type === 'Livraison' && l.statut === 'Prévue').length}
              </div>
              <div className="text-sm text-gray-500">À livrer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {livraisons.filter(l => l.type === 'Récupération' && l.statut === 'Prévue').length}
              </div>
              <div className="text-sm text-gray-500">À récupérer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {livraisons.filter(l => l.statut === 'En cours').length}
              </div>
              <div className="text-sm text-gray-500">En cours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {livraisons.filter(l => l.statut === 'Effectuée').length}
              </div>
              <div className="text-sm text-gray-500">Terminées</div>
            </div>
          </div>
        </div>
      </div>

      {/* Information de synchronisation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="ri-information-line text-blue-600 mr-3 mt-0.5"></i>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Synchronisation automatique intelligente</p>
            <p>Le système analyse automatiquement toutes les réservations avec options "Livraison aller" ou "Livraison retour" et crée les livraisons correspondantes avec :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Informations client complètes (nom, téléphone)</li>
              <li>Adresse de livraison depuis la réservation</li>
              <li>Dates et heures adaptées (retour = lendemain par défaut)</li>
              <li>Notes détaillées avec référence et pack</li>
              <li>Suppression automatique des livraisons orphelines</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <select 
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
          >
            <option value="">Tous les types</option>
            <option value="Livraison">Livraison</option>
            <option value="Récupération">Récupération</option>
          </select>

          <select 
            value={filters.statut}
            onChange={(e) => setFilters({...filters, statut: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8"
          >
            <option value="">Tous les statuts</option>
            <option value="Prévue">Prévue</option>
            <option value="En cours">En cours</option>
            <option value="Effectuée">Effectuée</option>
            <option value="Reportée">Reportée</option>
            <option value="Annulée">Annulée</option>
          </select>

          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({...filters, date: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          <input
            type="text"
            placeholder="Chauffeur..."
            value={filters.chauffeur}
            onChange={(e) => setFilters({...filters, chauffeur: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          <input
            type="text"
            placeholder="Ville..."
            value={filters.ville}
            onChange={(e) => setFilters({...filters, ville: e.target.value})}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Liste des livraisons avec organisation par type */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Réservation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Heure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chauffeur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Livraisons d'abord */}
              {filteredLivraisons
                .filter(livraison => livraison.type === 'Livraison')
                .map((livraison) => {
                  const urgence = getUrgenceLevel(livraison.date_prevue, livraison.type);
                  const urgenceClass = {
                    'expired': 'bg-red-50 border-l-4 border-red-500',
                    'urgent': 'bg-orange-50 border-l-4 border-orange-500',
                    'soon': 'bg-yellow-50 border-l-4 border-yellow-500',
                    'normal': ''
                  };

                  return (
                    <tr key={livraison.id} className={`hover:bg-gray-50 ${urgenceClass[urgence]}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(livraison.type)}`}>
                            <i className={`${livraison.type === 'Livraison' ? 'ri-truck-line' : 'ri-arrow-go-back-line'} mr-1`}></i>
                            {livraison.type}
                          </span>
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutBadge(livraison.statut, livraison.type).class}`}>
                              {getStatutBadge(livraison.statut, livraison.type).text}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {livraison.reservations ? (
                          <>
                            <Link 
                              href={`/reservations/${livraison.reservation_id}`}
                              className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                            >
                              {livraison.reservations.ref}
                            </Link>
                            <div className="text-sm text-gray-500">
                              {livraison.reservations.clients?.prenom} {livraison.reservations.clients?.nom}
                            </div>
                            <div className="text-xs text-gray-400">
                              {livraison.reservations.packs?.nom_pack}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Réservation #{livraison.reservation_id}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(livraison.date_prevue).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-sm text-gray-500">{livraison.heure_prevue}</div>
                        {livraison.statut === 'Effectuée' && livraison.date_effective && (
                          <div className="text-xs text-green-600 mt-1">
                            {livraison.type === 'Livraison' ? 'Livrée' : 'Récupérée'}: {new Date(livraison.date_effective).toLocaleDateString('fr-FR')} {livraison.heure_effective}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {livraison.adresse || 'Adresse non définie'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {livraison.code_postal && livraison.code_postal !== '00000' && `${livraison.code_postal} `}{livraison.ville}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {livraison.contact_nom}
                        </div>
                        <div className="text-sm text-gray-500">{livraison.contact_telephone}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {livraison.chauffeur || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {livraison.vehicule || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {livraison.statut === 'Prévue' && (
                            <button
                              onClick={() => updateStatut(livraison.id, 'En cours')}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded cursor-pointer"
                              title="Marquer en cours"
                            >
                              <i className="ri-play-line text-sm"></i>
                            </button>
                          )}
                          {livraison.statut === 'En cours' && (
                            <button
                              onClick={() => updateStatut(livraison.id, 'Effectuée')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                              title={livraison.type === 'Livraison' ? 'Marquer livrée' : 'Marquer récupérée'}
                            >
                              <i className="ri-check-line text-sm"></i>
                            </button>
                          )}
                          {['Prévue', 'En cours'].includes(livraison.statut) && (
                            <button
                              onClick={() => updateStatut(livraison.id, 'Reportée')}
                              className="p-1 text-orange-600 hover:bg-orange-50 rounded cursor-pointer"
                              title="Reporter"
                            >
                              <i className="ri-calendar-schedule-line text-sm"></i>
                            </button>
                          )}
                          <button
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Voir sur carte"
                            onClick={() => {
                              const address = encodeURIComponent(livraison.adresse + ' ' + livraison.ville);
                              window.open(`https://www.google.com/maps/search/${address}`, '_blank');
                            }}
                          >
                            <i className="ri-map-pin-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleEditLivraison(livraison)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded cursor-pointer"
                            title="Modifier"
                          >
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {/* Séparateur visuel entre livraisons et récupérations */}
              {filteredLivraisons.filter(l => l.type === 'Livraison').length > 0 && 
               filteredLivraisons.filter(l => l.type === 'Récupération').length > 0 && (
                <tr>
                  <td colSpan={7} className="py-2">
                    <div className="flex items-center">
                      <div className="flex-grow border-t border-gray-300"></div>
                      <div className="px-4 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full">
                        <i className="ri-arrow-go-back-line mr-1"></i>
                        RÉCUPÉRATIONS
                      </div>
                      <div className="flex-grow border-t border-gray-300"></div>
                    </div>
                  </td>
                </tr>
              )}

              {/* Récupérations ensuite */}
              {filteredLivraisons
                .filter(livraison => livraison.type === 'Récupération')
                .map((livraison) => {
                  const urgence = getUrgenceLevel(livraison.date_prevue, livraison.type);
                  const urgenceClass = {
                    'expired': 'bg-red-50 border-l-4 border-red-500',
                    'urgent': 'bg-orange-50 border-l-4 border-orange-500',
                    'soon': 'bg-yellow-50 border-l-4 border-yellow-500',
                    'normal': ''
                  };

                  return (
                    <tr key={livraison.id} className={`hover:bg-gray-50 ${urgenceClass[urgence]}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(livraison.type)}`}>
                            <i className={`${livraison.type === 'Livraison' ? 'ri-truck-line' : 'ri-arrow-go-back-line'} mr-1`}></i>
                            {livraison.type}
                          </span>
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutBadge(livraison.statut, livraison.type).class}`}>
                              {getStatutBadge(livraison.statut, livraison.type).text}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {livraison.reservations ? (
                          <>
                            <Link 
                              href={`/reservations/${livraison.reservation_id}`}
                              className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                            >
                              {livraison.reservations.ref}
                            </Link>
                            <div className="text-sm text-gray-500">
                              {livraison.reservations.clients?.prenom} {livraison.reservations.clients?.nom}
                            </div>
                            <div className="text-xs text-gray-400">
                              {livraison.reservations.packs?.nom_pack}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Réservation #{livraison.reservation_id}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(livraison.date_prevue).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-sm text-gray-500">{livraison.heure_prevue}</div>
                        {livraison.statut === 'Effectuée' && livraison.date_effective && (
                          <div className="text-xs text-green-600 mt-1">
                            {livraison.type === 'Livraison' ? 'Livrée' : 'Récupérée'}: {new Date(livraison.date_effective).toLocaleDateString('fr-FR')} {livraison.heure_effective}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {livraison.adresse || 'Adresse non définie'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {livraison.code_postal && livraison.code_postal !== '00000' && `${livraison.code_postal} `}{livraison.ville}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {livraison.contact_nom}
                        </div>
                        <div className="text-sm text-gray-500">{livraison.contact_telephone}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {livraison.chauffeur || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {livraison.vehicule || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {livraison.statut === 'Prévue' && (
                            <button
                              onClick={() => updateStatut(livraison.id, 'En cours')}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded cursor-pointer"
                              title="Marquer en cours"
                            >
                              <i className="ri-play-line text-sm"></i>
                            </button>
                          )}
                          {livraison.statut === 'En cours' && (
                            <button
                              onClick={() => updateStatut(livraison.id, 'Effectuée')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                              title={livraison.type === 'Livraison' ? 'Marquer livrée' : 'Marquer récupérée'}
                            >
                              <i className="ri-check-line text-sm"></i>
                            </button>
                          )}
                          {['Prévue', 'En cours'].includes(livraison.statut) && (
                            <button
                              onClick={() => updateStatut(livraison.id, 'Reportée')}
                              className="p-1 text-orange-600 hover:bg-orange-50 rounded cursor-pointer"
                              title="Reporter"
                            >
                              <i className="ri-calendar-schedule-line text-sm"></i>
                            </button>
                          )}
                          <button
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Voir sur carte"
                            onClick={() => {
                              const address = encodeURIComponent(livraison.adresse + ' ' + livraison.ville);
                              window.open(`https://www.google.com/maps/search/${address}`, '_blank');
                            }}
                          >
                            <i className="ri-map-pin-line text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleEditLivraison(livraison)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded cursor-pointer"
                            title="Modifier"
                          >
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {filteredLivraisons.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-truck-line text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">
              {livraisons.length === 0 ? 'Aucune livraison programmée' : 'Aucune livraison ne correspond aux filtres'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Les livraisons sont créées automatiquement à partir des réservations avec options de livraison
            </p>
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      {showEditModal && editingLivraison && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Modifier la livraison</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <select
                    value={editingLivraison.statut}
                    onChange={(e) => setEditingLivraison({...editingLivraison, statut: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm pr-8"
                  >
                    <option value="Prévue">Prévue</option>
                    <option value="En cours">En cours</option>
                    <option value="À récupérer">À récupérer</option>
                    <option value="À livrer">À livrer</option>
                    <option value="Livré">Livré</option>
                    <option value="Récupéré">Récupéré</option>
                    <option value="Pick up client">Pick up client</option>
                    <option value="Retour pick up">Retour pick up</option>
                    <option value="Reportée">Reportée</option>
                    <option value="Annulée">Annulée</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date prévue
                  </label>
                  <input
                    type="date"
                    value={editingLivraison.date_prevue}
                    onChange={(e) => setEditingLivraison({...editingLivraison, date_prevue: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure prévue
                  </label>
                  <input
                    type="time"
                    value={editingLivraison.heure_prevue}
                    onChange={(e) => setEditingLivraison({...editingLivraison, heure_prevue: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <input
                    type="text"
                    value={editingLivraison.contact_nom}
                    onChange={(e) => setEditingLivraison({...editingLivraison, contact_nom: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Nom du contact"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editingLivraison.contact_telephone}
                    onChange={(e) => setEditingLivraison({...editingLivraison, contact_telephone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Numéro de téléphone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chauffeur
                  </label>
                  <input
                    type="text"
                    value={editingLivraison.chauffeur || ''}
                    onChange={(e) => setEditingLivraison({...editingLivraison, chauffeur: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Nom du chauffeur"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Véhicule
                  </label>
                  <input
                    type="text"
                    value={editingLivraison.vehicule || ''}
                    onChange={(e) => setEditingLivraison({...editingLivraison, vehicule: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Véhicule utilisé"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville/Zone
                  </label>
                  <input
                    type="text"
                    value={editingLivraison.ville}
                    onChange={(e) => setEditingLivraison({...editingLivraison, ville: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Ville ou zone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse complète
                </label>
                <textarea
                  value={editingLivraison.adresse}
                  onChange={(e) => setEditingLivraison({...editingLivraison, adresse: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Adresse complète de livraison"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editingLivraison.notes || ''}
                  onChange={(e) => setEditingLivraison({...editingLivraison, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  rows={3}
                  placeholder="Notes et instructions spéciales"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
              >
                <i className="ri-save-line mr-2"></i>
                Sauvegarder
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-pointer"
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
