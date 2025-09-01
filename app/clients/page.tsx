
'use client';

import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import ClientsList from './ClientsList';

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ClientsList />
      </Layout>
    </ProtectedRoute>
  );
}
