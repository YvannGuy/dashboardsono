'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4">
      <h1 className="text-5xl md:text-6xl font-semibold text-red-500 mb-4">Erreur</h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-6">Quelque chose s'est mal passé !</h2>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        Une erreur inattendue s'est produite. Veuillez réessayer.
      </p>
      <button
        onClick={reset}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}
