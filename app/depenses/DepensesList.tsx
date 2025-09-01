'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../lib/supabase';
import AddExpenseForm from './AddExpenseForm';

interface Expense {
  id: string;
  occurred_at: string;
  category: string;
  description: string;
  amount_eur: number;
  created_at: string;
}

export default function DepensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('expenses_simple')
        .select('*')
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('expenses_simple')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Recharger la liste
      fetchExpenses();
    } catch (error: any) {
      setError('Erreur lors de la suppression: ' + error.message);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'marketing': 'bg-purple-100 text-purple-800',
      'sub_rental': 'bg-green-100 text-green-800',
      'equipment_purchase': 'bg-blue-100 text-blue-800',
      'vehicle_rental': 'bg-yellow-100 text-yellow-800',
      'fuel': 'bg-orange-100 text-orange-800',
      'software': 'bg-indigo-100 text-indigo-800',
      'maintenance': 'bg-gray-100 text-gray-800',
      'tax': 'bg-red-100 text-red-800',
      'misc': 'bg-slate-100 text-slate-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'marketing': 'Marketing',
      'sub_rental': 'Sous-location',
      'equipment_purchase': 'Achat Matériel',
      'vehicle_rental': 'Location Camion',
      'fuel': 'Carburant',
      'software': 'Logiciel',
      'maintenance': 'Maintenance',
      'tax': 'Taxes',
      'misc': 'Divers'
    };
    return labels[category as keyof typeof labels] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <i className="ri-loader-4-line animate-spin text-white"></i>
          </div>
          <p className="text-gray-600">Chargement des dépenses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Erreur: {error}</p>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_eur, 0);

  // Calculer les dépenses par catégorie
  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount_eur;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <i className="ri-money-euro-circle-line text-red-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Dépenses</p>
              <p className="text-2xl font-bold text-gray-900">{totalExpenses.toLocaleString('fr-FR')} €</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <i className="ri-file-list-line text-blue-600 text-xl"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Nombre de Dépenses</p>
              <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dépenses par catégorie */}
      {Object.keys(expensesByCategory).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Dépenses par Catégorie</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(expensesByCategory).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)}`}>
                      {getCategoryLabel(category)}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {amount.toLocaleString('fr-FR')} €
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Liste des dépenses */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Liste des Dépenses</h2>
          <AddExpenseForm onExpenseAdded={fetchExpenses} />
        </div>
        
        {expenses.length === 0 ? (
          <div className="p-8 text-center">
            <i className="ri-file-list-line text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">Aucune dépense enregistrée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {expense.description || 'Sans description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(expense.category)}`}>
                        {getCategoryLabel(expense.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.amount_eur.toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(expense.occurred_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Supprimer cette dépense"
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
