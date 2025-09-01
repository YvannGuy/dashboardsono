'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Suspense } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setError('Session ID manquant');
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      // Récupérer les informations du paiement via la session
      const { data: paymentLink, error: linkError } = await supabase
        .from('stripe_payment_links')
        .select(`
          *,
          reservations (
            ref,
            clients (
              prenom,
              nom
            )
          )
        `)
        .eq('stripe_session_id', sessionId)
        .single();

      if (linkError || !paymentLink) {
        throw new Error('Paiement non trouvé');
      }

      setPaymentInfo(paymentLink);
    } catch (error) {
      console.error('Erreur vérification paiement:', error);
      setError('Impossible de vérifier le paiement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre paiement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-red-600 text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/reservations"
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium cursor-pointer whitespace-nowrap"
          >
            Retour aux réservations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="ri-check-line text-green-600 text-2xl"></i>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi !</h1>
        <p className="text-gray-600 mb-6">
          Votre {paymentInfo?.payment_type?.toLowerCase()} a été traité avec succès.
        </p>

        {paymentInfo && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Détails du paiement</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Réservation :</span>
                <span className="font-medium">{paymentInfo.reservations?.ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type :</span>
                <span className="font-medium">{paymentInfo.payment_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Montant :</span>
                <span className="font-medium text-green-600">
                  {(paymentInfo.amount_cents / 100).toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client :</span>
                <span className="font-medium">
                  {paymentInfo.reservations?.clients?.prenom} {paymentInfo.reservations?.clients?.nom}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Un email de confirmation vous sera envoyé sous peu.
          </p>
          
          <div className="flex space-x-3">
            <Link
              href={`/reservations/${paymentInfo?.reservation_id}`}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap text-center"
            >
              Voir réservation
            </Link>
            <Link
              href="/reservations"
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap text-center"
            >
              Mes réservations
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}