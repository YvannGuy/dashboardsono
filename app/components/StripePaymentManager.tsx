'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StripePaymentManagerProps {
  reservationId: string;
  reservationRef: string;
  clientName: string;
  clientEmail: string;
  acompteAmount: number;
  soldeAmount: number;
  acompteRegle: boolean;
  soldeRegle: boolean;
  onPaymentLinkCreated?: () => void;
}

export default function StripePaymentManager({
  reservationId,
  reservationRef,
  clientName,
  clientEmail,
  acompteAmount,
  soldeAmount,
  acompteRegle,
  soldeRegle,
  onPaymentLinkCreated
}: StripePaymentManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<{ type: string; url: string } | null>(null);
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const createPaymentLink = async (paymentType: 'Acompte' | 'Solde') => {
    setLoading(paymentType);
    
    try {
      const response = await supabase.functions.invoke('create-payment-link', {
        body: {
          reservationId,
          paymentType
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { payment_url, amount_eur } = response.data;
      
      // Proposer d'envoyer par email ou copier le lien
      setShowEmailModal({ type: paymentType, url: payment_url });
      
      if (onPaymentLinkCreated) {
        onPaymentLinkCreated();
      }
      
    } catch (error) {
      console.error('Erreur création lien:', error);
      alert('Erreur lors de la création du lien de paiement');
    } finally {
      setLoading(null);
    }
  };

  const sendPaymentEmail = async () => {
    if (!showEmailModal) return;
    
    setSendingEmail(true);
    
    try {
      const response = await supabase.functions.invoke('send-payment-email', {
        body: {
          reservationId,
          paymentType: showEmailModal.type,
          paymentUrl: showEmailModal.url,
          customMessage: emailMessage.trim() || undefined
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      alert('Email envoyé avec succès !');
      setShowEmailModal(null);
      setEmailMessage('');
      
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('Lien copié dans le presse-papiers !');
    } catch (error) {
      console.error('Erreur copie:', error);
      alert('Impossible de copier le lien');
    }
  };

  const openPaymentLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <i className="ri-secure-payment-line text-blue-600 mr-2"></i>
        Liens de paiement Stripe
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Acompte */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-orange-800">Acompte</h4>
              <p className="text-orange-600 font-bold text-lg">{acompteAmount.toLocaleString()} €</p>
            </div>
            <div className="text-right">
              {acompteRegle ? (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  <i className="ri-check-line mr-1"></i>
                  Payé
                </span>
              ) : (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  <i className="ri-time-line mr-1"></i>
                  En attente
                </span>
              )}
            </div>
          </div>
          
          {!acompteRegle && (
            <button
              onClick={() => createPaymentLink('Acompte')}
              disabled={loading === 'Acompte'}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {loading === 'Acompte' ? (
                <i className="ri-loader-4-line animate-spin mr-2"></i>
              ) : (
                <i className="ri-link mr-2"></i>
              )}
              Créer lien acompte
            </button>
          )}
        </div>

        {/* Solde */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-green-800">Solde</h4>
              <p className="text-green-600 font-bold text-lg">{soldeAmount.toLocaleString()} €</p>
            </div>
            <div className="text-right">
              {soldeRegle ? (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  <i className="ri-check-line mr-1"></i>
                  Payé
                </span>
              ) : (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  <i className="ri-time-line mr-1"></i>
                  En attente
                </span>
              )}
            </div>
          </div>
          
          {!soldeRegle && (
            <button
              onClick={() => createPaymentLink('Solde')}
              disabled={loading === 'Solde'}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {loading === 'Solde' ? (
                <i className="ri-loader-4-line animate-spin mr-2"></i>
              ) : (
                <i className="ri-link mr-2"></i>
              )}
              Créer lien solde
            </button>
          )}
        </div>
      </div>

      {/* Modal d'envoi d'email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <i className="ri-mail-send-line text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Envoyer le lien de paiement</h3>
                <p className="text-sm text-gray-500">{showEmailModal.type} - {clientName}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destinataire
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                  placeholder="Ajouter un message personnalisé..."
                />
                <div className="mt-1 text-right">
                  <span className="text-xs text-gray-500">
                    {emailMessage.length}/500 caractères
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Lien de paiement :</strong>
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={showEmailModal.url}
                    disabled
                    className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1"
                  />
                  <button
                    onClick={() => copyToClipboard(showEmailModal.url)}
                    className="text-blue-600 hover:text-blue-700 cursor-pointer p-1"
                    title="Copier"
                  >
                    <i className="ri-clipboard-line"></i>
                  </button>
                  <button
                    onClick={() => openPaymentLink(showEmailModal.url)}
                    className="text-green-600 hover:text-green-700 cursor-pointer p-1"
                    title="Ouvrir"
                  >
                    <i className="ri-external-link-line"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={sendPaymentEmail}
                disabled={sendingEmail}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
              >
                {sendingEmail ? (
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                ) : (
                  <i className="ri-mail-send-line mr-2"></i>
                )}
                Envoyer email
              </button>
              <button
                onClick={() => setShowEmailModal(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}