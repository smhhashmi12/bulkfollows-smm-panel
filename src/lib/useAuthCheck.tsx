import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type AuthCache = {
  user: any;
  timestamp: number;
};

const AUTH_CACHE_TTL_MS = 5 * 60_000;
const AUTH_CHECK_TIMEOUT_MS = 15_000;

// Cache auth lookup to avoid repeated network checks on every dashboard page switch
let authCheckCache: AuthCache | null = null;
let authCheckPromise: Promise<any> | null = null;
let authListenerInitialized = false;

const ensureAuthListener = () => {
  if (authListenerInitialized) return;
  authListenerInitialized = true;
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    authCheckCache = {
      user,
      timestamp: Date.now(),
    };
    console.log('[useAuthCheck] Auth state changed:', event);
  });
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Auth check timeout')), timeoutMs)
    ),
  ]);
};

const fetchAuthUser = async () => {
  // Session lookup is local/fast and enough for route guards
  const sessionPromise = supabase.auth.getSession();
  try {
    const { data: sessionData } = await withTimeout(
      sessionPromise,
      AUTH_CHECK_TIMEOUT_MS
    );
    const user = sessionData?.session?.user || null;
    authCheckCache = {
      user,
      timestamp: Date.now(),
    };
    return user;
  } catch (error) {
    console.warn('[useAuthCheck] Auth check timeout, using cached user if available');
    // Update cache when the original promise eventually resolves
    sessionPromise
      .then(({ data }) => {
        authCheckCache = {
          user: data?.session?.user || null,
          timestamp: Date.now(),
        };
      })
      .catch(() => {});
    return authCheckCache?.user || null;
  }
};

export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    ensureAuthListener();
    const checkAuth = async () => {
      try {
        // Wait a tiny bit for localStorage to be ready
        await new Promise(resolve => setTimeout(resolve, 50));

        // Use fresh cache first
        if (authCheckCache && Date.now() - authCheckCache.timestamp < AUTH_CACHE_TTL_MS) {
          console.log('[useAuthCheck] Using cached auth result');
          setIsAuthenticated(authCheckCache.user !== null);
          setIsChecking(false);
          return;
        }

        // If a check is already in progress, wait for it
        if (authCheckPromise) {
          console.log('[useAuthCheck] Waiting for in-progress auth check');
          const user = await authCheckPromise;
          setIsAuthenticated(user !== null);
          setIsChecking(false);
          return;
        }

        // Otherwise, perform the check
        console.log('[useAuthCheck] Performing new auth check');
        authCheckPromise = fetchAuthUser();
        const user = await authCheckPromise;
        setIsAuthenticated(user !== null);
      } catch (error) {
        console.error('[useAuthCheck] Auth check failed:', error);
        if (authCheckCache?.user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        authCheckPromise = null;
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  return { isAuthenticated, isChecking };
};

// Export a function to manually get the cached user without React
export const getCachedAuthUser = async () => {
  ensureAuthListener();
  // Use fresh cache first
  if (authCheckCache && Date.now() - authCheckCache.timestamp < AUTH_CACHE_TTL_MS) {
    console.log('[getCachedAuthUser] Using cache');
    return authCheckCache.user;
  }

  // Deduplicate in-flight checks to prevent multiple parallel auth calls
  if (authCheckPromise) {
    console.log('[getCachedAuthUser] Waiting for in-progress auth check');
    return await authCheckPromise;
  }

  console.log('[getCachedAuthUser] Fetching fresh session');
  try {
    authCheckPromise = fetchAuthUser();
    return await authCheckPromise;
  } catch (error) {
    console.error('[getCachedAuthUser] Auth fetch failed:', error);
    // Fail-safe fallback: return last known cached value (if any) to prevent spinner loops
    return authCheckCache?.user || null;
  } finally {
    authCheckPromise = null;
  }
};
