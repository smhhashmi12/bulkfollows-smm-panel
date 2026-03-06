# 🐛 Service Name Display Fix - Complete Guide

## ❌ The Problem
Provider services showing as **"Service #4684"** instead of **"Instagram Followers | Real | Fast"**

## 🔍 Root Cause
The sync endpoint was incorrectly trying to:
1. Save `provider_id` directly in services table (which doesn't have this column)
2. Not properly creating the junction mapping in `provider_services` table

## ✅ The Solution

### Fixed Logic Flow

**BEFORE (❌ Wrong):**
```
Provider API Response
├─ name: "Instagram Followers | Real | Fast"
├─ rate: "0.10"
├─ service: "4684"
│
└─> Insert into `services` table with provider_id ❌
    (services table doesn't have provider_id column!)
```

**AFTER (✅ Correct):**
```
Provider API Response
├─ name: "Instagram Followers | Real | Fast"
├─ rate: "0.10"
├─ service: "4684"
│
├─> Insert into `services` table
│   ├─ name: "Instagram Followers | Real | Fast"
│   ├─ category: "Instagram"
│   └─ rate_per_1000: 0.10
│
└─> Insert into `provider_services` junction table
    ├─ provider_id: "UUID"
    ├─ service_id: "UUID" (from services table)
    ├─ provider_service_id: "4684" (external API ID)
    └─ our_rate: 0.15 (50% markup on provider_rate)
```

## 📝 Code Changes Made

### File: `pages/api/admin/sync-provider-services.ts`

**Change 1:** Remove `provider_id` from services insert
```typescript
// BEFORE ❌
const localServices = services.map((svc: any) => ({
  name: svc.name || svc.service || '',
  category: svc.category || svc.service_type || 'Other',
  description: svc.description || null,
  rate_per_1000: parseFloat(svc.rate || svc.price || 0),
  min_quantity: parseInt(svc.min || svc.min_quantity || 10),
  max_quantity: parseInt(svc.max || svc.max_quantity || 10000),
  status: 'active' as const,
  provider_id: provider_id,  // ❌ WRONG - services table doesn't have this
}));

// AFTER ✅
const localServices = services.map((svc: any) => ({
  name: svc.name || svc.service || '',
  category: svc.category || svc.service_type || 'Other',
  description: svc.description || null,
  rate_per_1000: parseFloat(svc.rate || svc.price || 0),
  min_quantity: parseInt(svc.min || svc.min_quantity || 10),
  max_quantity: parseInt(svc.max || svc.max_quantity || 10000),
  status: 'active' as const,
  // ✅ CORRECT - no provider_id here
}));
```

**Change 2:** Fix upsert conflict clause
```typescript
// BEFORE ❌
.upsert(localServices, { onConflict: 'name,provider_id' })
// ❌ provider_id doesn't exist in services table!

// AFTER ✅
.upsert(localServices, { onConflict: 'name' })
// ✅ CORRECT - services are unique by name
```

**Change 3:** Create proper provider_services mapping
```typescript
// NEW ✅ - Added provider_services junction table mapping
const providerServiceMappings = services.map((svc: any, idx: number) => {
  const service = insertedServices?.[idx];
  return {
    provider_id: provider_id,
    service_id: service?.id,                         // Reference to services table
    provider_service_id: svc.service || svc.id || '', // External provider's ID (4684)
    provider_rate: parseFloat(svc.rate || svc.price || 0),
    our_rate: parseFloat(svc.rate || svc.price || 0) * 1.5, // 50% markup
    min_quantity: parseInt(svc.min || svc.min_quantity || 10),
    max_quantity: parseInt(svc.max || svc.max_quantity || 10000),
    status: 'active' as const,
  };
});

const { error: mappingError } = await supabase
  .from('provider_services')
  .upsert(providerServiceMappings, { onConflict: 'provider_id,provider_service_id' });
```

## 🚀 How to Apply the Fix

### Step 1: Database Cleanup (Optional but Recommended)
Clear old incorrect mappings:

```sql
-- Check how many provider_services are linked
SELECT COUNT(*) FROM provider_services;

-- Check services to verify names are there
SELECT id, name, category FROM services LIMIT 10;

-- If needed, delete old incorrect mappings:
DELETE FROM provider_services 
WHERE provider_id = 'YOUR_PROVIDER_UUID';
```

### Step 2: Re-Sync Services

1. Go to **Admin Dashboard** → **Provider Management**
2. Find your provider (e.g., DaoSMM)
3. Click **Sync Services** button
4. Wait for sync to complete

The logs will now show:
```
[Sync] Provider services synced: {
  "provider_id": "c9767f6c-4066-4b8e-9e7c-2040035bf122",
  "services_count": 125,
  "mappings_count": 125,
  "sample_services": [
    { "name": "Instagram Followers | Real | Fast", "id": "4684", "rate": 0.10 },
    { "name": "Instagram Likes | Real | Fast", "id": "4685", "rate": 0.05 }
  ]
}
```

### Step 3: Verify in New Order Form

1. Go to **Dashboard** → **New Order**
2. Select **Instagram** from platforms
3. Check service names - should show:
   - ✅ "Instagram Followers | Real | Fast" (NOT "Service #4684")
   - ✅ Category: Instagram
   - ✅ Rate: ৳ 15 or equivalent in selected currency

## 🧪 Debug Checklist

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Services stored correctly | `SELECT id, name, category FROM services LIMIT 5;` | Names visible (not empty) |
| Provider services linked | `SELECT * FROM provider_services LIMIT 5;` | service_id populated |
| Service name in response | Check browser console in New Order | "Instagram Followers..." appears |
| No "Service #" fallback | Check if name field is used | Should NOT show "Service #4684" |

## 📊 Data Structure After Fix

```
┌─────────────────┐
│   providers     │
│  (DaoSMM, etc)  │
└────────┬────────┘
         │
         │ provider_id (FK)
         │
         ▼
┌──────────────────────┐
│ provider_services    │
│ (junction table)     │
└────────┬─────────────┘
         │
         │ service_id (FK)
         │
         ▼
┌──────────────────────┐
│     services         │
│ name: "Instagram..." │
│ category: "Instagram"│
│ rate_per_1000: 100   │
└──────────────────────┘
```

## 🎯 Expected Behavior After Fix

### Before Sync:
- New Order form shows **no services** or **"Unknown Service"**

### After Sync:
- Services display with **actual names**
- Rates and quantities **populate correctly**
- Category **matches provider's service type**
- Multiple services per provider **all display properly**

## 💡 Key Points

1. **Services table** stores the actual service details (name, category, rates)
2. **Provider_services table** links providers to services and tracks custom pricing
3. **Service names come from provider API** not from database ID
4. **Markup is applied** at provider_services level (50% default)

## 🔧 If Still Not Working

### Check 1: Service Names in Database
```sql
SELECT name FROM services 
WHERE name LIKE '%Instagram%' 
LIMIT 5;
```
If empty → sync didn't save names correctly. Check provider API response.

### Check 2: Provider Services Linked
```sql
SELECT ps.id, ps.provider_service_id, s.name 
FROM provider_services ps
LEFT JOIN services s ON ps.service_id = s.id
LIMIT 5;
```
If `s.name` is NULL → service_id not matching. May need to re-sync.

### Check 3: Frontend API Call
Open **Browser Console** (F12) and check:
```javascript
// This should return service names, not IDs
fetch('/api/integrations/service-names')
  .then(r => r.json())
  .then(d => console.log(d.services))
```

## 📞 Support

If services still show as "Service #XXXX":
1. Check server logs for `[Sync]` messages
2. Verify provider API is accessible
3. Ensure `name` field exists in provider API response
4. Check if service names are empty in database

---

**Last Updated:** January 30, 2026  
**Status:** ✅ FIXED - Ready for testing
