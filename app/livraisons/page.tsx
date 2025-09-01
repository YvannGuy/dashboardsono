
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import LivraisonsList from './LivraisonsList';

export default function LivraisonsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <LivraisonsList />
      </Layout>
    </ProtectedRoute>
  );
}
