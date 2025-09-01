
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Pack {
  id: string;
  nom_pack: string;
  description_courte?: string;
  prix_base_ttc: number;
  nombreVentes?: number;
  derniereVente?: string;
}

export default function PacksList() {
  const [showForm, setShowForm] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nom_pack: '',
    description_courte: '',
    prix_base_ttc: ''
  });

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Chargement des packs...');
      
      const { data: packsData, error } = await supabase
        .from('packs')
        .select(`
          id,
          nom_pack,
          description_courte,
          prix_base_ttc,
          created_at
        `)
        .order('nom_pack');

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      console.log('Packs récupérés:', packsData);

      // Récupérer les statistiques de vente pour chaque pack
      const packsWithStats = await Promise.all(
        (packsData || []).map(async (pack) => {
          try {
            const { data: reservations, error: reservationError } = await supabase
              .from('reservations')
              .select('id, date_event')
              .eq('pack_id', pack.id)
              .order('date_event', { ascending: false });

            if (reservationError) {
              console.warn('Erreur lors du chargement des réservations pour le pack:', pack.id, reservationError);
            }

            return {
              ...pack,
              nombreVentes: reservations?.length || 0,
              derniereVente: reservations && reservations.length > 0 ? reservations[0].date_event : null
            };
          } catch (err) {
            console.warn('Erreur pour le pack:', pack.id, err);
            return {
              ...pack,
              nombreVentes: 0,
              derniereVente: null
            };
          }
        })
      );

      setPacks(packsWithStats);
    } catch (error) {
      console.error('Erreur lors du chargement des packs:', error);
      setError('Erreur lors du chargement des packs. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des données
    if (!formData.nom_pack.trim()) {
      alert('Le nom du pack est obligatoire');
      return;
    }

    if (!formData.prix_base_ttc || isNaN(parseFloat(formData.prix_base_ttc)) || parseFloat(formData.prix_base_ttc) <= 0) {
      alert('Le prix doit être un nombre positif');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const packData = {
        nom_pack: formData.nom_pack.trim(),
        description_courte: formData.description_courte.trim() || null,
        prix_base_ttc: parseFloat(formData.prix_base_ttc)
      };

      console.log('Données à sauvegarder:', packData);

      let result;
      if (editingPack) {
        console.log('Modification du pack:', editingPack.id);
        result = await supabase
          .from('packs')
          .update(packData)
          .eq('id', editingPack.id)
          .select();
      } else {
        console.log('Création du pack');
        result = await supabase
          .from('packs')
          .insert([packData])
          .select();
      }

      const { data, error } = result;

      if (error) {
        console.error('Erreur Supabase détaillée:', error);
        throw new Error(`Erreur de sauvegarde: ${error.message}`);
      }

      console.log('Pack sauvegardé avec succès:', data);

      // Recharger la liste
      await fetchPacks();
      resetForm();
      
      // Message de succès
      alert(editingPack ? 'Pack modifié avec succès !' : 'Pack créé avec succès !');

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde du pack:', error);
      setError(error.message || 'Erreur lors de la sauvegarde du pack');
      alert(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom_pack: '',
      description_courte: '',
      prix_base_ttc: ''
    });
    setShowForm(false);
    setEditingPack(null);
    setError(null);
  };

  const handleEdit = (pack: Pack) => {
    setEditingPack(pack);
    setFormData({
      nom_pack: pack.nom_pack,
      description_courte: pack.description_courte || '',
      prix_base_ttc: pack.prix_base_ttc.toString()
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (packId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce pack ?')) {
      try {
        const { error } = await supabase
          .from('packs')
          .delete()
          .eq('id', packId);

        if (error) throw error;

        await fetchPacks();
        alert('Pack supprimé avec succès !');
      } catch (error: any) {
        console.error('Erreur lors de la suppression:', error);
        alert(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Packs & Tarifs</h1>
            <p className="text-gray-600">Gérez vos offres et tarifs de base</p>
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
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packs & Tarifs</h1>
          <p className="text-gray-600">Gérez vos offres et tarifs de base</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(true);
            setError(null);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap flex items-center"
        >
          <i className="ri-add-line mr-2"></i>
          Nouveau pack
        </button>
      </div>

      {/* Message d'erreur global */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <i className="ri-error-warning-line text-red-600 mr-2"></i>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 md:mr-4 flex-shrink-0">
              <i className="ri-package-line text-blue-600 text-lg md:text-xl"></i>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{packs.length}</p>
              <p className="text-xs md:text-sm text-gray-600">Packs disponibles</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3 md:mr-4 flex-shrink-0">
              <i className="ri-shopping-cart-line text-green-600 text-lg md:text-xl"></i>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900">
                {packs.reduce((sum, pack) => sum + (pack.nombreVentes || 0), 0)}
              </p>
              <p className="text-xs md:text-sm text-gray-600">Ventes totales</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 md:mr-4 flex-shrink-0">
              <i className="ri-money-euro-circle-line text-purple-600 text-lg md:text-xl"></i>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-900">
                {packs.length > 0 ? Math.round(packs.reduce((sum, pack) => sum + pack.prix_base_ttc, 0) / packs.length).toLocaleString() : 0} €
              </p>
              <p className="text-xs md:text-sm text-gray-600">Prix moyen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingPack ? 'Modifier le pack' : 'Nouveau pack'}
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
                  Nom du pack *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom_pack}
                  onChange={(e) => setFormData({...formData, nom_pack: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="Pack Premium, Pack Standard..."
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix de base (€) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.prix_base_ttc}
                  onChange={(e) => setFormData({...formData, prix_base_ttc: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  placeholder="1500.00"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description courte
              </label>
              <textarea
                value={formData.description_courte}
                onChange={(e) => setFormData({...formData, description_courte: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                rows={3}
                maxLength={500}
                placeholder="Description du pack..."
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description_courte.length}/500 caractères
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    {editingPack ? 'Modifier' : 'Créer'} le pack
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

      {/* Liste des packs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {packs.map((pack) => (
          <div key={pack.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-2">{pack.nom_pack}</h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                  Actif
                </span>
              </div>

              {pack.description_courte && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pack.description_courte}</p>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Prix de base:</span>
                  <span className="text-xl font-bold text-gray-900">{pack.prix_base_ttc.toLocaleString()} €</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Ventes:</span>
                  <span className="text-sm font-medium text-gray-900">{pack.nombreVentes || 0}</span>
                </div>

                {pack.derniereVente && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Dernière vente:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(pack.derniereVente).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(pack)}
                  className="flex-1 bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
                >
                  <i className="ri-edit-line mr-1"></i>
                  Modifier
                </button>
                
                <button
                  onClick={() => handleDelete(pack.id)}
                  className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm cursor-pointer"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {packs.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <i className="ri-package-line text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 mb-4">Aucun pack créé pour le moment</p>
          <button 
            onClick={() => {
              setShowForm(true);
              setError(null);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
          >
            <i className="ri-add-line mr-2"></i>
            Créer le premier pack
          </button>
        </div>
      )}
    </div>
  );
}
