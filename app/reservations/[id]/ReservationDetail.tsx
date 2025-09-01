
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import StripePaymentManager from '../../components/StripePaymentManager';

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
}

interface Pack {
  id: string;
  nom_pack: string;
  prix_base_ttc: number;
}

interface Reservation {
  id?: string;
  ref?: string;
  client_id: string;
  pack_id: string;
  date_event: string;
  date_fin_event: string;
  heure_event: string;
  heure_fin_event: string;
  ville_zone: string;
  adresse_event?: string;
  statut: string;
  prix_total_ttc: number;
  acompte_du: number;
  acompte_regle: boolean;
  solde_du: number;
  solde_regle: boolean;
  caution_eur: number;
  caution_statut: string;
  caution_retenue_eur: number;
  deadline_paiement: string;
  technicien_necessaire: boolean;
  livraison_aller: boolean;
  livraison_retour: boolean;
  remise_pourcentage: number;
  notes?: string;
  clients?: Client;
  packs?: Pack;
  is_draft: boolean;
}

interface ReservationDetailProps {
  reservationId: string;
}

export default function ReservationDetail({ reservationId }: ReservationDetailProps) {
  const router = useRouter();
  const isNewReservation = reservationId === 'new';
  
  const [loading, setLoading] = useState(!isNewReservation);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [formData, setFormData] = useState<Reservation>({
    client_id: '',
    pack_id: '',
    date_event: '',
    date_fin_event: '',
    heure_event: '14:00',
    heure_fin_event: '18:00',
    ville_zone: 'Paris',
    adresse_event: '',
    statut: 'Confirmée',
    prix_total_ttc: 0,
    acompte_du: 0,
    acompte_regle: false,
    solde_du: 0,
    solde_regle: false,
    caution_eur: 200,
    caution_statut: 'À percevoir',
    caution_retenue_eur: 0,
    deadline_paiement: '',
    technicien_necessaire: false,
    livraison_aller: false,
    livraison_retour: false,
    remise_pourcentage: 0,
    notes: '',
    is_draft: false
  });

  // Auto-save function avec débogage renforcé
  const autoSaveDraft = useCallback(async (data: Reservation) => {
    console.log('🔥 DÉBUT AUTO-SAVE - Données reçues:', {
      client_id: data.client_id,
      pack_id: data.pack_id,
      date_event: data.date_event,
      ville_zone: data.ville_zone,
      prix_total_ttc: data.prix_total_ttc,
      adresse_event: data.adresse_event,
      notes: data.notes,
      hasClientId: !!data.client_id,
      hasPackId: !!data.pack_id,
      hasDateEvent: !!data.date_event,
      hasContent: !!(data.client_id || data.pack_id || data.date_event || data.adresse_event || data.notes || data.prix_total_ttc > 0 || data.ville_zone !== 'Paris')
    });

    // Conditions plus strictes et claires
    const hasClientId = !!data.client_id;
    const hasPackId = !!data.pack_id;
    const hasDateEvent = !!data.date_event;
    const hasAddress = !!data.adresse_event;
    const hasNotes = !!data.notes;
    const hasPriceChange = data.prix_total_ttc > 0;
    const hasZoneChange = data.ville_zone !== 'Paris';
    
    const hasMinimalContent = hasClientId || hasPackId || hasDateEvent || hasAddress || hasNotes || hasPriceChange || hasZoneChange;
    
    console.log('🔍 CONDITIONS AUTO-SAVE:', {
      hasClientId,
      hasPackId,
      hasDateEvent,
      hasAddress,
      hasNotes,
      hasPriceChange,
      hasZoneChange,
      hasMinimalContent,
      FINAL_DECISION: hasMinimalContent ? '✅ SAUVEGARDER' : '❌ PAS DE SAUVEGARDE'
    });
    
    if (!hasMinimalContent) {
      console.log('❌ ARRÊT: Pas de contenu suffisant pour sauvegarder');
      return;
    }

    try {
      setAutoSaveStatus('saving');
      console.log('💾 DÉBUT SAUVEGARDE AUTOMATIQUE...');
      
      const selectedClient = clients.find(client => client.id === data.client_id);
      const fullName = selectedClient ? `${selectedClient.prenom} ${selectedClient.nom}` : '';

      let totalFinal = (data.prix_total_ttc || 0) + getLivraisonCost() + (data.technicien_necessaire ? 80 : 0);
      if (data.remise_pourcentage > 0) {
        totalFinal -= (totalFinal * data.remise_pourcentage) / 100;
      }
      totalFinal = Math.max(0, Math.round(totalFinal * 100) / 100);
      const soldeFinal = Math.max(0, Math.round((totalFinal - (data.acompte_du || 0)) * 100) / 100);

      const draftData = {
        client_id: data.client_id || null,
        pack_id: data.pack_id || null,
        fullName: fullName || null,
        email: selectedClient?.email || null,
        telephone: selectedClient?.telephone || null,
        date_event: data.date_event || null,
        date_fin_event: data.date_fin_event || null,
        heure_event: data.heure_event || '14:00',
        heure_fin_event: data.heure_fin_event || '18:00',
        ville_zone: data.ville_zone || 'Paris',
        adresse_event: data.adresse_event || null,
        statut: 'Brouillon',
        prix_total_ttc: data.prix_total_ttc || 0,
        acompte_du: data.acompte_du || 0,
        acompte_regle: data.acompte_regle || false,
        solde_du: soldeFinal,
        solde_regle: data.solde_regle || false,
        caution_eur: data.caution_eur || 200,
        caution_statut: data.caution_statut || 'À percevoir',
        caution_retenue_eur: data.caution_retenue_eur || 0,
        deadline_paiement: data.deadline_paiement || null,
        technicien_necessaire: data.technicien_necessaire || false,
        livraison_aller: data.livraison_aller || false,
        livraison_retour: data.livraison_retour || false,
        remise_pourcentage: data.remise_pourcentage || 0,
        livraison: data.livraison_aller || data.livraison_retour || false,
        notes: data.notes || null,
        is_draft: true,
        draft_updated_at: new Date().toISOString()
      };

      console.log('📋 DONNÉES BROUILLON PRÉPARÉES:', draftData);

      if (draftId) {
        console.log('🔄 MISE À JOUR brouillon existant:', draftId);
        const { data: updatedDraft, error } = await supabase
          .from('reservations')
          .update(draftData)
          .eq('id', draftId)
          .select()
          .single();

        if (error) {
          console.error('❌ ERREUR mise à jour brouillon:', error);
          throw error;
        }
        console.log('✅ BROUILLON MIS À JOUR:', updatedDraft);
      } else {
        console.log('🆕 CRÉATION nouveau brouillon');
        const { data: newDraft, error } = await supabase
          .from('reservations')
          .insert([draftData])
          .select()
          .single();

        if (error) {
          console.error('❌ ERREUR création brouillon:', error);
          throw error;
        }
        console.log('✅ NOUVEAU BROUILLON CRÉÉ:', newDraft);
        setDraftId(newDraft.id);
      }

      setAutoSaveStatus('saved');
      console.log('🎉 SAUVEGARDE AUTOMATIQUE RÉUSSIE');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('💥 ERREUR CRITIQUE auto-sauvegarde:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [clients, draftId]);

  // Auto-save effect avec délai ultra-court pour les tests
  useEffect(() => {
    if (!isNewReservation) return;

    console.log('⏰ TIMER AUTO-SAVE déclenché avec formData:', formData);

    const timeoutId = setTimeout(() => {
      console.log('🚀 EXÉCUTION AUTO-SAVE après timeout');
      autoSaveDraft(formData);
    }, 500); // 0.5 seconde pour les tests

    return () => {
      console.log('⏹️ ANNULATION timer auto-save');
      clearTimeout(timeoutId);
    };
  }, [formData, isNewReservation, autoSaveDraft]);

  // Charger un brouillon existant si disponible
  useEffect(() => {
    if (isNewReservation) {
      checkForExistingDraft();
    }
  }, []);

  const checkForExistingDraft = async () => {
    try {
      console.log('🔍 RECHERCHE de brouillons existants...');
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .or('is_draft.eq.true,statut.eq.Brouillon')
        .order('draft_updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Erreur recherche brouillons:', error);
        throw error;
      }

      console.log('📋 BROUILLONS TROUVÉS:', data);

      if (data && data.length > 0) {
        const draftOptions = data.map((draft, index) => {
          const clientInfo = draft.fullName || draft.client_id || 'Client non défini';
          const dateInfo = draft.date_event ? new Date(draft.date_event).toLocaleDateString('fr-FR') : 'Date non définie';
          const updateTime = draft.draft_updated_at ? 
            new Date(draft.draft_updated_at).toLocaleString('fr-FR') : 
            new Date(draft.created_at).toLocaleString('fr-FR');
          const packInfo = draft.pack_id ? 'Pack sélectionné' : 'Pas de pack';
          const priceInfo = draft.prix_total_ttc > 0 ? `${draft.prix_total_ttc}€` : 'Pas de prix';
          
          return `${index + 1}. ${clientInfo} - ${dateInfo} - ${packInfo} - ${priceInfo}\n   Modifié: ${updateTime}`;
        }).join('\n\n');

        const shouldResume = confirm(
          `🔄 ${data.length} brouillon(s) trouvé(s) :\n\n${draftOptions}\n\n✅ Voulez-vous reprendre le plus récent ?\n❌ Cliquez "Annuler" pour commencer une nouvelle réservation`
        );
        
        if (shouldResume) {
          const draft = data[0];
          console.log('📥 CHARGEMENT du brouillon:', draft);
          setDraftId(draft.id);
          
          setFormData(prev => ({
            ...prev,
            client_id: draft.client_id || '',
            pack_id: draft.pack_id || '',
            date_event: draft.date_event ? draft.date_event.split('T')[0] : '',
            date_fin_event: draft.date_fin_event ? draft.date_fin_event.split('T')[0] : '',
            heure_event: draft.heure_event || '14:00',
            heure_fin_event: draft.heure_fin_event || '18:00',
            ville_zone: draft.ville_zone || 'Paris',
            adresse_event: draft.adresse_event || '',
            prix_total_ttc: draft.prix_total_ttc || 0,
            acompte_du: draft.acompte_du || 0,
            acompte_regle: draft.acompte_regle || false,
            solde_du: draft.solde_du || 0,
            solde_regle: draft.solde_regle || false,
            caution_eur: draft.caution_eur || 200,
            caution_statut: draft.caution_statut || 'À percevoir',
            caution_retenue_eur: draft.caution_retenue_eur || 0,
            deadline_paiement: draft.deadline_paiement ? draft.deadline_paiement.split('T')[0] : '',
            technicien_necessaire: draft.technicien_necessaire || false,
            livraison_aller: draft.livraison_aller || false,
            livraison_retour: draft.livraison_retour || false,
            remise_pourcentage: draft.remise_pourcentage || 0,
            notes: draft.notes || '',
            statut: 'Brouillon',
            is_draft: true
          }));

          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
          console.log('✅ Brouillon chargé avec succès');
        } else {
          console.log('❌ Utilisateur a choisi de ne pas reprendre le brouillon');
        }
      } else {
        console.log('📭 Aucun brouillon trouvé');
      }
    } catch (error) {
      console.error('💥 Erreur lors de la vérification des brouillons:', error);
    }
  };

  useEffect(() => {
    fetchInitialData();
    if (!isNewReservation) {
      fetchReservation();
    }
  }, [reservationId]);

  useEffect(() => {
    calculateAmounts();
  }, [formData.prix_total_ttc, formData.livraison_aller, formData.livraison_retour, formData.ville_zone, formData.technicien_necessaire, formData.remise_pourcentage, formData.acompte_du, formData.acompte_regle, formData.caution_statut, formData.caution_retenue_eur]);

  useEffect(() => {
    calculateDeadline();
  }, [formData.date_event]);

  const fetchInitialData = async () => {
    try {
      const [clientsResponse, packsResponse] = await Promise.all([
        supabase.from('clients').select('*').order('nom'),
        supabase.from('packs').select('*').order('nom_pack')
      ]);

      if (clientsResponse.error) throw clientsResponse.error;
      if (packsResponse.error) throw packsResponse.error;

      setClients(clientsResponse.data || []);
      setPacks(packsResponse.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  const fetchReservation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          clients (*),
          packs (*)
        `)
        .eq('id', reservationId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          ...data,
          date_event: data.date_event.split('T')[0],
          date_fin_event: data.date_fin_event || null,
          heure_fin_event: data.heure_fin_event || '18:00',
          adresse_event: data.adresse_event || '',
          notes: data.notes || '',
          remise_pourcentage: data.remise_pourcentage || 0,
          caution_retenue_eur: data.caution_retenue_eur || 0,
          livraison_aller: data.livraison_aller || data.livraison || false,
          livraison_retour: data.livraison_retour || data.livraison || false
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la réservation:', error);
      router.push('/reservations');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmounts = () => {
    let total = formData.prix_total_ttc;

    // Calcul des frais de livraison
    const livraisonCost = getLivraisonCost();
    total += livraisonCost;

    // Ajouter les frais de technicien
    if (formData.technicien_necessaire) {
      total += 80;
    }

    // Ajouter la caution partiellement retenue au total
    if (formData.caution_statut === 'Partiellement retenue' && formData.caution_retenue_eur > 0) {
      total += formData.caution_retenue_eur;
    }

    // Appliquer la remise
    if (formData.remise_pourcentage > 0) {
      const remiseAmount = (total * formData.remise_pourcentage) / 100;
      total -= remiseAmount;
    }

    // Arrondir le total et s'assurer qu'il est positif
    total = Math.max(0, Math.round(total * 100) / 100);
    
    // Calculer le solde : total moins l'acompte défini
    let solde = total - formData.acompte_du;
    
    // Si l'acompte réglé est coché, soustraire l'acompte du solde
    if (formData.acompte_regle) {
      solde = Math.max(0, solde);
    } else {
      solde = total - formData.acompte_du;
    }

    setFormData(prev => ({
      ...prev,
      solde_du: Math.max(0, Math.round(solde * 100) / 100)
    }));
  };

  const getLivraisonCost = () => {
    if (formData.ville_zone === 'Retrait agence') return 0;
    
    let cost = 0;
    const isParis = formData.ville_zone === 'Paris';
    const unitPrice = isParis ? 40 : 80;
    
    if (formData.livraison_aller) cost += unitPrice;
    if (formData.livraison_retour) cost += unitPrice;
    
    return cost;
  };

  const calculateDeadline = () => {
    if (formData.date_event) {
      const eventDate = new Date(formData.date_event);
      const deadline = new Date(eventDate);
      deadline.setHours(deadline.getHours() - 72);
      
      setFormData(prev => ({
        ...prev,
        deadline_paiement: deadline.toISOString().split('T')[0]
      }));
    }
  };

  const handlePackChange = (packId: string) => {
    const selectedPack = packs.find(p => p.id === packId);
    if (selectedPack) {
      setFormData(prev => ({
        ...prev,
        pack_id: packId,
        prix_total_ttc: selectedPack.prix_base_ttc
      }));
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

  // Améliorer le handleSubmit pour gérer les brouillons ET déclencher toutes les synchronisations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs obligatoires
    if (!formData.client_id || !formData.pack_id || !formData.date_event || !formData.heure_event) {
      alert('Veuillez remplir tous les champs obligatoires (Client, Pack, Date et Heure)');
      return;
    }

    // Validation des dates
    if (formData.date_fin_event && formData.date_event && formData.date_fin_event < formData.date_event) {
      alert('La date de fin doit être postérieure à la date de début');
      return;
    }

    // Validation des heures
    if (formData.heure_fin_event && formData.heure_event && formData.heure_fin_event <= formData.heure_event && (!formData.date_fin_event || formData.date_fin_event === formData.date_event)) {
      alert('L\'heure de fin doit être postérieure à l\'heure de début pour un événement sur la même journée');
      return;
    }

    // Validation des montants
    if (formData.prix_total_ttc < 0 || formData.acompte_du < 0 || formData.solde_du < 0) {
      alert('Les montants ne peuvent pas être négatifs');
      return;
    }

    setSaving(true);

    try {
      // Récupérer le client sélectionné COMPLET avec toutes ses données
      const selectedClient = clients.find(client => client.id === formData.client_id);
      if (!selectedClient) {
        alert('Client sélectionné non trouvé');
        setSaving(false);
        return;
      }

      const fullName = `${selectedClient.prenom} ${selectedClient.nom}`;

      // Recalculer les montants finaux pour être sûr
      let totalFinal = formData.prix_total_ttc + getLivraisonCost() + (formData.technicien_necessaire ? 80 : 0);
      if (formData.remise_pourcentage > 0) {
        totalFinal -= (totalFinal * formData.remise_pourcentage) / 100;
      }
      totalFinal = Math.max(0, Math.round(totalFinal * 100) / 100);
      
      // Le solde est maintenant calculé automatiquement
      const soldeFinal = Math.max(0, Math.round((totalFinal - formData.acompte_du) * 100) / 100);

      // Générer une référence unique si ce n'est pas déjà fait
      let reservationRef = formData.ref;
      if (!reservationRef || reservationRef === 'N/A') {
        reservationRef = await generateReservationRef();
      }

      const reservationData = {
        ref: reservationRef,
        client_id: formData.client_id,
        pack_id: formData.pack_id,
        fullName: fullName,
        email: selectedClient.email,
        telephone: selectedClient.telephone,
        date_event: formData.date_event,
        date_fin_event: formData.date_fin_event || null,
        heure_event: formData.heure_event,
        heure_fin_event: formData.heure_fin_event || null,
        ville_zone: formData.ville_zone,
        adresse_event: formData.adresse_event || null,
        statut: formData.statut,
        prix_total_ttc: formData.prix_total_ttc,
        acompte_du: formData.acompte_du,
        acompte_regle: formData.acompte_regle,
        solde_du: soldeFinal,
        solde_regle: formData.solde_regle,
        caution_eur: Math.max(0, formData.caution_eur),
        caution_statut: formData.caution_statut,
        caution_retenue_eur: formData.caution_statut === 'Partiellement retenue' ? Math.max(0, Math.min(formData.caution_retenue_eur, formData.caution_eur)) : 0,
        deadline_paiement: formData.deadline_paiement,
        technicien_necessaire: formData.technicien_necessaire,
        livraison_aller: formData.livraison_aller,
        livraison_retour: formData.livraison_retour,
        remise_pourcentage: Math.max(0, Math.min(100, formData.remise_pourcentage)),
        livraison: formData.livraison_aller || formData.livraison_retour,
        notes: formData.notes || null,
        is_draft: false
      };

      console.log('💾 Données réservation finale à sauvegarder:', reservationData);

      let savedReservation: any;

      if (isNewReservation) {
        let insertResult;
        
        if (draftId) {
          // Mettre à jour le brouillon existant
          console.log('🔄 Conversion du brouillon en réservation finale:', draftId);
          const { data, error } = await supabase
            .from('reservations')
            .update(reservationData)
            .eq('id', draftId)
            .select()
            .single();

          if (error) throw error;
          insertResult = data;
          console.log('✅ Brouillon converti:', insertResult);
        } else {
          // Créer une nouvelle réservation
          console.log('🆕 Création d\'une nouvelle réservation');
          const { data, error } = await supabase
            .from('reservations')
            .insert([reservationData])
            .select()
            .single();

          if (error) throw error;
          insertResult = data;
          console.log('✅ Nouvelle réservation créée:', insertResult);
        }
        
        savedReservation = insertResult;
        
        // 🚀 SYNCHRONISATION AUTOMATIQUE COMPLÈTE RENFORCÉE
        console.log('🔄 Démarrage synchronisation automatique complète...');
        
        try {
          // 1. CRÉER LES PAIEMENTS AUTOMATIQUEMENT SI COCHÉS
          const paymentsToCreate = [];
          
          console.log('💰 Vérification des paiements à créer:', {
            acompte_regle: savedReservation.acompte_regle,
            acompte_du: savedReservation.acompte_du,
            solde_regle: savedReservation.solde_regle,
            solde_du: savedReservation.solde_du
          });
          
          // Créer automatiquement le paiement d'acompte si marqué comme réglé ET montant > 0
          if (savedReservation.acompte_regle && savedReservation.acompte_du > 0) {
            paymentsToCreate.push({
              reservation_id: savedReservation.id,
              type: 'Acompte',
              montant_eur: savedReservation.acompte_du,
              moyen: 'CB',
              date_paiement: new Date().toISOString().split('T')[0],
              notes: `Acompte créé automatiquement lors de la sauvegarde de la réservation ${savedReservation.ref}`
            });
            console.log(`➕ Paiement acompte à créer: ${savedReservation.acompte_du}€`);
          }
          
          // Créer automatiquement le paiement du solde si marqué comme réglé ET montant > 0
          if (savedReservation.solde_regle && savedReservation.solde_du > 0) {
            paymentsToCreate.push({
              reservation_id: savedReservation.id,
              type: 'Solde',
              montant_eur: savedReservation.solde_du,
              moyen: 'CB',
              date_paiement: new Date().toISOString().split('T')[0],
              notes: `Solde créé automatiquement lors de la sauvegarde de la réservation ${savedReservation.ref}`
            });
            console.log(`➕ Paiement solde à créer: ${savedReservation.solde_du}€`);
          }
          
          // Insérer tous les paiements en une fois
          if (paymentsToCreate.length > 0) {
            console.log('💾 Insertion des paiements:', paymentsToCreate);
            
            const { data: createdPayments, error: paymentsError } = await supabase
              .from('paiements')
              .insert(paymentsToCreate)
              .select();
              
            if (paymentsError) {
              console.error('❌ Erreur création paiements automatiques:', paymentsError);
              // Afficher l'erreur spécifique pour débugger
              alert(`Erreur lors de la création des paiements automatiques: ${paymentsError.message || paymentsError.details || paymentsError}`);
            } else {
              console.log(`✅ ${paymentsToCreate.length} paiement(s) créé(s) automatiquement:`, createdPayments);
            }
          } else {
            console.log('ℹ️ Aucun paiement à créer automatiquement');
          }
          
          // 2. CRÉER LES LIVRAISONS AUTOMATIQUEMENT
          await syncLivraisonsForReservation(savedReservation);
          
          // 3. SYNCHRONISER LES CALENDRIERS (si configurés)
          await syncCalendarForReservation(savedReservation);
          
          console.log('✅ Synchronisation automatique complète terminée avec succès');
          
          // 4. DÉCLENCHER LES ÉVÉNEMENTS DE SYNCHRONISATION
          console.log('📡 Déclenchement des événements de synchronisation...');
          window.dispatchEvent(new CustomEvent('reservation-updated', {
            detail: { 
              reservationId: savedReservation.id, 
              action: 'create',
              hasPayments: paymentsToCreate.length > 0,
              hasLivraisons: savedReservation.livraison_aller || savedReservation.livraison_retour
            }
          }));
          
          window.dispatchEvent(new CustomEvent('reservation-payment-updated', {
            detail: { 
              reservationId: savedReservation.id,
              paymentsCreated: paymentsToCreate.length
            }
          }));
          
          window.dispatchEvent(new CustomEvent('livraisons-updated', {
            detail: { 
              reservationId: savedReservation.id
            }
          }));
          
          console.log('📡 Événements de synchronisation déclenchés');
          
        } catch (syncError: any) {
          console.error('⚠️ Erreur lors de la synchronisation automatique:', syncError);
          // Afficher un avertissement mais ne pas bloquer l'utilisateur
          alert(`Réservation créée avec succès, mais erreur de synchronisation automatique: ${syncError.message || 'Erreur inconnue'}`);
        }
        
        // Rediriger après un petit délai pour laisser le temps aux événements de se propager
        setTimeout(() => {
          router.push(`/reservations/${savedReservation.id}`);
        }, 1500); // Augmenté à 1.5 seconde
        
      } else {
        // Pour une modification de réservation existante
        const oldReservation = { ...formData };
        
        const { error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', reservationId);

        if (error) throw error;
        
        console.log('✅ Réservation mise à jour');
        
        // 🚀 SYNCHRONISATION POUR LES MODIFICATIONS RENFORCÉE
        try {
          // Vérifier si des changements de statut de paiement ont eu lieu
          if (oldReservation.acompte_regle !== formData.acompte_regle && formData.acompte_regle) {
            // L'acompte vient d'être marqué comme réglé
            const { data: existingAcompte } = await supabase
              .from('paiements')
              .select('id')
              .eq('reservation_id', reservationId)
              .eq('type', 'Acompte')
              .single();
              
            if (!existingAcompte && formData.acompte_du > 0) {
              console.log('💰 Création paiement acompte lors de la modification');
              const { data: createdPayment, error: paymentError } = await supabase
                .from('paiements')
                .insert([{
                  reservation_id: reservationId,
                  type: 'Acompte',
                  montant_eur: formData.acompte_du,
                  moyen: 'CB',
                  date_paiement: new Date().toISOString().split('T')[0],
                  notes: `Acompte créé lors de la modification de la réservation ${formData.ref}`
                }])
                .select()
                .single();
                
              if (paymentError) {
                console.error('❌ Erreur création paiement acompte:', paymentError);
                alert(`Erreur lors de la création du paiement acompte: ${paymentError.message}`);
              } else {
                console.log(`✅ Paiement acompte créé lors de la modification: ${formData.acompte_du}€`, createdPayment);
              }
            }
          }
          
          if (oldReservation.solde_regle !== formData.solde_regle && formData.solde_regle) {
            // Le solde vient d'être marqué comme réglé
            const { data: existingSolde } = await supabase
              .from('paiements')
              .select('id')
              .eq('reservation_id', reservationId)
              .eq('type', 'Solde')
              .single();
              
            if (!existingSolde && formData.solde_du > 0) {
              console.log('💰 Création paiement solde lors de la modification');
              const { data: createdPayment, error: paymentError } = await supabase
                .from('paiements')
                .insert([{
                  reservation_id: reservationId,
                  type: 'Solde',
                  montant_eur: formData.solde_du,
                  moyen: 'CB',
                  date_paiement: new Date().toISOString().split('T')[0],
                  notes: `Solde créé lors de la modification de la réservation ${formData.ref}`
                }])
                .select()
                .single();
                
              if (paymentError) {
                console.error('❌ Erreur création paiement solde:', paymentError);
                alert(`Erreur lors de la création du paiement solde: ${paymentError.message}`);
              } else {
                console.log(`✅ Paiement solde créé lors de la modification: ${formData.solde_du}€`, createdPayment);
              }
            }
          }
          
          const updatedReservation = { ...reservationData, id: reservationId };
          await syncLivraisonsForReservation(updatedReservation);
          await syncCalendarForReservation(updatedReservation);
          
          // Déclencher les événements de synchronisation
          window.dispatchEvent(new CustomEvent('reservation-updated', {
            detail: { reservationId: reservationId, action: 'update' }
          }));
          
          window.dispatchEvent(new CustomEvent('reservation-payment-updated', {
            detail: { reservationId: reservationId, action: 'update' }
          }));
          
        } catch (syncError) {
          console.error('⚠️ Erreur sync après modification:', syncError);
        }
        
        await fetchReservation();
      }
      
    } catch (error) {
      console.error('💥 Erreur lors de la sauvegarde:', error);
      
      // Message d'erreur plus détaillé
      let errorMessage = 'Erreur lors de la sauvegarde';
      if ((error as any).message) {
        errorMessage += ': ' + (error as any).message;
      }
      if ((error as any).details) {
        errorMessage += ' - ' + (error as any).details;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // 🚀 Nouvelle fonction de synchronisation des livraisons pour une réservation
  const syncLivraisonsForReservation = async (reservation: any) => {
    try {
      console.log('📦 Synchronisation livraisons pour:', reservation.ref);
      
      // Vérifier si des livraisons existent déjà pour cette réservation
      const { data: existingLivraisons } = await supabase
        .from('livraisons')
        .select('id, type')
        .eq('reservation_id', reservation.id);
      
      const hasLivraisonAller = existingLivraisons?.some(l => l.type === 'Livraison');
      const hasLivraisonRetour = existingLivraisons?.some(l => l.type === 'Récupération');
      
      const newLivraisons = [];
      
      // Données de base pour les livraisons
      const baseData = {
        reservation_id: reservation.id,
        date_prevue: reservation.date_event,
        heure_prevue: reservation.heure_event?.substring(0,5) || '14:00',
        adresse: reservation.adresse_event || '',
        ville: reservation.ville_zone || '',
        contact_nom: reservation.fullName || 'Client',
        contact_telephone: reservation.telephone || '',
        statut: 'Prévue' as const,
        code_postal: '00000',
        notes: `Pack: ${packs.find(p => p.id === reservation.pack_id)?.nom_pack || 'N/A'} | Réf: ${reservation.ref || 'N/A'}`
      };
      
      // Créer livraison aller si nécessaire
      if (reservation.livraison_aller && !hasLivraisonAller) {
        newLivraisons.push({
          ...baseData,
          type: 'Livraison' as const,
          notes: `${baseData.notes} | Livraison aller vers ${reservation.ville_zone || ''}`
        });
        console.log('➕ Livraison aller à créer');
      }
      
      // Créer livraison retour si nécessaire
      if (reservation.livraison_retour && !hasLivraisonRetour) {
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
          heure_prevue: '10:00',
          notes: `${baseData.notes} | Récupération retour depuis ${reservation.ville_zone || ''}`
        });
        console.log('➕ Récupération à créer');
      }
      
      // Insérer les nouvelles livraisons
      if (newLivraisons.length > 0) {
        const { error } = await supabase
          .from('livraisons')
          .insert(newLivraisons);
          
        if (error) throw error;
        console.log(`✅ ${newLivraisons.length} livraisons créées automatiquement`);
      }
      
      // Supprimer les livraisons qui ne sont plus nécessaires
      const toDelete = [];
      if (!reservation.livraison_aller && hasLivraisonAller) {
        toDelete.push('Livraison');
      }
      if (!reservation.livraison_retour && hasLivraisonRetour) {
        toDelete.push('Récupération');
      }
      
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('livraisons')
          .delete()
          .eq('reservation_id', reservation.id)
          .in('type', toDelete);
          
        if (error) throw error;
        console.log(`🗑️ ${toDelete.length} livraisons supprimées automatiquement`);
      }
      
    } catch (error) {
      console.error('❌ Erreur sync livraisons:', error);
      throw error;
    }
  };

  // 🚀 Nouvelle fonction de synchronisation calendrier pour une réservation
  const syncCalendarForReservation = async (reservation: any) => {
    try {
      console.log('📅 Synchronisation calendrier pour:', reservation.ref);
      
      // Vérifier si des paramètres de calendrier sont configurés
      const calendarSettings = localStorage.getItem('calendar-sync-settings');
      if (!calendarSettings) {
        console.log('ℹ️ Pas de paramètres calendrier configurés');
        return;
      }
      
      const settings = JSON.parse(calendarSettings);
      if (!settings.autoSync) {
        console.log('ℹ️ Synchronisation automatique calendrier désactivée');
        return;
      }
      
      // Déclencher la synchronisation des calendriers connectés
      const promises = [];
      
      if (settings.googleEnabled && settings.googleAccessToken) {
        promises.push(syncSingleReservationToGoogle(reservation, settings.googleAccessToken));
      }
      
      if (settings.outlookEnabled && settings.outlookAccessToken) {
        promises.push(syncSingleReservationToOutlook(reservation, settings.outlookAccessToken));
      }
      
      await Promise.all(promises);
      console.log('✅ Calendriers synchronisés');
      
    } catch (error) {
      console.error('❌ Erreur sync calendrier:', error);
      // Ne pas faire échouer toute l'opération pour une erreur de calendrier
    }
  };

  // Fonction pour synchroniser une réservation vers Google Calendar
  const syncSingleReservationToGoogle = async (reservation: any, accessToken: string) => {
    try {
      const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!calendarsResponse.ok) return;
      
      const calendarsData = await calendarsResponse.json();
      let soundrentCalendar = calendarsData.items.find((cal: any) => cal.summary === 'SoundRent Réservations');
      
      if (!soundrentCalendar) {
        const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: 'SoundRent Réservations',
            description: 'Calendrier automatique des réservations SoundRent'
          })
        });
        
        if (createResponse.ok) {
          soundrentCalendar = await createResponse.json();
        }
      }
      
      if (soundrentCalendar) {
        const startDate = new Date(`${reservation.date_event}T${reservation.heure_event || '14:00'}`);
        const endDate = reservation.heure_fin_event 
          ? new Date(`${reservation.date_fin_event || reservation.date_event}T${reservation.heure_fin_event}`)
          : new Date(startDate.getTime() + 4 * 60 * 60 * 1000);
        
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${soundrentCalendar.id}/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: `${reservation.ref} - ${reservation.fullName}`,
            description: `Pack: ${packs.find(p => p.id === reservation.pack_id)?.nom_pack || 'Pack'}
Statut: ${reservation.statut}
Zone: ${reservation.ville_zone}
${reservation.adresse_event ? `Adresse: ${reservation.adresse_event}` : ''}
${reservation.notes ? `Notes: ${reservation.notes}` : ''}

SoundRent-ID: ${reservation.id}`,
            location: reservation.adresse_event || reservation.ville_zone || '',
            start: {
              dateTime: startDate.toISOString(),
              timeZone: 'Europe/Paris'
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: 'Europe/Paris'
            },
            colorId: reservation.statut === 'Soldée' ? '10' : 
                    reservation.statut === 'Acompte payé' ? '5' : '1'
          })
        });
      }
    } catch (error) {
      console.error('❌ Erreur sync Google:', error);
    }
  };

  // Fonction pour synchroniser une réservation vers Outlook
  const syncSingleReservationToOutlook = async (reservation: any, accessToken: string) => {
    try {
      const calendarsResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!calendarsResponse.ok) return;
      
      const calendarsData = await calendarsResponse.json();
      let soundrentCalendar = calendarsData.value.find((cal: any) => cal.name === 'SoundRent Réservations');
      
      if (!soundrentCalendar) {
        const createResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'SoundRent Réservations'
          })
        });
        
        if (createResponse.ok) {
          soundrentCalendar = await createResponse.json();
        }
      }
      
      if (soundrentCalendar) {
        const startDate = new Date(`${reservation.date_event}T${reservation.heure_event || '14:00'}`);
        const endDate = reservation.heure_fin_event 
          ? new Date(`${reservation.date_fin_event || reservation.date_event}T${reservation.heure_fin_event}`)
          : new Date(startDate.getTime() + 4 * 60 * 60 * 1000);
        
        await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${soundrentCalendar.id}/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject: `${reservation.ref} - ${reservation.fullName}`,
            body: {
              contentType: 'text',
              content: `Pack: ${packs.find(p => p.id === reservation.pack_id)?.nom_pack || 'Pack'}
Statut: ${reservation.statut}
Zone: ${reservation.ville_zone}
${reservation.adresse_event ? `Adresse: ${reservation.adresse_event}` : ''}
${reservation.notes ? `Notes: ${reservation.notes}` : ''}

SoundRent-ID: ${reservation.id}`
            },
            location: {
              displayName: reservation.adresse_event || reservation.ville_zone || ''
            },
            start: {
              dateTime: startDate.toISOString(),
              timeZone: 'Europe/Paris'
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: 'Europe/Paris'
            }
          })
        });
      }
    } catch (error) {
      console.error('❌ Erreur sync Outlook:', error);
    }
  };

  // 🚀 Nouvelle fonction pour créer les liens de paiement initiaux si nécessaire
  const createInitialPaymentLinksIfNeeded = async (reservation: any) => {
    try {
      console.log('💳 Vérification création liens de paiement pour:', reservation.ref);
      
      // Ne créer des liens que si les montants sont supérieurs à 0
      if (reservation.acompte_du <= 0 && reservation.solde_du <= 0) {
        console.log('ℹ️ Pas de montants à payer, pas de liens créés');
        return;
      }
      
      // Vérifier si des liens existent déjà
      const { data: existingLinks } = await supabase
        .from('stripe_payment_links')
        .select('payment_type')
        .eq('reservation_id', reservation.id);
      
      const hasAcompteLink = existingLinks?.some(l => l.payment_type === 'Acompte');
      const hasSoldeLink = existingLinks?.some(l => l.payment_type === 'Solde');
      
      // Si le statut est Confirmée et qu'il y a un acompte à payer, créer le lien automatiquement
      if (reservation.statut === 'Confirmée' && reservation.acompte_du > 0 && !reservation.acompte_regle && !hasAcompteLink) {
        console.log('💳 Création automatique du lien de paiement acompte');
        // Ici on pourrait appeler directement la fonction edge de création de lien
        // Pour l'instant on log juste l'intention
        console.log(`→ Acompte de ${reservation.acompte_du}€ pour ${reservation.fullName}`);
      }
      
    } catch (error) {
      console.error('❌ Erreur création liens paiement:', error);
      // Ne pas faire échouer l'opération principale
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', formData.id);

      if (error) throw error;
      router.push('/reservations');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
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
    return styles[statut] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec indicateur de sauvegarde */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/reservations"
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNewReservation ? 'Nouvelle réservation' : `Réservation ${formData.ref}`}
            </h1>
            {!isNewReservation && (
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutBadge(formData.statut)}`}>
                  {formData.statut}
                </span>
                <span className="text-sm text-gray-500">
                  Créée le {formData.id ? new Date().toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
            )}
            {/* Indicateur de sauvegarde automatique */}
            {isNewReservation && (
              <div className="flex items-center space-x-2 mt-1">
                {autoSaveStatus === 'saving' && (
                  <span className="text-xs text-orange-600 flex items-center">
                    <i className="ri-loader-4-line animate-spin mr-1"></i>
                    Sauvegarde...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-xs text-green-600 flex items-center">
                    <i className="ri-check-line mr-1"></i>
                    Brouillon sauvegardé
                  </span>
                )}
                {autoSaveStatus === 'error' && (
                  <span className="text-xs text-red-600 flex items-center">
                    <i className="ri-error-warning-line mr-1"></i>
                    Erreur de sauvegarde
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {!isNewReservation && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-delete-bin-line mr-2"></i>
              Supprimer
            </button>
          )}
          <button
            form="reservation-form"
            type="submit"
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {saving ? (
              <i className="ri-loader-4-line animate-spin mr-2"></i>
            ) : (
              <i className="ri-save-line mr-2"></i>
            )}
            {isNewReservation ? 'Créer' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <form id="reservation-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                <option value="">Sélectionner un client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.prenom} {client.nom} - {client.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pack *
              </label>
              <select
                required
                value={formData.pack_id}
                onChange={(e) => handlePackChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                <option value="">Sélectionner un pack</option>
                {packs.map(pack => (
                  <option key={pack.id} value={pack.id}>
                    {pack.nom_pack} - {pack.prix_base_ttc.toLocaleString()} €
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({...formData, statut: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                <option value="Confirmée">Confirmée</option>
                <option value="Acompte payé">Acompte payé</option>
                <option value="Soldée">Soldée</option>
                <option value="Annulée">Annulée</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début de l'événement *
              </label>
              <input
                type="date"
                required
                value={formData.date_event}
                onChange={(e) => setFormData({...formData, date_event: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin de l'événement
              </label>
              <input
                type="date"
                value={formData.date_fin_event || ''}
                onChange={(e) => setFormData({...formData, date_fin_event: e.target.value})}
                min={formData.date_event}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <div className="mt-1 text-xs text-gray-500">
                Optionnel - pour les événements sur plusieurs jours
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de début *
              </label>
              <input
                type="time"
                required
                value={formData.heure_event}
                onChange={(e) => setFormData({...formData, heure_event: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure de fin
              </label>
              <input
                type="time"
                value={formData.heure_fin_event || ''}
                onChange={(e) => setFormData({...formData, heure_fin_event: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <div className="mt-1 text-xs text-gray-500">
                Optionnel - définit la durée de l'événement
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone *
              </label>
              <select
                value={formData.ville_zone}
                onChange={(e) => setFormData({...formData, ville_zone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                <option value="Paris">Paris</option>
                <option value="Hors Paris">Hors Paris</option>
                <option value="Retrait agence">Retrait agence</option>
              </select>
            </div>
          </div>

          {formData.ville_zone !== 'Retrait agence' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse de l'événement
              </label>
              <textarea
                value={formData.adresse_event}
                onChange={(e) => setFormData({...formData, adresse_event: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                rows={2}
                placeholder="Adresse complète de livraison..."
              />
            </div>
          )}
        </div>

        {/* Tarification */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tarification</h2>
          
          {/* Détail des coûts */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Détail des coûts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pack de base:</span>
                <span className="font-medium">{formData.prix_total_ttc.toLocaleString()} €</span>
              </div>
              
              {(formData.livraison_aller || formData.livraison_retour) && formData.ville_zone !== 'Retrait agence' && (
                <>
                  {formData.livraison_aller && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Livraison aller {formData.ville_zone}:
                      </span>
                      <span className="font-medium">
                        {formData.ville_zone === 'Paris' ? '40' : '80'} €
                      </span>
                    </div>
                  )}
                  {formData.livraison_retour && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Livraison retour {formData.ville_zone}:
                      </span>
                      <span className="font-medium">
                        {formData.ville_zone === 'Paris' ? '40' : '80'} €
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {formData.technicien_necessaire && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Installation technicien:</span>
                  <span className="font-medium">80 €</span>
                </div>
              )}

              {formData.caution_statut === 'Partiellement retenue' && formData.caution_retenue_eur > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Caution retenue:</span>
                  <span className="font-medium">+{formData.caution_retenue_eur.toLocaleString()} €</span>
                </div>
              )}
              
              {formData.remise_pourcentage > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Remise ({formData.remise_pourcentage}%):</span>
                  <span className="font-medium">
                    -{Math.round(((formData.prix_total_ttc + getLivraisonCost() + (formData.technicien_necessaire ? 80 : 0) + (formData.caution_statut === 'Partiellement retenue' ? formData.caution_retenue_eur : 0)) * formData.remise_pourcentage) / 100).toLocaleString()} €
                  </span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-2 mt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">Total TTC:</span>
                  <span className="text-gray-900">
                    {(() => {
                      let total = formData.prix_total_ttc + getLivraisonCost() + (formData.technicien_necessaire ? 80 : 0);
                      if (formData.caution_statut === 'Partiellement retenue' && formData.caution_retenue_eur > 0) {
                        total += formData.caution_retenue_eur;
                      }
                      if (formData.remise_pourcentage > 0) {
                        total -= (total * formData.remise_pourcentage) / 100;
                      }
                      return Math.round(total).toLocaleString();
                    })()} €
                  </span>
                </div>
                
                {/* Répartition acompte/solde */}
                <div className="border-t border-gray-300 pt-1 mt-1 space-y-1">
                  <div className="flex justify-between text-orange-700 font-medium">
                    <span>Acompte {formData.acompte_regle ? '(réglé)' : '(dû)'}:</span>
                    <span className={formData.acompte_regle ? 'line-through text-gray-500' : ''}>
                      {formData.acompte_du.toLocaleString()} €
                    </span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-medium">
                    <span>Solde restant:</span>
                    <span>{formData.solde_du.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between text-purple-700 font-medium">
                    <span>Caution:</span>
                    <span>+{formData.caution_eur.toLocaleString()} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix pack de base (€) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.prix_total_ttc}
                onChange={(e) => setFormData({...formData, prix_total_ttc: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remise (%)
              </label>
              <input
                type="text"
                min="0"
                max="100"
                value={formData.remise_pourcentage.toString().replace('.', ',')}
                onChange={(e) => {
                  const value = e.target.value.replace(',', '.');
                  const numValue = parseFloat(value) || 0;
                  if (numValue >= 0 && numValue <= 100) {
                    setFormData({...formData, remise_pourcentage: numValue});
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Acompte (€) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.acompte_du}
                onChange={(e) => setFormData({...formData, acompte_du: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                placeholder="Montant en euros"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solde dû (€)
              </label>
              <input
                type="number"
                readOnly
                value={formData.solde_du}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caution (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.caution_eur}
                onChange={(e) => setFormData({...formData, caution_eur: parseFloat(e.target.value) || 0})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="acompte_regle"
                checked={formData.acompte_regle}
                onChange={(e) => setFormData({...formData, acompte_regle: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="acompte_regle" className="ml-2 block text-sm text-gray-700">
                Acompte réglé
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="solde_regle"
                checked={formData.solde_regle}
                onChange={(e) => setFormData({...formData, solde_regle: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="solde_regle" className="ml-2 block text-sm text-gray-700">
                Solde réglé
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut caution
              </label>
              <select
                value={formData.caution_statut}
                onChange={(e) => setFormData({...formData, caution_statut: e.target.value, caution_retenue_eur: e.target.value !== 'Partiellement retenue' ? 0 : formData.caution_retenue_eur})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm pr-8"
              >
                <option value="À percevoir">À percevoir</option>
                <option value="Reçue">Reçue</option>
                <option value="Restituée">Restituée</option>
                <option value="Partiellement retenue">Partiellement retenue</option>
              </select>
            </div>

            {formData.caution_statut === 'Partiellement retenue' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant retenu (€)
                </label>
                <input
                  type="number"
                  min="0"
                  max={formData.caution_eur}
                  step="0.01"
                  value={formData.caution_retenue_eur}
                  onChange={(e) => setFormData({...formData, caution_retenue_eur: parseFloat(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="Montant retenu sur la caution"
                />
                <div className="mt-1 text-xs text-gray-500">
                  Maximum: {formData.caution_eur} € (montant de la caution)
                </div>
              </div>
            )}
          </div>

          {formData.deadline_paiement && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center">
                <i className="ri-time-line text-orange-600 mr-2"></i>
                <span className="text-sm text-orange-800">
                  Échéance de paiement: {new Date(formData.deadline_paiement).toLocaleDateString('fr-FR')} (J-3)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Options et services */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Options et services</h2>
          
          <div className="space-y-6">
            {/* Technicien */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="technicien_necessaire"
                checked={formData.technicien_necessaire}
                onChange={(e) => setFormData({...formData, technicien_necessaire: e.target.checked})}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="technicien_necessaire" className="ml-3 block text-sm text-gray-700">
                <div className="font-medium">Technicien nécessaire (+80 €)</div>
                <div className="text-gray-500">Installation et assistance technique sur site</div>
              </label>
            </div>

            {/* Livraison */}
            {formData.ville_zone !== 'Retrait agence' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Options de livraison</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="livraison_aller_paris"
                      checked={formData.livraison_aller && formData.ville_zone === 'Paris'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, livraison_aller: true, ville_zone: 'Paris'});
                        } else if (formData.ville_zone === 'Paris') {
                          setFormData({...formData, livraison_aller: false});
                        }
                      }}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="livraison_aller_paris" className="ml-3 block text-sm text-gray-700">
                      <div className="font-medium">
                        Livraison aller Paris
                        <span className="text-orange-600">&nbsp;(+40 €)</span>
                      </div>
                      <div className="text-gray-500">Transport du matériel vers le lieu de l'événement</div>
                    </label>
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="livraison_retour_paris"
                      checked={formData.livraison_retour && formData.ville_zone === 'Paris'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, livraison_retour: true, ville_zone: 'Paris'});
                        } else if (formData.ville_zone === 'Paris') {
                          setFormData({...formData, livraison_retour: false});
                        }
                      }}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="livraison_retour_paris" className="ml-3 block text-sm text-gray-700">
                      <div className="font-medium">
                        Livraison retour Paris
                        <span className="text-orange-600">&nbsp;(+40 €)</span>
                      </div>
                      <div className="text-gray-500">Récupération du matériel après l'événement</div>
                    </label>
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="livraison_aller_hors_paris"
                      checked={formData.livraison_aller && formData.ville_zone === 'Hors Paris'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, livraison_aller: true, ville_zone: 'Hors Paris'});
                        } else if (formData.ville_zone === 'Hors Paris') {
                          setFormData({...formData, livraison_aller: false});
                        }
                      }}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="livraison_aller_hors_paris" className="ml-3 block text-sm text-gray-700">
                      <div className="font-medium">
                        Livraison aller Hors Paris
                        <span className="text-orange-600">&nbsp;(+80 €)</span>
                      </div>
                      <div className="text-gray-500">Transport du matériel vers le lieu de l'événement</div>
                    </label>
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="livraison_retour_hors_paris"
                      checked={formData.livraison_retour && formData.ville_zone === 'Hors Paris'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, livraison_retour: true, ville_zone: 'Hors Paris'});
                        } else if (formData.ville_zone === 'Hors Paris') {
                          setFormData({...formData, livraison_retour: false});
                        }
                      }}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="livraison_retour_hors_paris" className="ml-3 block text-sm text-gray-700">
                      <div className="font-medium">
                        Livraison retour Hors Paris
                        <span className="text-orange-600">&nbsp;(+80 €)</span>
                      </div>
                      <div className="text-gray-500">Récupération du matériel après l'événement</div>
                    </label>
                  </div>
                </div>

                {(formData.livraison_aller || formData.livraison_retour) && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                      <i className="ri-information-line text-blue-600 mr-2 mt-0.5"></i>
                      <div className="text-sm text-blue-800">
                        <div className="font-medium mb-1">Tarification livraison :</div>
                        <div>• Paris : 40€ par trajet (aller ou retour)</div>
                        <div>• Hors Paris : 80€ par trajet (aller ou retour)</div>
                        <div>• Retrait agence : gratuit</div>
                        <div>• Technicien : 80€</div>
                        <div className="mt-2 font-medium text-gray-900">
                          Total livraison : {getLivraisonCost()}€
                        </div>
                        {formData.livraison_aller && (
                          <div className="text-xs mt-1">
                            ✓ Aller {formData.ville_zone} : {formData.ville_zone === 'Paris' ? '40' : '80'}€
                          </div>
                        )}
                        {formData.livraison_retour && (
                          <div className="text-xs mt-1">
                            ✓ Retour {formData.ville_zone} : {formData.ville_zone === 'Paris' ? '40' : '80'}€
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            rows={4}
            maxLength={500}
            placeholder="Notes internes, demandes spéciales, informations complémentaires..."
          />
          <div className="mt-1 text-right">
            <span className="text-xs text-gray-500">
              {(formData.notes || '').length}/500 caractères
            </span>
          </div>
        </div>

        {/* Section Stripe - seulement si réservation existante avec données clients */}
        {!isNewReservation && formData.id && formData.clients && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <StripePaymentManager
              reservationId={formData.id}
              reservationRef={formData.ref || ''}
              clientName={`${formData.clients?.prenom} ${formData.clients?.nom}`}
              clientEmail={formData.clients?.email || ''}
              acompteAmount={formData.acompte_du}
              soldeAmount={formData.solde_du}
              acompteRegle={formData.acompte_regle}
              soldeRegle={formData.solde_regle}
              onPaymentLinkCreated={() => fetchReservation()}
            />
          </div>
        )}
      </form>

      {/* Modal de suppression */}
      {showDeleteModal && (
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
              Êtes-vous sûr de vouloir supprimer définitivement cette réservation ?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
              >
                Supprimer définitivement
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
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