
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton pour éviter les instances multiples
let supabaseInstance = null;

export const supabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'soundrent-auth',
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
};

// Export direct pour compatibilité
export const supabaseClient = supabase();
