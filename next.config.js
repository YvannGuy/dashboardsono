/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration pour la production
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Configuration de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Configuration pour éviter les problèmes de hydration
  experimental: {
    // optimizeCss: true, // Désactivé temporairement
  },
  
  // Configuration pour les fichiers statiques
  async rewrites() {
    return [
      {
        source: '/logo.svg',
        destination: '/public/logo.svg',
      },
    ];
  },
};

module.exports = nextConfig;
