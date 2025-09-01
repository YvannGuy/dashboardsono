
'use client';

import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import PacksList from './PacksList';

export default function PacksPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <PacksList />
      </Layout>
    </ProtectedRoute>
  );
}
