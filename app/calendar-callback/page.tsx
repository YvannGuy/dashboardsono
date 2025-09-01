
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CalendarCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setMessage(`Erreur d'autorisation: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Code d\'autorisation manquant');
        return;
      }

      try {
        // Déterminer le type de calendrier basé sur l'URL ou state
        const isGoogle = window.location.href.includes('google') || state?.includes('google');
        const isOutlook = window.location.href.includes('microsoft') || state?.includes('outlook');

        if (isGoogle) {
          await handleGoogleCallback(code);
        } else if (isOutlook) {
          await handleOutlookCallback(code);
        } else {
          throw new Error('Type de calendrier non reconnu');
        }

        setStatus('success');
        setMessage('Connexion réussie ! Fermeture automatique...');
        
        // Fermer la popup après 2 secondes
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        console.error('Erreur callback:', error);
        setStatus('error');
        setMessage('Erreur lors de la connexion au calendrier');
      }
    };

    handleCallback();
  }, [searchParams]);

  const handleGoogleCallback = async (code: string) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
    const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || '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';
    const redirectUri = `${window.location.origin}/calendar-callback`;

    // Échanger le code contre un token d'accès
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Erreur lors de l\'échange du code Google');
    }

    const tokenData = await tokenResponse.json();

    // Envoyer le token à la fenêtre parent
    if (window.opener) {
      window.opener.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token
      }, window.location.origin);
    }
  };

  const handleOutlookCallback = async (code: string) => {
    const clientId = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID || 'abcd1234-5678-90ef-ghij-klmnopqrstuv';
    const clientSecret = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_SECRET || 'xyz789~ABC123.def456_GHI789';
    const redirectUri = `${window.location.origin}/calendar-callback`;

    // Échanger le code contre un token d'accès
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: 'https://graph.microsoft.com/calendars.readwrite'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Erreur lors de l\'échange du code Outlook');
    }

    const tokenData = await tokenResponse.json();

    // Envoyer le token à la fenêtre parent
    if (window.opener) {
      window.opener.postMessage({
        type: 'OUTLOOK_AUTH_SUCCESS',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token
      }, window.location.origin);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {status === 'loading' && (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion en cours...</h2>
              <p className="text-gray-600">Veuillez patienter pendant la configuration de votre calendrier.</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-check-line text-green-600 text-2xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion réussie !</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="text-sm text-gray-500">Cette fenêtre va se fermer automatiquement...</div>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-close-line text-red-600 text-2xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de connexion</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => window.close()}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CalendarCallbackContent />
    </Suspense>
  );
}
