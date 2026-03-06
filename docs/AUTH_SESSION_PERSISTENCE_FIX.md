# Authentication Session Persistence Fix

## Problem Statement
Users were experiencing critical authentication issues:
1. **Session Lost on Browser Minimize/Close** - Closing the browser and reopening requires re-login
2. **Multiple Account Login Conflicts** - Logging in with different accounts overwrites each other
3. **Session Not Restored on Page Reload** - Refreshing the page causes logout

## Root Causes Identified

### 1. Session Not Persisting to localStorage
- Supabase was not properly configured to persist sessions
- Custom storage mechanism wasn't being used
- Sessions were only kept in memory, lost on browser close

### 2. Token Expiry Without Refresh
- No mechanism to refresh tokens before expiry
- Sessions expiring during inactivity
- No refresh on window focus

### 3. Poor Auth State Recovery
- `withTimeout` wrapper was breaking session restoration on mount
- Auth listener not properly handling `INITIAL_SESSION` event
- Session restoration race conditions on page load

### 4. Multiple Login Conflicts
- Same browser shares localStorage key for all tabs
- No per-window session isolation
- Last login overwrites previous one

## Solutions Implemented

### 1. Enhanced Supabase Configuration (lib/supabase.ts)

```typescript
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,           // Persist sessions to localStorage
    autoRefreshToken: true,         // Automatically refresh tokens
    detectSessionInUrl: true,       // Handle OAuth redirects
    storage: customStorage,         // Custom storage with logging
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',              // PKCE for better security
  },
});
```

**Key Features:**
- `persistSession: true` - Sessions persist even after browser close
- `autoRefreshToken: true` - Tokens auto-refresh before expiry
- Custom storage wrapper with logging for debugging
- PKCE flow for enhanced security

### 2. Improved Auth Initialization (App.tsx)

**Removed:**
- ❌ `withTimeout` wrapper that was breaking session restoration
- ❌ Artificial delays that weren't necessary

**Added:**
- ✅ Explicit session restoration on mount via `getSession()`
- ✅ Storage inspection to verify token is saved
- ✅ Proper async/await handling without timeouts
- ✅ INITIAL_SESSION event handling
- ✅ Visibility change detection for tab focus recovery

