import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FETCH_TIMEOUT_MS = 15_000;
const LEGACY_AUTH_STORAGE_KEY = 'supabase.auth.token';
const AUTH_COOKIE_SESSION_ENDPOINT = '/api/auth/session';
const AUTH_COOKIE_CLEAR_ENDPOINT = '/api/auth/clear';
const SHOULD_LOG_STORAGE = Boolean(import.meta.env.DEV);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables');
}

type StoredSupabaseSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number | string;
  expires_in?: number | string;
  currentSession?: StoredSupabaseSession;
};

const getAuthStorageKey = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    const projectRef = hostname.split('.')[0]?.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    if (projectRef) {
      return `bulkfollows.auth.${projectRef}`;
    }
  } catch {
    // Ignore invalid URLs and fall back to the default storage key.
  }

  return 'bulkfollows.auth.token';
};

const AUTH_STORAGE_KEY = getAuthStorageKey(supabaseUrl);

const readStoredSessionValue = (key: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const currentValue = window.localStorage.getItem(key);
  if (currentValue) {
    return currentValue;
  }

  if (key === AUTH_STORAGE_KEY && AUTH_STORAGE_KEY !== LEGACY_AUTH_STORAGE_KEY) {
    const legacyValue = window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
    if (legacyValue) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, legacyValue);
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return legacyValue;
    }
  }

  return null;
};

const parseStoredSession = (rawValue: string | null): StoredSupabaseSession | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as StoredSupabaseSession | null;
    if (!parsed) return null;

    if (parsed.currentSession?.access_token && parsed.currentSession?.refresh_token) {
      return parsed.currentSession;
    }

    if (parsed.access_token && parsed.refresh_token) {
      return parsed;
    }
  } catch {
    // Ignore malformed session cache entries.
  }

  return null;
};

let lastAuthCookieSyncSignature = '';

const buildSessionSignature = (session: StoredSupabaseSession | null) => {
  if (!session?.access_token || !session?.refresh_token) {
    return 'signed-out';
  }

  return [
    session.access_token.slice(-16),
    session.refresh_token.slice(-16),
    String(session.expires_at || ''),
    String(session.expires_in || ''),
  ].join(':');
};

const syncAuthCookieMirror = (rawValue: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  const session = parseStoredSession(rawValue);
  const signature = buildSessionSignature(session);

  if (signature === lastAuthCookieSyncSignature) {
    return;
  }

  lastAuthCookieSyncSignature = signature;

  const request =
    session?.access_token && session?.refresh_token
      ? fetch(AUTH_COOKIE_SESSION_ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at || null,
            expiresIn: session.expires_in || null,
          }),
          keepalive: true,
        })
      : fetch(AUTH_COOKIE_CLEAR_ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: '{}',
          keepalive: true,
        });

  void request.catch((error) => {
    if (SHOULD_LOG_STORAGE) {
      console.warn('[Storage] Failed to sync auth cookies', error);
    }
  });
};

// Custom storage implementation for better persistence and cookie mirroring.
const customStorage = {
  getItem: (key: string) => {
    const item = readStoredSessionValue(key) ?? window.localStorage.getItem(key);
    if (SHOULD_LOG_STORAGE) {
      console.log(`[Storage] Getting ${key}:`, item ? 'found' : 'not found');
    }
    return item;
  },
  setItem: (key: string, value: string) => {
    if (SHOULD_LOG_STORAGE) {
      console.log(`[Storage] Setting ${key}`);
    }
    window.localStorage.setItem(key, value);
    if (key === AUTH_STORAGE_KEY) {
      syncAuthCookieMirror(value);
    }
  },
  removeItem: (key: string) => {
    if (SHOULD_LOG_STORAGE) {
      console.log(`[Storage] Removing ${key}`);
    }
    window.localStorage.removeItem(key);
    if (key === AUTH_STORAGE_KEY && AUTH_STORAGE_KEY !== LEGACY_AUTH_STORAGE_KEY) {
      window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    }
    if (key === AUTH_STORAGE_KEY || key === LEGACY_AUTH_STORAGE_KEY) {
      syncAuthCookieMirror(null);
    }
  },
};

if (typeof window !== 'undefined') {
  const bootStoredSession = readStoredSessionValue(AUTH_STORAGE_KEY);
  if (bootStoredSession) {
    queueMicrotask(() => {
      syncAuthCookieMirror(bootStoredSession);
    });
  }
}

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
    storageKey: AUTH_STORAGE_KEY,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
    fetch: fetchWithTimeout,
  }
});

export async function getSessionUser(timeoutMs = FETCH_TIMEOUT_MS): Promise<User | null> {
  const {
    data: { session },
    error,
  } = await withSupabaseTimeout(
    supabase.auth.getSession(),
    'auth session lookup',
    timeoutMs
  );

  if (error) {
    throw error;
  }

  return session?.user ?? null;
}
