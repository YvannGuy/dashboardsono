'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { PDFGenerator } from '../../components/PDFGenerator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PaiementDetail {
  id: string;
  type: string;
  montant_eur: number;
  moyen: string;
  date_paiement: string;
  recu_pdf?: string;
  created_at: string;
  reservations: {
    id: string;
    ref: string;
    date_event: string;
    prix_total_ttc: number;
    acompte_du: number;
    solde_du: number;
    statut: string;
    clients: {
      prenom: string;
      nom: string;
      email: string;
      telephone: string;
      adresse?: string;
    };
    packs: {
      nom_pack: string;
    };
  };
}

interface PaiementDetailProps {
  paiementId: string;
}

export default function PaiementDetail({ paiementId }: PaiementDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paiement, setPaiement] = useState<PaiementDetail | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  useEffect(() => {
    fetchPaiement();
  }, [paiementId]);

  const fetchPaiement = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('paiements')
        .select(`
          *,
          reservations!paiements_reservation_id_fkey (
            id,
            ref,
            date_event,
            prix_total_ttc,
            acompte_du,
            solde_du,
            statut,
            clients (
              prenom,
              nom,
              email,
              telephone
            ),
            packs (
              nom_pack
            )
          )
        `)
        .eq('id', paiementId)
        .single();

      if (error) throw error;
      setPaiement(data);
    } catch (error) {
      console.error('Erreur lors du chargement du paiement:', error);
      router.push('/paiements');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReceipt = async () => {
    if (!paiement) return;
    
    setGeneratingReceipt(true);
    
    try {
      // Générer le PDF et l'archiver dans le cloud
      const { pdfBlob, filename, storageUrl } = await PDFGenerator.generateAndArchive(paiement);
      
      // Télécharger le PDF
      PDFGenerator.downloadPDF(pdfBlob, filename);
      
      // Optionnel: ouvrir pour impression
      await PDFGenerator.printPDF(pdfBlob);
      
      // Mettre à jour le paiement avec les informations du reçu
      const updateData: any = { recu_pdf: filename };
      if (storageUrl) {
        updateData.recu_storage_url = storageUrl;
        updateData.recu_archived_at = new Date().toISOString();
      }
      
      const { error: updateError } = await supabase
        .from('paiements')
        .update(updateData)
        .eq('id', paiement.id);
        
      if (!updateError) {
        // Rafraîchir les données
        fetchPaiement();
      }
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error);
      alert('Erreur lors de la génération du reçu. Veuillez réessayer.');
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const handleDelete = async () => {
    if (!paiement) return;

    try {
      const { error } = await supabase
        .from('paiements')
        .delete()
        .eq('id', paiement.id);

      if (error) throw error;
      router.push('/paiements');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: { [key: string]: string } = {
      'Acompte': 'bg-orange-100 text-orange-800',
      'Solde': 'bg-green-100 text-green-800',
      'Autre': 'bg-gray-100 text-gray-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
  };

  const getMoyenIcon = (moyen: string) => {
    const icons: { [key: string]: string } = {
      'CB': 'ri-bank-card-line',
      'Virement': 'ri-exchange-line',
      'Espèces': 'ri-money-euro-circle-line',
      'Lien Stripe': 'ri-link'
    };
    return icons[moyen] || 'ri-money-euro-circle-line';
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

  if (!paiement) {
    return (
      <div className="text-center py-12">
        <i className="ri-error-warning-line text-4xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">Paiement introuvable</p>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Détail du paiement</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(paiement.type)}`}>
                {paiement.type}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line mr-2"></i>
            Supprimer
          </button>
          <button 
            onClick={handleGenerateReceipt}
            disabled={generatingReceipt}
            className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {generatingReceipt ? (
              <i className="ri-loader-4-line animate-spin mr-2"></i>
            ) : (
              <i className="ri-printer-line mr-2"></i>
            )}
            {paiement?.recu_pdf ? 'Regénérer reçu' : 'Générer reçu'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations du paiement */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du paiement</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {paiement.montant_eur.toLocaleString()} €
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full ${getTypeBadge(paiement.type)}`}>
                  {paiement.type}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moyen de paiement
                </label>
                <div className="flex items-center">
                  <i className={`${getMoyenIcon(paiement.moyen)} text-gray-400 mr-2 text-lg`}></i>
                  <span className="text-gray-900">{paiement.moyen}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de paiement
                </label>
                <div className="text-gray-900">
                  {new Date(paiement.date_paiement).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enregistré le
                </label>
                <div className="text-gray-900">
                  {new Date(paiement.created_at).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(paiement.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reçu PDF
                </label>
                {paiement.recu_pdf ? (
                  <div className="flex items-center space-x-2">
                    <i className="ri-file-pdf-line text-green-600"></i>
                    <span className="text-green-600 text-sm">Généré</span>
                    <button 
                      onClick={handleGenerateReceipt}
                      disabled={generatingReceipt}
                      className="text-blue-600 hover:text-blue-700 cursor-pointer text-sm disabled:opacity-50"
                    >
                      (Regénérer)
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleGenerateReceipt}
                    disabled={generatingReceipt}
                    className="text-orange-600 hover:text-orange-700 cursor-pointer disabled:opacity-50"
                  >
                    {generatingReceipt ? (
                      <i className="ri-loader-4-line animate-spin mr-1"></i>
                    ) : (
                      <i className="ri-add-line mr-1"></i>
                    )}
                    Générer reçu
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Informations de la réservation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Réservation associée</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Link
                    href={`/reservations/${paiement.reservations.id}`}
                    className="text-lg font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    {paiement.reservations.ref}
                  </Link>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutBadge(paiement.reservations.statut)}`}>
                      {paiement.reservations.statut}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(paiement.reservations.date_event).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {paiement.reservations.prix_total_ttc.toLocaleString()} €
                  </div>
                  <div className="text-sm text-gray-500">Total TTC</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pack
                  </label>
                  <div className="text-gray-900">{paiement.reservations.packs?.nom_pack}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acompte
                  </label>
                  <div className="text-gray-900">{paiement.reservations.acompte_du} €</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Solde
                  </label>
                  <div className="text-gray-900">{paiement.reservations.solde_du} €</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informations client */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-orange-600 text-xl"></i>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {paiement.reservations.clients?.prenom} {paiement.reservations.clients?.nom}
                  </div>
                  <div className="text-sm text-gray-500">Client</div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <i className="ri-mail-line text-gray-400"></i>
                  <span className="text-sm text-gray-900">{paiement.reservations.clients?.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="ri-phone-line text-gray-400"></i>
                  <span className="text-sm text-gray-900">{paiement.reservations.clients?.telephone}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Link
                  href={`/reservations/${paiement.reservations.id}`}
                  className="w-full bg-orange-50 text-orange-600 hover:bg-orange-100 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap text-center block"
                >
                  Voir la réservation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <i className="ri-delete-bin-line text-red-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Supprimer le paiement</h3>
                <p className="text-sm text-gray-500">Cette action ne peut pas être annulée</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement ce paiement de {paiement.montant_eur.toLocaleString()} € ?
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