```typescript
useEffect(() => {
  const initializeAuth = async () => {
    if (sessionCheckDone.current) return;
    sessionCheckDone.current = true;

    try {
      console.log('[Auth] Initializing auth - checking for existing session...');
      
      // Check localStorage first
      const authTokenStr = window.localStorage.getItem('supabase.auth.token');
      if (authTokenStr) {
        console.log('[Auth] Auth token found in localStorage');
      }
      
      // Get session from Supabase (restores from localStorage)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[Auth] Session found, user:', session.user.email);
        const user = await authAPI.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  initializeAuth();

  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[Auth] Event:', event, 'Session:', !!session);
      
      if (event === 'SIGNED_IN') {
        // User just signed in
        const user = await authAPI.getCurrentUser();
        if (user) setCurrentUser(user);
      } else if (event === 'TOKEN_REFRESHED') {
        // Token auto-refreshed, session still valid
        console.log('[Auth] TOKEN_REFRESHED - Session still valid');
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setCurrentUser(null);
      } else if (event === 'INITIAL_SESSION') {
        // Fires when Supabase loads session from storage
        if (session) {
          const user = await authAPI.getCurrentUser();
          if (user) setCurrentUser(user);
        }
      }
    }
  );

  // Detect when tab comes back to focus
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      console.log('[Auth] Page became visible, checking session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !currentUser) {
        const user = await authAPI.getCurrentUser();
        if (user) setCurrentUser(user);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    subscription.unsubscribe();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### 3. Aggressive Token Refresh (App.tsx)

Tokens refresh automatically via Supabase, but we also add explicit refresh:
- Every 3 minutes (more aggressive than 5 mins)
- When window gains focus
- Automatically via Supabase's `autoRefreshToken` option

```typescript
useEffect(() => {
  const refreshToken = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[Token Refresh] Failed:', error);
      } else if (session) {
        console.log('[Token Refresh] Success - token refreshed');
      }
    } catch (error) {
      console.error('[Token Refresh] Error:', error);
    }
  };

  // Refresh immediately on mount if user is logged in
  if (currentUser) {
    refreshToken();
  }

  // Refresh every 3 minutes
  const tokenRefreshInterval = setInterval(refreshToken, 3 * 60 * 1000);

  // Refresh when window gains focus
  const handleWindowFocus = () => {
    console.log('[Auth] Window focused - checking session...');
    refreshToken();
  };

  window.addEventListener('focus', handleWindowFocus);

  return () => {
    clearInterval(tokenRefreshInterval);
    window.removeEventListener('focus', handleWindowFocus);
  };
}, [currentUser]);
```

### 4. Removed `withTimeout` from Admin Login

**Before:**
```typescript
user = await withTimeout(authAPI.getCurrentUser(), 8000);
```

**After:**
```typescript
const user = await authAPI.getCurrentUser();
```

The timeout wrapper was causing:
- Race conditions during session restoration
- Premature failures on slow networks
- Breaking the auth listener flow

## How Session Persistence Works Now

### Scenario 1: User Closes Browser and Reopens
1. User logs in → Token saved to `localStorage['supabase.auth.token']`
2. User closes browser
3. User reopens browser
4. App.tsx runs `initializeAuth()` on mount
5. `supabase.auth.getSession()` reads token from localStorage
6. Session is restored automatically
7. User is logged in without re-entering credentials ✅

### Scenario 2: User Minimizes Browser
1. Browser is minimized
2. `visibilitychange` event fires when app is hidden
3. When user restores browser window, `visibilitychange` fires again
4. `handleVisibilityChange` checks if session is still valid
5. Session is maintained ✅

### Scenario 3: Multiple Tabs with Different Accounts
⚠️ **Limitation:** In the same browser window, only ONE account can be logged in at a time (shared localStorage)

**Workaround:**
- Use different browsers (Chrome, Firefox, Edge)
- Use incognito/private windows (each has separate localStorage)
- Use different user profiles in same browser (if OS supports it)

This is a browser security model limitation, not an app bug.

### Scenario 4: Page Refresh While Logged In
1. User is logged in and refreshes page
2. `sessionCheckDone` ref prevents duplicate auth checks
3. `getSession()` restores session from localStorage
4. User remains logged in ✅

### Scenario 5: Token Expires During Inactivity
1. Supabase's `autoRefreshToken` detects expiry approaching
2. Automatic refresh happens in background
3. Token refreshed without user interaction
4. Session continues seamlessly ✅

## Debugging Session Issues

### Check Browser Console Logs
Open DevTools → Console and look for `[Auth]` and `[Token Refresh]` messages:

```
[Storage] Setting supabase.auth.token
[Auth] Initializing auth - checking for existing session...
[Auth] Auth token found in localStorage
[Auth] Session found, user: user@example.com
[Auth] User profile loaded: John
[Auth] Event: SIGNED_IN Session: true
[Token Refresh] Success - token refreshed
```

### Check localStorage for Token
1. Open DevTools → Application tab
2. Look for `supabase.auth.token` in localStorage
3. Should be a JSON object with:
   - `access_token` - JWT token
   - `refresh_token` - Token to refresh access token
   - `expires_at` - When token expires
   - `expires_in` - Seconds until expiry

### Enable Detailed Logging
Edit `lib/supabase.ts` to add more verbose logging:

```typescript
const customStorage = {
  getItem: (key: string) => {
    const item = window.localStorage.getItem(key);
    console.log(`[Storage] GET ${key}:`, item ? 'FOUND' : 'MISSING');
    if (item) {
      try {
        const parsed = JSON.parse(item);
        console.log('[Storage] Token contents:', {
          hasAccessToken: !!parsed.access_token,
          hasRefreshToken: !!parsed.refresh_token,
          expiresIn: parsed.expires_in,
          expiresAt: new Date(parsed.expires_at * 1000).toISOString(),
        });
      } catch (e) {
        console.log('[Storage] Token parse failed');
      }
    }
    return item;
  },
  // ... rest of storage
};
```

### Test Session Persistence
1. **Test Case 1: Browser Close**
   - Login as user@example.com
   - Check localStorage has token
   - Close entire browser
   - Reopen browser
   - Check if logged in ✅

2. **Test Case 2: Page Refresh**
   - Login as user@example.com
   - Press Ctrl+R to refresh
   - Should remain logged in ✅

3. **Test Case 3: Tab Minimize**
   - Login as user@example.com
   - Minimize browser window
   - Restore browser window
   - Should remain logged in ✅

4. **Test Case 4: Multiple Tabs**
   - Open Tab 1, login as user@example.com
   - Open Tab 2, try to login as admin@example.com
   - Both should work (but only one active in localStorage)
   - Check DevTools → Console for auth events

5. **Test Case 5: Long Inactivity**
   - Login as user@example.com
   - Wait 30 minutes
   - Refresh page
   - Should be logged in (token was refreshed) ✅

## Still Having Issues?

### Clear localStorage and Try Again
```javascript
// In browser console:
localStorage.removeItem('supabase.auth.token');
location.reload();
```

### Check Network Requests
1. Open DevTools → Network tab
2. Look for requests to `supabase_project.supabase.co/auth/v1/`
3. Check response status and error messages
4. Look for CORS issues

### Check Supabase Logs
1. Go to Supabase dashboard
2. Check Auth logs for failed sign-in attempts
3. Check PostgreSQL logs for connection issues

### Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Session restores but not loading user profile" | `getCurrentUser()` failing | Check if `user_profiles` table has data for the user |
| "Stuck on loading page after refresh" | Session check timeout | Removed `withTimeout`, should work now |
| "Login with different account logs out first account" | Shared localStorage | Expected behavior - use separate browser/incognito |
| "Token refresh happening too often" | Aggressive refresh schedule | Reduce interval or rely on Supabase's autoRefreshToken |
| "console shows 'No session found'" | Token expired and not refreshed | Check Supabase service status, try logout/login |

## Files Modified

1. **lib/supabase.ts**
   - Added custom storage wrapper with logging
   - Configured `persistSession: true`
   - Configured `autoRefreshToken: true`
   - Added PKCE flow

2. **App.tsx**
   - Removed `withTimeout` wrapper
   - Improved session initialization
   - Added visibility change detection
   - Improved auth event handling
   - Added token refresh mechanism

3. **pages/admin/AdminLogin.tsx**
   - Removed `withTimeout` usage
   - Simplified error handling

4. **tsconfig.json**
   - Added `vite/client` to types for `import.meta.env`

## Next Steps

1. **Test in browser** - Verify session persists after minimize/close
2. **Monitor console logs** - Ensure auth events fire correctly
3. **Check localStorage** - Verify token is saved with correct structure
4. **Test multiple scenarios** - Page refresh, window focus, long inactivity
5. **Deploy to production** - Session persistence should work everywhere

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JS Client Options](https://supabase.com/docs/reference/javascript/auth-on-auth-state-change)
- [MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
