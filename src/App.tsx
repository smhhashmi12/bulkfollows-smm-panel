import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './pages/LandingPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLoginPage from './pages/admin/AdminLogin';
import UserLoginPage from './pages/UserLogin';
import RegistrationPage from './pages/RegistrationPage';
import { supabase } from './lib/supabase';
import { authAPI } from './lib/api';
import { CurrencyProvider } from './lib/CurrencyContext';
import { NotificationProvider } from './lib/NotificationContext';
import LiveChatWidget from './components/LiveChatWidget';
import { Analytics } from '@vercel/analytics/react';


// Define a type for the user object for better type safety.
export type User = {
  id?: string;
  username: string;
  role: 'user' | 'admin';
};

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);
  // A single state to hold the current logged-in user object or null.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionCheckDone = useRef(false);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    // Check for existing session on mount
    const initializeAuth = async () => {
      if (sessionCheckDone.current) return;
      sessionCheckDone.current = true;

      try {
        console.log('[Auth] Initializing auth - checking for existing session...');
        
        // First, check if there's a session in localStorage
        const authTokenStr = window.localStorage.getItem('supabase.auth.token');
        if (authTokenStr) {
          console.log('[Auth] Auth token found in localStorage');
        } else {
          console.log('[Auth] No auth token in localStorage');
        }
        
        // Get current session from Supabase (this will restore from localStorage)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth] Error getting session:', sessionError);
          setLoading(false);
          return;
        }

        if (session) {
          console.log('[Auth] Session found, user:', session.user.email);
          // Session exists, fetch current user profile
          try {
            const user = await authAPI.getCurrentUser();
            if (user) {
              console.log('[Auth] User profile loaded:', user.username);
              setCurrentUser(user);
            } else {
              console.warn('[Auth] Session exists but no user profile found');
              setCurrentUser(null);
            }
          } catch (error) {
            console.error('[Auth] Failed to fetch user profile:', error);
            setCurrentUser(null);
          }
        } else {
          console.log('[Auth] No session found - user needs to login');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('[Auth] Error during auth initialization:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Event:', event, 'Session:', !!session);
      
      if (event === 'SIGNED_IN') {
        // User just signed in
        console.log('[Auth] User SIGNED_IN');
        if (session) {
          try {
            console.log('[Auth] Fetching user profile after sign in...');
            const user = await authAPI.getCurrentUser();
            if (user) {
              console.log('[Auth] User profile loaded after sign in:', user.username);
              setCurrentUser(user);
            }
          } catch (error) {
            console.error('[Auth] Failed to fetch user profile:', error);
            setCurrentUser(null);
          }
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Token was auto-refreshed (session still valid)
        console.log('[Auth] TOKEN_REFRESHED - Session still valid');
        // User is still logged in, no need to fetch profile again
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        console.log('[Auth] User SIGNED_OUT');
        setCurrentUser(null);
      } else if (event === 'INITIAL_SESSION') {
        // This event fires when Supabase first loads the session from storage
        console.log('[Auth] INITIAL_SESSION event');
        if (session) {
          try {
            const user = await authAPI.getCurrentUser();
            if (user) {
              console.log('[Auth] User profile from INITIAL_SESSION:', user.username);
              setCurrentUser(user);
            }
          } catch (error) {
            console.error('[Auth] Failed to fetch user profile:', error);
          }
        }
      }
    });

    // Listen for visibility changes to re-check session when tab comes back to focus
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Auth] Page became visible, checking session...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && !currentUserRef.current) {
            console.log('[Auth] Session recovered on visibility change');
            const user = await authAPI.getCurrentUser();
            if (user) {
              setCurrentUser(user);
            }
          } else if (!session && currentUserRef.current) {
            console.log('[Auth] Session expired while page was hidden');
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('[Auth] Error checking session on visibility change:', error);
        }
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
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Set initial route

    // If the user refreshes on a protected page, check auth
    const protectedRoutes = ['#/dashboard', '#/admin'];
  if (protectedRoutes.some(r => window.location.hash.startsWith(r)) && !currentUser && !loading) {
    window.location.hash = '#/';
  }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [currentUser, loading]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      window.location.hash = '#/admin/dashboard';
    } else {
      window.location.hash = '#/dashboard';
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.signOut();
      setCurrentUser(null);
      window.location.hash = '#/'; // Redirect to landing page on logout.
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-brand-dark ds-noise text-white font-sans min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    // Admin Routes
    if (route.startsWith('#/admin')) {
      if (currentUser?.role === 'admin') {
        return <AdminDashboard onLogout={handleLogout} />;
      }
      return <AdminLoginPage onLoginSuccess={handleLogin} />;
    }
    
    // User Dashboard Routes
    if (route.startsWith('#/dashboard')) {
      if (currentUser) { // Any logged-in user can see their dashboard
        return <UserDashboard user={currentUser} onLogout={handleLogout} />;
      }
       // If not logged in, redirect to user login
      window.location.hash = '#/login';
      return <UserLoginPage onLoginSuccess={handleLogin} />;
    }
    
    // User Login Page
    if (route === '#/login') {
        return <UserLoginPage onLoginSuccess={handleLogin} />;
    }

    // Registration Page
    if (route === '#/register') {
      return <RegistrationPage />;
    }

    // Default to Landing Page
    return <LandingPage currentUser={currentUser} onLogout={handleLogout} onLoginSuccess={handleLogin} />;
  };

  const shouldShowChat = !route.startsWith('#/admin');

  return (
    <>
      <NotificationProvider>
        <CurrencyProvider>
          {renderPage()}
          {shouldShowChat && <LiveChatWidget />}
        </CurrencyProvider>
      </NotificationProvider>
      <Analytics />
    </>
  );
};

export default App;
