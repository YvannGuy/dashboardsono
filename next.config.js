/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppression de output: "export" pour le développement
  // output: "export", // Décommentez seulement pour la production
  images: {
    unoptimized: true,
  },
  typescript: {
    // ignoreBuildErrors: true,
  },
  // Configuration de sécurité (fonctionne sans output: "export")
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
};

module.exports = nextConfig;
