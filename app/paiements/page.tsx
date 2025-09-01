
'use client';

import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import PaiementsList from './PaiementsList';

export default function PaiementsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <PaiementsList />
      </Layout>
    </ProtectedRoute>
  );
}
