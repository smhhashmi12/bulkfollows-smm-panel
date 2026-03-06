import { createClient } from '@supabase/supabase-js';
import { timeout } from './utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FETCH_TIMEOUT_MS = 15_000;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables');
}

// Custom storage implementation for better persistence
const customStorage = {
  getItem: (key: string) => {
    const item = window.localStorage.getItem(key);
    console.log(`[Storage] Getting ${key}:`, item ? 'found' : 'not found');
    return item;
  },
  setItem: (key: string, value: string) => {
    console.log(`[Storage] Setting ${key}`);
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    console.log(`[Storage] Removing ${key}`);
    window.localStorage.removeItem(key);
  }
};

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
  if (init.signal) {
    return fetch(input, init);
  }
  const { signal, timer, clear } = timeout(FETCH_TIMEOUT_MS);
  try {
    return await Promise.race([
      fetch(input, { ...init, signal }),
      timer,
    ]);
  } finally {
    clear();
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce', // Use PKCE for better security
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
    fetch: fetchWithTimeout,
  }
});

