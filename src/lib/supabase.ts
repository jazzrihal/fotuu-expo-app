import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = __DEV__
  ? process.env.EXPO_PUBLIC_SUPABASE_LOCAL_URL!
  : process.env.EXPO_PUBLIC_SUPABASE_URL!;

const supabaseKey = __DEV__
  ? process.env.EXPO_PUBLIC_SUPABASE_LOCAL_PUBLISHABLE_KEY!
  : process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
