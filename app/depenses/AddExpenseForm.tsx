'use client';

import { useState } from 'react';
import { supabaseClient } from '../../lib/supabase';

interface AddExpenseFormProps {
  onExpenseAdded: () => void;
}

export default function AddExpenseForm({ onExpenseAdded }: AddExpenseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    category: 'misc' as string,
    amount_eur: 0,
    occurred_at: new Date().toISOString().split('T')[0]
  });

  const expenseCategories = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'sub_rental', label: 'Sous-location' },
    { value: 'equipment_purchase', label: 'Achat Matériel' },
    { value: 'vehicle_rental', label: 'Location Camion' },
    { value: 'fuel', label: 'Carburant' },
    { value: 'software', label: 'Logiciel' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'tax', label: 'Taxes' },
    { value: 'misc', label: 'Divers' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Créer la dépense
      const { error } = await supabaseClient
        .from('expenses_simple')
        .insert({
          user_id: user.id,
          occurred_at: formData.occurred_at,
          category: formData.category,
          description: formData.description,
          amount_eur: formData.amount_eur
        });

      if (error) throw error;

      // Réinitialiser le formulaire
      setFormData({
        description: '',
        category: 'misc',
        amount_eur: 0,
        occurred_at: new Date().toISOString().split('T')[0]
      });

      setIsOpen(false);
      onExpenseAdded();
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de la dépense:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <i className="ri-add-line"></i>
        Ajouter une dépense
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Ajouter une dépense</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Description de la dépense"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {expenseCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant (€) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.amount_eur}
                  onChange={(e) => setFormData({ ...formData, amount_eur: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.occurred_at}
                  onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
