/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration optimisée pour la production
  output: 'standalone',
  
  // Optimisations des images
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
  },
  
  // Configuration TypeScript stricte
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimisations de performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  // Configuration de sécurité renforcée
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
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  
  // Compression et optimisation
  compress: true,
  
  // Configuration pour éviter les problèmes de hydration
  reactStrictMode: true,
  
  // Optimisation des bundles
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
