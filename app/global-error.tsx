'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center h-screen text-center px-4 bg-gray-50">
          <h1 className="text-5xl md:text-6xl font-semibold text-red-500 mb-4">Erreur Globale</h1>
          <h2 className="text-2xl md:text-3xl font-semibold mb-6">Une erreur critique s'est produite</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-md">
            L'application a rencontré une erreur inattendue. Veuillez recharger la page.
          </p>
          <button
            onClick={reset}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </body>
    </html>
  );
}
