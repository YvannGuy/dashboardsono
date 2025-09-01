
import { Suspense } from 'react';
import Layout from '../../components/Layout';
import ReservationDetail from './ReservationDetail';

export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
    { id: '10' },
    { id: '15' },
    { id: '20' },
    { id: '25' },
    { id: '30' },
    { id: '35' },
    { id: '40' },
    { id: '41' },
    { id: '42' },
    { id: '43' },
    { id: '44' },
    { id: '45' },
    { id: '46' },
    { id: '47' },
    { id: '48' },
    { id: '49' },
    { id: '50' },
    { id: '51' },
    { id: '52' },
    { id: '53' },
    { id: '54' },
    { id: '55' },
    { id: '56' },
    { id: '57' },
    { id: '58' },
    { id: '59' },
    { id: '60' },
    { id: '61' },
    { id: '62' },
    { id: '63' },
    { id: '64' },
    { id: '65' },
    { id: '66' },
    { id: '67' },
    { id: '68' },
    { id: '69' },
    { id: '70' },
    { id: '71' },
    { id: '72' },
    { id: '73' },
    { id: '74' },
    { id: '75' },
    { id: '76' },
    { id: '77' },
    { id: '78' },
    { id: '79' },
    { id: '80' },
    { id: '81' },
    { id: '82' },
    { id: '83' },
    { id: '84' },
    { id: '85' },
    { id: '86' },
    { id: '87' },
    { id: '88' },
    { id: '89' },
    { id: '90' },
    { id: '91' },
    { id: '92' },
    { id: '93' },
    { id: '94' },
    { id: '95' },
    { id: '96' },
    { id: '97' },
    { id: '98' },
    { id: '99' },
    { id: '100' },
    { id: 'new' },
  ];
}

export default function ReservationPage({ params }: { params: { id: string } }) {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      }>
        <ReservationDetail reservationId={params.id} />
      </Suspense>
    </Layout>
  );
}
