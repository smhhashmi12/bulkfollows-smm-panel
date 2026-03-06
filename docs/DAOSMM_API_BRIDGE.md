# 🔗 DaoSMM API Bridge - Server-Side Implementation

## ✅ Architecture Overview

```
React Frontend
    ↓
    └─→ /api/provider/* (Our Backend)
            ↓
            └─→ DaoSMM API (Secure, Key Hidden)
                ↓
            Returns Response
            ↓
        React Frontend
```

**Key Points:**
- ✅ React NEVER calls DaoSMM directly
- ✅ Backend holds the API key (secure)
- ✅ Backend can validate, log, and monitor requests
- ✅ Easy to add rate limiting, caching, etc.

---

## 🚀 New Backend Endpoints

All endpoints are under `/api/provider/`

### 1️⃣ GET /api/provider/services
Fetch available services from DaoSMM

**Query Parameters:**
```
provider_id: UUID of the provider
```

**Example Request:**
```bash
GET /api/provider/services?provider_id=c9767f6c-4066-4b8e-9e7c-2040035bf122
```

**Response:**
```json
{
  "ok": true,
  "services": [
    {
      "service": 1,
      "name": "Followers",
      "category": "First Category",
      "rate": "0.90",
      "min": "50",
      "max": "10000",
      "type": "Default",
      "refill": true,
      "cancel": true
    },
    {
      "service": 2,
      "name": "Comments",
      "category": "Second Category",
      "rate": "8",
      "min": "10",
      "max": "1500",
      "type": "Custom Comments",
      "refill": false,
      "cancel": true
    }
  ],
  "provider": "DaoSMM"
}
```

---

### 2️⃣ POST /api/provider/add-order
Create new order on DaoSMM

**Body:**
```json
{
  "provider_id": "c9767f6c-4066-4b8e-9e7c-2040035bf122",
  "service": 1,
  "link": "https://instagram.com/username",
  "quantity": 1000,
  "runs": 5,           // optional
  "interval": 60       // optional (minutes)
}
```

**Response:**
```json
{
  "ok": true,
  "order": 23501,
  "provider": "DaoSMM"
}
```

---

### 3️⃣ GET /api/provider/order-status
Get status of order(s)

**Query Parameters:**
```
provider_id: UUID
orders: Single ID or comma-separated IDs (e.g., "123" or "123,456,789")
```

**Example Request:**
```bash
# Single order
GET /api/provider/order-status?provider_id=UUID&orders=123

# Multiple orders
GET /api/provider/order-status?provider_id=UUID&orders=123,456,789
```

**Response (Single):**
```json
{
  "ok": true,
  "status": {
    "charge": "0.27819",
    "start_count": "3572",
    "status": "Partial",
    "remains": "157",
    "currency": "USD"
  },
  "provider": "DaoSMM"
}
```

**Response (Multiple):**
```json
{
  "ok": true,
  "status": {
    "1": {
      "charge": "0.27819",
      "start_count": "3572",
      "status": "Partial",
      "remains": "157",
      "currency": "USD"
    },
    "10": {
      "error": "Incorrect order ID"
    },
    "100": {
      "charge": "1.44219",
      "start_count": "234",
      "status": "In progress",
      "remains": "10",
      "currency": "USD"
    }
  },
  "provider": "DaoSMM"
}
```

---

### 4️⃣ GET /api/provider/balance
Get provider account balance

**Query Parameters:**
```
provider_id: UUID
```

**Example Request:**
```bash
GET /api/provider/balance?provider_id=c9767f6c-4066-4b8e-9e7c-2040035bf122
```

**Response:**
```json
{
  "ok": true,
  "balance": "100.84292",
  "currency": "USD",
  "provider": "DaoSMM"
}
```

---

### 5️⃣ POST /api/provider/refill
Create refill for order(s)

**Body:**
```json
{
  "provider_id": "c9767f6c-4066-4b8e-9e7c-2040035bf122",
  "orders": "123"              // Single order
}
```

Or for multiple orders:
```json
{
  "provider_id": "c9767f6c-4066-4b8e-9e7c-2040035bf122",
  "orders": "123,456,789"      // Multiple orders
}
```

**Response (Single):**
```json
{
  "ok": true,
  "refill": "1",
  "provider": "DaoSMM"
}
```

**Response (Multiple):**
```json
{
  "ok": true,
  "refill": [
    {
      "order": 1,
      "refill": 1
    },
    {
      "order": 2,
      "refill": 2
    },
    {
      "order": 3,
      "refill": {
        "error": "Incorrect order ID"
      }
    }
  ],
  "provider": "DaoSMM"
}
```

---

### 6️⃣ POST /api/provider/cancel
Cancel order(s)

**Body:**
```json
{
  "provider_id": "c9767f6c-4066-4b8e-9e7c-2040035bf122",
  "orders": "123"              // Single or comma-separated
}
```

