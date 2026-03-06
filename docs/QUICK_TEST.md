# ⚡ QUICK TEST CHECKLIST

## Issue
Service names not showing on New Order page (showing "Service #4684" instead of "Followers")

## Root Cause
Sync endpoint using anon key → RLS policy blocks INSERT → names never saved → NULL in DB

## Fix Applied
Changed `supabase` (anon key) → `supabaseAdmin` (admin key) in `pages/api/admin/sync-provider-services.ts`

---

## ✅ TEST NOW

### 1️⃣ Clean Old Data (Supabase SQL Editor)
```sql
DELETE FROM provider_services 
WHERE provider_id = 'c9767f6c-4066-4b8e-9e7c-2040035bf122';
```

### 2️⃣ Run Sync
**Admin Dashboard → Provider Management → Click "Sync Services"**

### 3️⃣ Check Logs (Console where npm runs)
Look for: `[Sync] Services inserted/updated: { count: 25 }`

### 4️⃣ Verify Database
```sql
SELECT ps.provider_service_id, s.name
FROM provider_services ps
LEFT JOIN services s ON ps.service_id = s.id
WHERE ps.provider_id = 'c9767f6c-4066-4b8e-9e7c-2040035bf122'
LIMIT 5;
```
**Expected:** Service names like "Followers", "Comments" (NOT NULL)

### 5️⃣ Test Frontend
- Go to `http://localhost:3000/dashboard`
- Click **New Order**
- Select platform
- Check if services show names like "Followers" (not "Service #1")

---

## ❌ If Still Not Working

1. Check admin key is set: `echo %SUPABASE_SERVICE_ROLE_KEY%`
2. Check sync logs for errors: `[Sync] Insert services error: ...`
3. Verify DaoSMM API is accessible
4. Make sure you're on the latest code (test-sync.js may help)

---

## 🎯 Expected Result
**New Order Page shows:**
```
✅ Followers (not "Service #1")
✅ Comments (not "Service #2")  
✅ Category showing correctly
✅ Rates showing correctly
```
