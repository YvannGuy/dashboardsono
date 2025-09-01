
'use client';

import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import ReservationsList from './ReservationsList';

export default function ReservationsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ReservationsList />
      </Layout>
    </ProtectedRoute>
  );
}