**Response:**
```json
{
  "ok": true,
  "cancel": [
    {
      "order": 9,
      "cancel": {
        "error": "Incorrect order ID"
      }
    },
    {
      "order": 2,
      "cancel": 1
    }
  ],
  "provider": "DaoSMM"
}
```

---

## 📱 React Client Usage

**File:** `lib/providerAPI.ts`

All methods are available in the `providerAPI` object:

### Example 1: Get Services
```typescript
import { providerAPI } from '@/lib/providerAPI';

const services = await providerAPI.getServices('c9767f6c-4066-4b8e-9e7c-2040035bf122');
console.log(services);
// [{ service: 1, name: 'Followers', ... }, ...]
```

### Example 2: Create Order
```typescript
const result = await providerAPI.addOrder('provider-uuid', {
  service: 1,
  link: 'https://instagram.com/username',
  quantity: 1000,
  runs: 5,
  interval: 60,
});

console.log('Order created:', result.order); // 23501
```

### Example 3: Check Order Status
```typescript
// Single order
const status = await providerAPI.getOrderStatus('provider-uuid', 123);
console.log(status);
// { charge: '0.27819', status: 'Partial', ... }

// Multiple orders
const statuses = await providerAPI.getOrderStatus('provider-uuid', [123, 456, 789]);
console.log(statuses);
// { 123: {...}, 456: {...}, 789: {...} }
```

### Example 4: Get Balance
```typescript
const { balance, currency } = await providerAPI.getBalance('provider-uuid');
console.log(`Balance: ${balance} ${currency}`); // Balance: 100.84 USD
```

### Example 5: Create Refill
```typescript
const result = await providerAPI.createRefill('provider-uuid', 123);
console.log('Refill created:', result.refill);

// Or multiple
const result = await providerAPI.createRefill('provider-uuid', [123, 456]);
```

### Example 6: Cancel Order
```typescript
const result = await providerAPI.cancelOrder('provider-uuid', 123);
console.log('Order cancelled:', result.cancel);

// Or multiple
const result = await providerAPI.cancelOrder('provider-uuid', [123, 456]);
```

---

## 🔒 Security Features

1. **API Key Protection:**
   - ✅ API key stored in `providers` table
   - ✅ Never exposed to frontend
   - ✅ Only backend can access it

2. **Request Validation:**
   - ✅ All parameters validated
   - ✅ Missing fields return 400 error
   - ✅ Invalid provider returns 404 error

3. **Error Handling:**
   - ✅ Sensitive info not leaked to frontend
   - ✅ Meaningful error messages for debugging
   - ✅ All errors logged on backend

4. **Logging:**
   - ✅ All API calls logged with `[DaoSMM Bridge]` prefix
   - ✅ API key hidden in logs (`***HIDDEN***`)
   - ✅ Response status tracked
   - ✅ Errors captured and logged

---

## 📋 Implementation Checklist

- [x] Backend provider router created: `server/routes/provider.js`
- [x] Routes registered in `server/index.js`
- [x] Frontend API client created: `lib/providerAPI.ts`
- [x] All 6 DaoSMM endpoints implemented
- [x] Error handling and validation
- [x] Logging and debugging
- [x] TypeScript types in client

---

## 🧪 Testing

### Backend Test (Terminal)
```bash
# Get services
curl "http://localhost:4000/api/provider/services?provider_id=c9767f6c-4066-4b8e-9e7c-2040035bf122"

# Add order
curl -X POST http://localhost:4000/api/provider/add-order \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": "c9767f6c-4066-4b8e-9e7c-2040035bf122",
    "service": 1,
    "link": "https://instagram.com/test",
    "quantity": 100
  }'
```

### Frontend Test (Browser Console)
```javascript
import { providerAPI } from '/lib/providerAPI.ts';

// Test get services
const services = await providerAPI.getServices('c9767f6c-4066-4b8e-9e7c-2040035bf122');
console.log(services);
```

---

## 🚀 Migration Guide

If you were calling DaoSMM API directly from React before:

**BEFORE (❌ WRONG):**
```typescript
// React directly calling DaoSMM - NEVER DO THIS
const response = await fetch('https://daosmm.com/api/v2', {
  method: 'POST',
  body: JSON.stringify({
    key: API_KEY,  // ❌ EXPOSED!
    action: 'services',
  }),
});
```

**AFTER (✅ CORRECT):**
```typescript
// React calling backend - ALWAYS DO THIS
import { providerAPI } from '@/lib/providerAPI';

const services = await providerAPI.getServices(providerId);
```

---

## 📁 Files Modified/Created

| File | Purpose |
|------|---------|
| `server/routes/provider.js` | Backend API bridge endpoints |
| `server/index.js` | Register provider routes |
| `lib/providerAPI.ts` | React client for backend API |

---

## ✅ Status

**Implementation:** ✅ Complete  
**Security:** ✅ API key protected  
**Documentation:** ✅ Full API docs provided  
**Client Library:** ✅ TypeScript client ready  

**Ready to use!**

---

**Last Updated:** February 5, 2026  
**Provider:** DaoSMM  
**API Version:** v2
