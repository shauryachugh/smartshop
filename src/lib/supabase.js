import { createClient } from '@supabase/supabase-js';

// Polyfill WebSocket in Node.js test environment if missing (browser has native WebSocket)
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

// Safe environment variable retriever for both Vite and Node environments
const getEnvVar = (key, fallback = '') => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process?.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // ignore
  }
  return fallback;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://unectsmgytpitjaxdgru.supabase.co');
const supabaseAnonKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  'sb_publishable_vWkBLjIm-pOLOTfP7Ko3LA_EicHaIxw';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id')
);

const isBrowser = typeof window !== 'undefined';

/**
 * Shared Supabase Client for ShopSmart AI
 * Automatically persists session to localStorage and handles token refresh
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    storage: isBrowser ? window.localStorage : undefined,
  },
});
