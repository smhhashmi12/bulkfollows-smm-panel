# Auth Session Persistence - Testing Checklist

## Pre-Test Setup
- [ ] Clear browser localStorage: `localStorage.clear()` in console
- [ ] Close all browser tabs and windows
- [ ] Open DevTools (F12) → Console tab
- [ ] Keep console visible during all tests

## Test 1: Basic Login ✅
**Expected:** User logs in and session token is saved

- [ ] Go to `/login` page
- [ ] Enter credentials: `user@example.com` / `password`
- [ ] Click Login
- [ ] Check console for: `[Auth] Session found` messages
- [ ] Check localStorage: DevTools → Application → localStorage
- [ ] Should see `supabase.auth.token` entry with JSON data

**Logs to expect:**
```
[Auth] Event: SIGNED_IN Session: true
[Auth] Fetching user profile after sign in...
[Auth] User profile loaded after sign in: [username]
```

## Test 2: Browser Close & Reopen 🔄
**Expected:** User stays logged in after closing and reopening browser

1. **Setup:** Complete Test 1 first
2. Close entire browser completely (not just tab)
3. Reopen browser
4. Go to http://localhost:3000
5. Check console

**Logs to expect:**
```
[Auth] Initializing auth - checking for existing session...
[Auth] Auth token found in localStorage
[Auth] Session found, user: user@example.com
[Auth] User profile loaded: [username]
```

**Result:** ✅ Should be logged in without re-entering credentials

## Test 3: Page Refresh 🔃
**Expected:** User stays logged in after page refresh

1. **Setup:** User should be logged in
2. Press Ctrl+R (or Cmd+R) to refresh page
3. Wait for page to load
4. Check console

**Result:** ✅ Should still be logged in, dashboard should load without login redirect

## Test 4: Browser Minimize/Restore 🪟
**Expected:** User stays logged in when minimizing browser

1. **Setup:** User should be logged in
2. Minimize browser window to taskbar/dock
3. Wait 5 seconds
4. Click taskbar to restore browser window
5. Check console for visibility change logs

**Logs to expect:**
```
[Auth] Page became visible, checking session...
[Auth] Session found, user: user@example.com
```

**Result:** ✅ Should remain logged in

## Test 5: Tab in Background 📁
**Expected:** User stays logged in when tab is in background

1. **Setup:** User should be logged in in Tab A
2. Open a new tab (Tab B) with something else
3. Click on Tab B (Tab A goes to background)
4. Wait 10 seconds
5. Click on Tab A
6. Check console

**Logs to expect:**
```
[Auth] Page became visible, checking session...
```

**Result:** ✅ Tab A should still be logged in

## Test 6: Admin Login
**Expected:** Admin can login with admin credentials

1. Go to `/admin` page
2. Enter credentials: `admin@example.com` / `password`
3. Click Login
4. Check console for login logs

**Logs to expect:**
```
[Auth] Event: SIGNED_IN Session: true
[Auth] User profile loaded after sign in: [admin-username]
```

**Result:** ✅ Should be in admin dashboard

## Test 7: Token Refresh 🔄
**Expected:** Token auto-refreshes every 3 minutes

1. **Setup:** User should be logged in
2. Open console
3. Wait 3+ minutes
4. Check console

**Logs to expect:**
```
[Auth] Window focused - checking session...
[Token Refresh] Success - token refreshed
```

**Result:** ✅ Token refresh logs should appear every 3 minutes

## Test 8: Different Accounts in Different Browsers 🌐
**Expected:** Different browsers can have different logged-in accounts

1. **Setup Setup:** Browser A open
2. Open Firefox (or Chrome if using Firefox) - Browser B
3. In Browser A: Login as `user@example.com`
4. In Browser B: Login as `admin@example.com`
5. In Browser A: Check still on user dashboard
6. In Browser B: Check still on admin dashboard

**Result:** ✅ Both should work independently

## Test 9: Session Timeout Recovery ⏱️
**Expected:** Session recovers after being idle

1. **Setup:** User should be logged in
2. Make a note of when user last active
3. Don't interact with page for 10+ minutes
4. Click on page or refresh
5. Check console

**Logs to expect:**
```
[Token Refresh] Success - token refreshed
```

**Result:** ✅ Should still be logged in, token should have been refreshed

## Test 10: Logout Works Correctly
**Expected:** After logout, session is cleared

1. **Setup:** User should be logged in
2. Click Logout button
3. Check console
4. Try to access dashboard

**Logs to expect:**
```
[Auth] User SIGNED_OUT or DELETED
```

**Result:** ✅ Should be redirected to login page, localStorage should not have valid token

## Troubleshooting Table

| What to Check | Where | What to Look For |
|--|--|--|
| Token is saved | DevTools → Application → localStorage | `supabase.auth.token` entry should exist |
| Token structure | Console: `JSON.parse(localStorage['supabase.auth.token'])` | Should have `access_token`, `refresh_token`, `expires_at` |
| Auth events | Console | Should see `[Auth]` prefixed logs |
| Session restoration | Console on page load | Should see `[Auth] Session found` logs |
| Token refresh | Console | Should see `[Token Refresh] Success` logs every 3 minutes |
| Visibility changes | Console | Should see `[Auth] Page became visible` logs |

## Console Commands for Debugging

```javascript
// Check if token exists
localStorage.getItem('supabase.auth.token')

// Check token details
JSON.parse(localStorage.getItem('supabase.auth.token'))

// Check if token is expired
const token = JSON.parse(localStorage.getItem('supabase.auth.token'));
const expiresAt = new Date(token.expires_at * 1000);
console.log('Expires at:', expiresAt);
console.log('Expired?', expiresAt < new Date());

// Clear all auth data (for testing)
localStorage.removeItem('supabase.auth.token');
location.reload();

// Monitor token refresh (every 3 minutes)
setInterval(() => {
  const token = JSON.parse(localStorage.getItem('supabase.auth.token'));
  console.log('Token refresh check:', new Date().toLocaleTimeString(), 'Expires in', Math.round((token.expires_at * 1000 - Date.now()) / 1000), 'seconds');
}, 60000); // Check every minute
```

## Success Criteria

- [x] Session persists after browser close/reopen
- [x] Session persists after page refresh
- [x] Session persists when browser is minimized
- [x] Session persists when tab is in background
- [x] Token refreshes every 3 minutes
- [x] Different browsers can have different accounts logged in
- [x] Admin login works correctly
- [x] User login works correctly
- [x] Logout clears session properly
- [x] Console logs are clear and helpful

## Notes

- All tests assume http://localhost:3000 is running with dev server
- Test accounts:
  - Regular user: `user@example.com` / `password`
  - Admin user: `admin@example.com` / `password`
- If any test fails, check the browser console for detailed error logs
- Clear localStorage between tests if you want a fresh start
- Keep DevTools open during all tests to see logs in real-time
