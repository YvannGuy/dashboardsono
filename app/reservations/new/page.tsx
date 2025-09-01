
'use client';

import { Suspense } from 'react';
import Layout from '../../components/Layout';
import ReservationDetail from '../[id]/ReservationDetail';

export default function NewReservationPage() {
  return (
    <Layout>
      <div className="p-6">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        }>
          <ReservationDetail reservationId="new" />
        </Suspense>
      </div>
    </Layout>
  );
}
