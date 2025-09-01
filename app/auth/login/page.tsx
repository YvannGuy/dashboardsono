
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '../../../lib/supabase';
import OptimizedImage from '../../components/OptimizedImage';
import InlineLogo from '../../components/InlineLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://readdy.ai/api/search-image?query=Professional%20audio%20equipment%20setup%20with%20speakers%20subwoofers%20mixing%20console%20cables%20microphones%20studio%20monitors%20arranged%20in%20modern%20clean%20space%20with%20dramatic%20lighting%20showcasing%20high-end%20sound%20system%20rental%20gear%20black%20silver%20metallic%20finishes&width=1920&height=1080&seq=soundequip001&orientation=landscape')`
        }}
      ></div>
      
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/60 via-orange-600/50 to-orange-700/70"></div>
      
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-10 border border-white/20">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <InlineLogo size="xl" className="scale-125" />
            </div>
            <p className="text-gray-600 text-lg">Connexion à votre espace</p>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-base">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-3">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-3">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-base"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium whitespace-nowrap text-lg"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-base text-gray-500">
              Première visite ? Contactez l'administrateur pour créer votre compte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
