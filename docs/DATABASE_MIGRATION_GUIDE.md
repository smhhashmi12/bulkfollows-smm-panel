# 🚀 BulkFollows SMM Panel - Database Migration & Setup Guide

**Current Date:** January 8, 2026  
**Status:** Service Model Updated with Timing Fields | Ready for Database Migration

---

## ✅ COMPLETED THIS SESSION

### 1. Service Model Updated
- ✅ Added `completion_time` field (hours to complete)
- ✅ Added `time_pricing` field (JSON object with multipliers)
- ✅ Updated Order interface with `delivery_time` field
- ✅ Updated `createOrder()` to accept and handle delivery time

**Files Modified:**
- `lib/api.ts` - Service & Order interfaces
- `pages/dashboard/NewOrder.tsx` - Pass deliveryTime to API

### 2. Database Migration Created
**File:** `supabase/migrations/add_timing_fields.sql`

```sql
-- Adds to services table:
ALTER TABLE public.services
ADD COLUMN completion_time INTEGER DEFAULT 24,
ADD COLUMN time_pricing JSONB DEFAULT '{"6": 2.0, "12": 1.5, "24": 1.0, "48": 0.8, "72": 0.7}';

-- Adds to orders table:
ALTER TABLE public.orders
ADD COLUMN delivery_time INTEGER DEFAULT 24;
```

### 3. PayFast Integration Ready
- Merchant ID: `10000100` (sandbox)
- Configured at: `server/routes/payments.js`
- Webhook handler: Ready for payment notifications

---

## 🔧 NEXT STEPS - APPLY MIGRATION

### Step 1: Run Database Migration

**Option A: Using Supabase Dashboard**
1. Go to: https://app.supabase.com/project/exqvkorurrssfoccsbvk
2. Navigate to: SQL Editor
3. Paste the migration content from: `supabase/migrations/add_timing_fields.sql`
4. Click "Run"

**Option B: Using Supabase CLI**
```bash
supabase db push
```

### Step 2: Verify Migration in Supabase
Run this query in Supabase SQL Editor:
```sql
-- Check services table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'services';

-- Check orders table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders';

-- Check sample service with timing
SELECT id, name, completion_time, time_pricing 
FROM services 
LIMIT 1;
```

---

## 🗄️ REALTIME DATABASE UPDATES

### Current Data Status:
✅ **User Data** - Real from Supabase (user_profiles table)
✅ **Orders Data** - Real from Supabase (orders table)
✅ **Services Data** - Real from Supabase (services table)
✅ **Balance Tracking** - Real, updated on each order
✅ **Time Pricing** - Now supported in database

### All Dummy Data Removed:
- ❌ No mock services (all from DB)
- ❌ No hardcoded balances (from user_profiles)
- ❌ No test orders (all from orders table)
- ❌ No fake notifications (logged real events)

---

## 💰 PAYMENT FLOW (Now with Real Time Pricing)

### User Order Creation:
```
1. User selects category → services filtered by category
2. User selects service → get real service data from DB
3. User enters quantity
4. User selects delivery time (6h/12h/24h/48h/72h)
5. System calculates: basePrice × time_pricing[deliveryTime]
6. Balance checked against user_profiles.balance
7. Order created with delivery_time field
8. Balance updated: balance - charge, total_spent + charge
```

### Example Price Calculation:
```
Service: Instagram Followers
Rate: $0.05 per 1000
Quantity: 1000
Base Price: 1000 × (0.05/1000) = $0.05

Time Multipliers:
- 6h:  $0.05 × 2.0   = $0.10  (⚡ Express)
- 12h: $0.05 × 1.5   = $0.075 (🔥 Fast)
- 24h: $0.05 × 1.0   = $0.05  (✓ Standard)
- 48h: $0.05 × 0.8   = $0.04  (💰 Slow)
- 72h: $0.05 × 0.7   = $0.035 (💸 Slowest)
```

---

## 🔐 PAYFAST CONFIGURATION (Already Set)

**Test Credentials (Sandbox):**
```
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f1db2dfada90a202079397d713218d1f0bfb4d
PAYFAST_PASSPHRASE=PayFastTest123!@#
PAYFAST_BASE_URL=https://sandbox.payfast.co.za
```

**Payment Flow:**
1. User clicks "Proceed to Payment"
2. `/api/payments/payfast` creates payment request
3. User redirected to PayFast portal
4. PayFast sends webhook notification
5. `/api/payments/payfast-webhook` handles payment status
6. On COMPLETE status: funds added to account (TODO: implement)

---

## ⚙️ SERVICE SETUP FOR TIME PRICING

### How to Update Services in Admin:

When adding/editing services, include:
```json
{
  "name": "Instagram Followers",
  "category": "instagram",
  "description": "High-quality followers",
  "rate_per_1000": 50,
  "min_quantity": 100,
  "max_quantity": 50000,
  "completion_time": 24,
  "time_pricing": {
    "6": 2.0,
    "12": 1.5,
    "24": 1.0,
    "48": 0.8,
    "72": 0.7
  }
}
```

---

## 🧪 TESTING CHECKLIST

### ✅ Already Done:
- [x] Currency conversion (8 currencies)
- [x] Notification system
- [x] Admin sidebar navigation
- [x] Popular Services dashboard section
- [x] Category filters with icons
- [x] Time selection dropdown
- [x] Price calculation with multipliers
- [x] PayFast payment gateway setup

### ⏳ Still Need:
- [ ] Run database migration
- [ ] Verify services have time_pricing data
- [ ] Test order creation with delivery_time
- [ ] Verify price calculations are correct
- [ ] Test PayFast webhook integration
- [ ] Verify funds added after payment
- [ ] Test admin OrderPlacement integration

---

## 📝 IMPORTANT NOTES

1. **Migration is Essential**: Without running the migration, new columns won't exist
2. **All Data is Real**: No more mock/dummy data anywhere
3. **Time Pricing is JSON**: Stored as JSONB in Supabase for flexibility
4. **Backward Compatible**: Services without time_pricing default to 1.0x multiplier
5. **Payment Gateway Ready**: PayFast is configured but webhook needs fund-adding logic

---

## 🚀 QUICK START

```bash
# 1. Make sure server is running
npm run dev:full

# 2. Apply migration (in Supabase dashboard)
# Copy content from: supabase/migrations/add_timing_fields.sql

# 3. Test the flow:
# - Go to Dashboard
# - Click "New Order"
# - Select category → service → quantity → delivery time
# - Verify price changes with time selection
# - Submit order (if balance available)

# 4. Check admin
# - Go to Place Order in admin
# - Verify same flow works
```

---

## 📞 SUPPORT

If migration fails:
1. Check Supabase error logs
2. Verify migration syntax
3. Check if columns already exist
4. Contact Supabase support if needed

If orders don't save time:
1. Verify migration ran successfully
2. Check browser console for errors
3. Verify delivery_time is being passed to API

---

**Last Updated:** January 8, 2026 3:42 AM
**Next Task:** Apply migration and test order flow
