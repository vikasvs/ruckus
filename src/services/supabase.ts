import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateSupabasePublicEnv } from '@/config/env';

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return validateSupabasePublicEnv().valid;
}

export function getSupabaseConfigurationError(): string | null {
  const validation = validateSupabasePublicEnv();
  if (validation.valid) return null;

  return `Missing Supabase environment variables: ${validation.missingKeys.join(', ')}`;
}

export function getSupabase(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const validation = validateSupabasePublicEnv();
  if (!validation.valid) {
    throw new Error(`Missing Supabase environment variables: ${validation.missingKeys.join(', ')}`);
  }

  cachedClient = createClient(
    validation.values.EXPO_PUBLIC_SUPABASE_URL as string,
    validation.values.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );

  return cachedClient;
}

export default getSupabase;
