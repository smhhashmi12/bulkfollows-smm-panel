# Provider Management - Quick Start Guide

## 🚀 Quick Test Instructions

### 1. Navigate to Provider Management
```
URL: http://localhost:3000/admin/
Then click "Providers" in sidebar (or sidebar menu)
Path: /admin/providers or /pages/admin/ProviderManagement.tsx
```

### 2. Add Your First Provider
**Click:** "+ Add New Provider" button (top right)

**Fill In:**
```
Name: Test Provider
API URL: https://api.yourprovider.com
API Key: your-api-key-123
(API Secret: optional)
```

**Test It:**
```
1. Click "🧪 Test Connection"
2. Wait for result (shows balance if successful)
3. If ✓ Success → Click "✓ Create"
4. If ✗ Failed → Check credentials and retry
```

### 3. Manage Your Provider
After creating, you'll see it in the table with 6 action buttons:

| Button | What It Does | When to Use |
|--------|---|---|
| **✎ Edit** | Change name, URL, keys | After setup, if credentials change |
| **🧪 Test** | Verify connection & balance | Monthly, or after credential update |
| **🔄 Refresh** | Update balance from API | After adding funds to provider account |
| **⬇️ Sync** | Import services from provider | After first setup, then weekly/monthly |
| **🗑️ Delete** | Remove provider | When no longer needed |

### 4. Import Services from Provider
**Click:** "⬇️ Sync" on any provider

**What happens:**
1. Fetches all services from provider API
2. Maps to your local database
3. Shows "✓ Synced 25 services" message
4. Updates "Last Sync" date

**After sync:**
- Services available in "New Order" page
- Users can order these services
- Prices automatically updated

### 5. Test Complete Flow

**Test Scenario 1: Basic CRUD**
```
1. Click "+ Add New Provider"
2. Enter dummy data
3. Click "🧪 Test Connection" (will fail - that's ok)
4. Click "✓ Create" anyway
5. See provider in table
6. Click "✎ Edit" - change name
7. Click "🗑️ Delete" - confirm
8. Provider removed from table
```

**Test Scenario 2: Real Provider**
```
1. Get real API key from your SMM provider
2. Click "+ Add New Provider"
3. Enter: Name, API URL, API Key
4. Click "🧪 Test Connection"
5. Wait 3-5 seconds for result
6. Should see: "✓ Connection successful. Balance: $123.45"
7. Click "✓ Create"
8. Click "⬇️ Sync" on new provider
9. Services appear in New Order page
```

### 6. Test Error Handling

**Timeout Test:**
```
1. Enter invalid API URL (e.g., https://fake-api-that-doesnt-exist.com)
2. Click "🧪 Test Connection"
3. Wait 8+ seconds
4. Should see: "✗ Test failed: Connection timeout"
5. This confirms timeout protection works ✓
```

**Validation Test:**
```
1. Try to create provider without filling Name
2. See error: "Please fill in all required fields"
3. This confirms form validation works ✓
```

---

## 📊 Expected Table Display

After adding a provider, your table should show:

```
┌─────────────┬─────────────────────┬──────────┬────────┬──────────────┬─────────────────────┐
│ Name        │ API URL             │ Balance  │ Status │ Last Sync    │ Actions             │
├─────────────┼─────────────────────┼──────────┼────────┼──────────────┼─────────────────────┤
│ SMM King    │ https://api.smmk... │ $500.00  │ Active │ 12/08/2024   │ ✎ 🧪 🔄 ⬇️ 🗑️     │
├─────────────┼─────────────────────┼──────────┼────────┼──────────────┼─────────────────────┤
│ Test Prov   │ https://api.test... │ $0.00    │ Error  │ Never        │ ✎ 🧪 🔄 ⬇️ 🗑️     │
└─────────────┴─────────────────────┴──────────┴────────┴──────────────┴─────────────────────┘
```

---

## 🔍 Browser Console Debugging

**Open DevTools:** Press `F12` in browser

**Check for:**
1. **Network Tab:** Requests to `/api/admin/test-provider` and `/api/admin/sync-provider-services`
2. **Console Tab:** No red errors
3. **Application Tab:** LocalStorage shows auth token

**Expected Logs:**
```
✓ HMR update fired when you edit code
✓ Fetch requests show in Network tab
✓ Provider data logged in console.log
✗ No "fetch error" or "timeout" errors
```

---

## 🛠️ Troubleshooting Quick Fixes

### Issue: "Connection failed" error
**Solution:**
1. Check API URL format: Must start with `https://`
2. Verify API Key from provider dashboard (copy-paste carefully)
3. Check if provider has IP whitelist (add your server IP)
4. Try test manually in browser: `https://yourprovider.com?action=balance&key=yourkey`

### Issue: Modal form fields not visible
**Solution:**
- This is already fixed! Fields have `bg-black/20 text-white` styling
- If still having issues, check browser zoom (try Ctrl+0 to reset)

### Issue: Sync button doesn't do anything
**Solution:**
1. Check Network tab (DevTools → Network → XHR)
2. Look for `/api/admin/sync-provider-services` request
3. Check response: Should have `success: true` or error message
4. Check server logs for error details

### Issue: Buttons are disabled/grayed out
**Solution:**
- This is normal during operations
- Wait for operation to complete (3-15 seconds)
- Check console for error messages
- Try again if timeout occurs

---

## 📝 Notes

### What's Working:
- ✅ Add/Edit/Delete providers
- ✅ Test API connections
- ✅ 8-second timeout on tests
- ✅ Real-time error messages
- ✅ Modal form styling
- ✅ Database integration

### What Requires Backend Setup:
- Backend API endpoints exist but may need configuration for your specific providers
- `/api/admin/test-provider` - Works with standard SMM panel APIs
- `/api/admin/sync-provider-services` - Works with standard SMM panel APIs
- If your provider uses different format, update mapping in endpoint files

### Customization:
If provider uses different API format:
1. Edit `/pages/api/admin/test-provider.ts` (lines for balance parsing)
2. Edit `/pages/api/admin/sync-provider-services.ts` (lines for service mapping)
3. Adjust `action` parameter if provider uses different query names

---

## 🎯 Next Steps After Setup

1. **Add all your providers** - Test each one
2. **Sync services** - Make them available to users
3. **Check balances** - Weekly monitoring
4. **Monitor orders** - See OrderManagement page
5. **Track revenue** - Check Dashboard stats

---

## 📞 Support References

- **API Documentation:** See PROVIDER_MANAGEMENT.md
- **Implementation Details:** See PROVIDER_IMPLEMENTATION.md
- **Code:** `/pages/admin/ProviderManagement.tsx`
- **Backend:** `/pages/api/admin/test-provider.ts` and `/pages/api/admin/sync-provider-services.ts`

---

**Created:** December 8, 2025  
**Dev Server:** http://localhost:3000/  
**Status:** ✅ Ready for testing
