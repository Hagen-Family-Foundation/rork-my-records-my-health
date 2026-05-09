import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://invalid.invalid';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-supabase-anon-key';

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const secureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function normalizeSupabaseAuthErrorMessage(input: string | undefined): string {
  const message = input?.trim() ?? '';
  const normalized = message.toLowerCase();

  if (!isSupabaseConfigured) {
    return 'Authentication is not configured yet. Add your Supabase URL and anon key to continue.';
  }

  if (!message) {
    return 'Something went wrong. Please try again.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'That email or password does not match our records.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address, then try signing in again.';
  }

  if (normalized.includes('user already registered')) {
    return 'An account with that email already exists. Try signing in instead.';
  }

  if (normalized.includes('password should be at least')) {
    return 'Please choose a password with at least 6 characters.';
  }

  if (normalized.includes('unable to validate email address')) {
    return 'Please enter a valid email address.';
  }

  if (normalized.includes('signup is disabled')) {
    return 'New account creation is currently unavailable.';
  }

  if (normalized.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  return message;
}
