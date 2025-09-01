'use client';

import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import DepensesList from './DepensesList';

export default function DepensesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Dépenses</h1>
            <p className="text-gray-600">Suivez et gérez toutes vos dépenses</p>
          </div>
          <DepensesList />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
