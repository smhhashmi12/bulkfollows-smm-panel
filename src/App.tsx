import React, { Suspense, lazy, startTransition, useEffect, useRef, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { authAPI } from './lib/api';
import { CurrencyProvider } from './lib/CurrencyContext';
import { NotificationProvider } from './lib/NotificationContext';
import { QueryClientProvider } from './lib/QueryClientProvider';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLogin'));
const UserLoginPage = lazy(() => import('./pages/UserLogin'));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage'));
const LiveChatWidget = lazy(() => import('./components/LiveChatWidget'));
const Analytics = lazy(async () => {
  const module = await import('@vercel/analytics/react');
  return { default: module.Analytics };
});

const USER_CACHE_KEY = 'app.currentUser';

export type User = {
  id?: string;
  username: string;
  role: 'user' | 'admin';
};

const readCachedUser = (): User | null => {
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as User;
    if (!parsed?.username || !parsed?.role) return null;

    return parsed;
  } catch {
    return null;
  }
};

const writeCachedUser = (user: User | null) => {
  if (!user) {
    window.localStorage.removeItem(USER_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
};

const getBootstrapUserFromSession = (session: Session): User | null => {
  const username =
    String(session.user.user_metadata?.username || '').trim() ||
    String(session.user.email || '').split('@')[0]?.trim() ||
    '';

  if (!username) {
    return null;
  }

  return {
    id: session.user.id,
    username,
    role: session.user.app_metadata?.role === 'admin' ? 'admin' : 'user',
  };
};

const AppLoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="bg-brand-dark ds-noise text-white font-sans min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
      <p>{message}</p>
    </div>
  </div>
);

const AuthRecoveryScreen: React.FC<{
  message: string;
  onRetry: () => void;
  onLogout: () => void;
}> = ({ message, onRetry, onLogout }) => (
  <div className="bg-brand-dark ds-noise text-white font-sans min-h-screen flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-brand-container border border-brand-border rounded-2xl p-8 text-center">
      <h1 className="text-2xl font-bold mb-3">Session Needs Attention</h1>
      <p className="text-sm text-gray-300 mb-6">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onRetry} className="ds-btn-primary flex-1 px-4 py-3 rounded-lg font-semibold">
          Retry Session Restore
        </button>
        <button onClick={onLogout} className="ds-btn-secondary flex-1 px-4 py-3 rounded-lg font-semibold">
          Sign Out
        </button>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const initialCachedUser = readCachedUser();
  const [route, setRoute] = useState(window.location.hash || '#/');
  const [currentUser, setCurrentUser] = useState<User | null>(initialCachedUser);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [authRecoveryMessage, setAuthRecoveryMessage] = useState<string | null>(null);
  const [deferredUiReady, setDeferredUiReady] = useState(false);
  const sessionCheckDone = useRef(false);
  const currentUserRef = useRef<User | null>(initialCachedUser);
  const profileRefreshRef = useRef<Promise<User | null> | null>(null);

  const persistCurrentUser = (user: User | null) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    writeCachedUser(user);
  };

  const restoreCachedUser = (sessionUserId?: string): User | null => {
    const cachedUser = readCachedUser();
    
    if (!cachedUser) return null;
    
    // Single validation logic - eliminate duplicate checks
    if (sessionUserId && cachedUser.id !== sessionUserId) {
      writeCachedUser(null);
      persistCurrentUser(null);  // Use persistCurrentUser instead of ref check
      return null;
    }
    
    persistCurrentUser(cachedUser);
    return cachedUser;
  };

  const refreshCurrentUser = async (reason: string) => {
    if (profileRefreshRef.current) {
      return profileRefreshRef.current;
    }

    setProfileRefreshing(true);
    setAuthRecoveryMessage(null);

    const task = (async () => {
      try {
        const user = await authAPI.getCurrentUser();

        if (user) {
          persistCurrentUser(user);
          return user;
        }

        if (!currentUserRef.current) {
          setAuthRecoveryMessage('Your auth token is still present, but the account profile could not be restored.');
        }

        return currentUserRef.current;
      } catch (error) {
        console.error(`[Auth] Failed to refresh user profile during ${reason}:`, error);

        if (!currentUserRef.current) {
          setAuthRecoveryMessage('A valid session exists, but the profile lookup is failing or timing out.');
        }

        return currentUserRef.current;
      } finally {
        profileRefreshRef.current = null;
        setProfileRefreshing(false);
      }
    })();

    profileRefreshRef.current = task;
    return task;
  };

  const syncSession = async (session: Session | null, reason: string, awaitProfile: boolean) => {
    if (!session) {
      setHasSession(false);
      setAuthRecoveryMessage(null);
      persistCurrentUser(null);
      setLoading(false);
      return;
    }

    setHasSession(true);

    const cachedUser = restoreCachedUser(session.user.id);
    if (!cachedUser && currentUserRef.current?.id && currentUserRef.current.id !== session.user.id) {
      persistCurrentUser(null);
    }

    const bootstrapUser = cachedUser ?? getBootstrapUserFromSession(session);
    if (!cachedUser && bootstrapUser) {
      persistCurrentUser(bootstrapUser);
    }

    const refreshTask = refreshCurrentUser(reason);
    if (awaitProfile && !cachedUser && !bootstrapUser) {
      await refreshTask;
    }

    setLoading(false);
  };

  const retrySessionRestore = async () => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await syncSession(session, 'manual retry', true);
    } catch (error) {
      console.error('[Auth] Manual session restore failed:', error);
      setAuthRecoveryMessage('Session restore failed again. Signing out and logging in again is safer.');
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestIdle =
      'requestIdleCallback' in window
        ? (window.requestIdleCallback as (callback: IdleRequestCallback, options?: IdleRequestOptions) => number)
        : null;
    const cancelIdle =
      'cancelIdleCallback' in window
        ? (window.cancelIdleCallback as (handle: number) => void)
        : null;

    let cancelled = false;
    let fallbackId: number | null = null;
    let idleId: number | null = null;

    const enableDeferredUi = () => {
      if (cancelled) return;
      startTransition(() => {
        setDeferredUiReady(true);
      });
    };

    if (requestIdle) {
      idleId = requestIdle(enableDeferredUi, { timeout: 1500 });
    } else {
      fallbackId = window.setTimeout(enableDeferredUi, 1200);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && cancelIdle) {
        cancelIdle(idleId);
      }
      if (fallbackId !== null) {
        window.clearTimeout(fallbackId);
      }
    };
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (sessionCheckDone.current) return;
      sessionCheckDone.current = true;

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const cachedUser = readCachedUser();
        const shouldAwaitProfile = !(cachedUser && session?.user?.id && cachedUser.id === session.user.id);

        await syncSession(session, 'initial session', shouldAwaitProfile);
      } catch (error) {
        console.error('[Auth] Error during auth initialization:', error);
        setHasSession(false);
        persistCurrentUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Event:', event, 'Session:', !!session);

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setHasSession(false);
        setAuthRecoveryMessage(null);
        persistCurrentUser(null);
        setLoading(false);
        return;
      }

      if (!session) {
        return;
      }

      const shouldAwaitProfile = event === 'SIGNED_IN' || !currentUserRef.current;
      await syncSession(session, `auth event: ${event}`, shouldAwaitProfile);
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setHasSession(false);
          persistCurrentUser(null);
          return;
        }

        setHasSession(true);
        restoreCachedUser(session.user.id);
        if (!currentUserRef.current) {
          const bootstrapUser = getBootstrapUserFromSession(session);
          if (bootstrapUser) {
            persistCurrentUser(bootstrapUser);
          }
        }

        if (!currentUserRef.current || currentUserRef.current.id !== session.user.id) {
          await refreshCurrentUser('visibility change');
        }
      } catch (error) {
        console.error('[Auth] Error checking session on visibility change:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      startTransition(() => {
        setRoute(window.location.hash || '#/');
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleLogin = (user: User) => {
    setHasSession(true);
    setAuthRecoveryMessage(null);
    persistCurrentUser(user);

    if (user.role === 'admin') {
      window.location.hash = '#/admin/dashboard';
      return;
    }

    window.location.hash = '#/dashboard/new-order';
  };

  const handleLogout = async () => {
    try {
      await authAPI.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setHasSession(false);
      setAuthRecoveryMessage(null);
      persistCurrentUser(null);
      window.location.hash = '#/';
    }
  };

  const renderPage = () => {
    if (route.startsWith('#/admin')) {
      if (loading || (hasSession && !currentUser && profileRefreshing)) {
        return <AppLoadingScreen message="Restoring admin session..." />;
      }

      if (currentUser?.role === 'admin') {
        return <AdminDashboard onLogout={handleLogout} />;
      }

      if (hasSession && authRecoveryMessage) {
        return (
          <AuthRecoveryScreen
            message={authRecoveryMessage}
            onRetry={retrySessionRestore}
            onLogout={handleLogout}
          />
        );
      }

      return <AdminLoginPage onLoginSuccess={handleLogin} />;
    }

    if (route.startsWith('#/dashboard')) {
      if (loading || (hasSession && !currentUser && profileRefreshing)) {
        return <AppLoadingScreen message="Restoring session..." />;
      }

      if (currentUser?.role === 'admin') {
        window.location.hash = '#/admin/dashboard';
        return <AppLoadingScreen message="Redirecting..." />;
      }

      if (currentUser) {
        return <UserDashboard user={currentUser} onLogout={handleLogout} />;
      }

      if (hasSession && authRecoveryMessage) {
        return (
          <AuthRecoveryScreen
            message={authRecoveryMessage}
            onRetry={retrySessionRestore}
            onLogout={handleLogout}
          />
        );
      }

      window.location.hash = '#/login';
      return <UserLoginPage onLoginSuccess={handleLogin} />;
    }

    if ((route === '#/login' || route === '#/register') && currentUser?.role === 'admin') {
      window.location.hash = '#/admin/dashboard';
      return <AppLoadingScreen message="Redirecting..." />;
    }

    if ((route === '#/login' || route === '#/register') && currentUser) {
      window.location.hash = '#/dashboard/new-order';
      return <AppLoadingScreen message="Redirecting..." />;
    }

    if (route === '#/login') {
      return <UserLoginPage onLoginSuccess={handleLogin} />;
    }

    if (route === '#/register') {
      return <RegistrationPage />;
    }

    return <LandingPage currentUser={currentUser} onLogout={handleLogout} />;
  };

  const shouldShowChat = !route.startsWith('#/admin');
  const shouldShowAnalytics =
    deferredUiReady && !['localhost', '127.0.0.1'].includes(window.location.hostname);

  return (
    <ErrorBoundary>
      <QueryClientProvider>
        <NotificationProvider>
          <CurrencyProvider>
            <Suspense fallback={<AppLoadingScreen />}>
              {renderPage()}
              {deferredUiReady && shouldShowChat ? <LiveChatWidget /> : null}
            </Suspense>
          </CurrencyProvider>
        </NotificationProvider>
        {shouldShowAnalytics ? (
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
