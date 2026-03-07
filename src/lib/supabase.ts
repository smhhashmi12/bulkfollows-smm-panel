import { createClient, type User } from '@supabase/supabase-js';

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

export async function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  label: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      console.warn(`[Supabase] ${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const cleanupCallbacks: Array<() => void> = [];
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      const abortFromCaller = () => controller.abort();
      init.signal.addEventListener('abort', abortFromCaller, { once: true });
      cleanupCallbacks.push(() => init.signal?.removeEventListener('abort', abortFromCaller));
    }
  }

  try {
    return await fetch(input, {
      ...(init ?? {}),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError' && !init?.signal?.aborted) {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    cleanupCallbacks.forEach((cleanup) => cleanup());
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

export async function getSessionUser(timeoutMs = FETCH_TIMEOUT_MS): Promise<User | null> {
  const { data: { session }, error } = await withSupabaseTimeout(
    supabase.auth.getSession(),
    'auth session lookup',
    timeoutMs
  );

  if (error) {
    throw error;
  }

  return session?.user ?? null;
}

