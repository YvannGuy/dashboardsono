'use client';

import { useState, useEffect } from 'react';

interface DiagnosticInfo {
  userAgent: string;
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  colorDepth: number;
  pixelRatio: number;
  cookiesEnabled: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  cssSupport: {
    grid: boolean;
    flexbox: boolean;
    customProperties: boolean;
  };
  fonts: string[];
  errors: string[];
}

export default function DiagnosticTool() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const runDiagnostic = () => {
      const info: DiagnosticInfo = {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        cssSupport: {
          grid: CSS.supports('display', 'grid'),
          flexbox: CSS.supports('display', 'flex'),
          customProperties: CSS.supports('--custom-property', 'value'),
        },
        fonts: [],
        errors: [],
      };

      // Vérifier les polices
      if (document.fonts) {
        document.fonts.ready.then(() => {
          const fontFamilies = ['Inter', 'JetBrains Mono', 'Pacifico'];
          fontFamilies.forEach(font => {
            if (document.fonts.check(`12px "${font}"`)) {
              info.fonts.push(font);
            }
          });
        });
      }

      // Capturer les erreurs
      const originalError = console.error;
      console.error = (...args) => {
        info.errors.push(args.join(' '));
        originalError.apply(console, args);
      };

      setDiagnostic(info);
    };

    runDiagnostic();
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg z-50"
        title="Diagnostic d'affichage"
      >
        <i className="ri-bug-line text-xl"></i>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Diagnostic d'affichage</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {diagnostic ? (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Navigateur</h3>
              <p className="text-gray-600 break-all">{diagnostic.userAgent}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Viewport</h3>
                <p>{diagnostic.viewport.width} × {diagnostic.viewport.height}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Écran</h3>
                <p>{diagnostic.screen.width} × {diagnostic.screen.height}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Pixel Ratio</h3>
                <p>{diagnostic.pixelRatio}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Profondeur couleur</h3>
                <p>{diagnostic.colorDepth} bits</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Support CSS</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2 rounded ${diagnostic.cssSupport.grid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Grid: {diagnostic.cssSupport.grid ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded ${diagnostic.cssSupport.flexbox ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Flexbox: {diagnostic.cssSupport.flexbox ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded ${diagnostic.cssSupport.customProperties ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  CSS Variables: {diagnostic.cssSupport.customProperties ? '✓' : '✗'}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Stockage</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2 rounded ${diagnostic.cookiesEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Cookies: {diagnostic.cookiesEnabled ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded ${diagnostic.localStorage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  localStorage: {diagnostic.localStorage ? '✓' : '✗'}
                </div>
                <div className={`p-2 rounded ${diagnostic.sessionStorage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  sessionStorage: {diagnostic.sessionStorage ? '✓' : '✗'}
                </div>
              </div>
            </div>

            {diagnostic.fonts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Polices chargées</h3>
                <div className="flex flex-wrap gap-2">
                  {diagnostic.fonts.map(font => (
                    <span key={font} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {font}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {diagnostic.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-red-600">Erreurs détectées</h3>
                <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                  {diagnostic.errors.map((error, index) => (
                    <p key={index} className="text-red-700 text-xs mb-1">{error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  const data = JSON.stringify(diagnostic, null, 2);
                  navigator.clipboard.writeText(data);
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
              >
                Copier les données
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-500 text-white px-4 py-2 rounded text-sm"
              >
                Recharger la page
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Chargement du diagnostic...</p>
          </div>
        )}
      </div>
    </div>
  );
}
